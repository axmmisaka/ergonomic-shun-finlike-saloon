import {
  RATINGS,
  RATING_FIELDS,
  type CandidateScorecards,
  type CandidateSummary,
  type Rating,
  type RatingField,
  type ScorecardView,
  type User,
} from "@/lib/types";
import type { Candidate, CsvRepository, Scorecard } from "./csv-repository";
import { HttpError } from "./http";

// Business rules and authorization. Route Handlers stay thin; every rule about
// who may see or do what is in this file.
//
// Access model for a candidate, relative to the current user ("viewer"):
//   - hiring manager: candidates.hiring_manager === viewer.name
//   - assignee:       a scorecards.csv row exists for (viewer, candidate)
// A viewer may be both, and then both sets of permissions apply.
// A viewer who is neither gets 404, so the API does not reveal that the candidate exists.

interface Access {
  candidate: Candidate;
  isHiringManager: boolean;
  ownScorecard: Scorecard | undefined;
}

// Authored by LLM, model unknown
function accessFor(repo: CsvRepository, viewer: User, candidate: Candidate): Access {
  return {
    candidate,
    isHiringManager: candidate.hiringManager === viewer.name,
    ownScorecard: repo.getScorecard(viewer.name, candidate.name),
  };
}

// Authored by LLM, model unknown
function requireAccess(repo: CsvRepository, viewer: User, candidateName: string): Access {
  const candidate = repo.getCandidate(candidateName);
  const access = candidate && accessFor(repo, viewer, candidate);
  if (!access || (!access.isHiringManager && !access.ownScorecard)) {
    throw new HttpError(404, "Candidate not found");
  }
  return access;
}

// Edited by LLM, model GPT-6
function toSummary(repo: CsvRepository, { candidate, isHiringManager, ownScorecard }: Access): CandidateSummary {
  return {
    name: candidate.name,
    role: candidate.role,
    hiringManager: candidate.hiringManager,
    isHiringManager,
    isAssigned: Boolean(ownScorecard),
    hasSubmitted: Boolean(ownScorecard?.submitted),
    // Avoid exposing the full roster to assignees. Assignment feedback can still
    // reveal membership under the agreed policy; this is not strong anonymity.
    assignees: isHiringManager
      ? repo.listScorecards(candidate.name).map((s) => ({ name: s.userName, submitted: Boolean(s.submitted) }))
      : null,
  };
}

// Authored by LLM, model unknown
export function listVisibleCandidates(repo: CsvRepository, viewer: User): CandidateSummary[] {
  return repo
    .listCandidates()
    .map((candidate) => accessFor(repo, viewer, candidate))
    .filter((access) => access.isHiringManager || access.ownScorecard)
    .map((access) => toSummary(repo, access));
}

// Authored by LLM, model unknown
export function getCandidate(repo: CsvRepository, viewer: User, candidateName: string): CandidateSummary {
  return toSummary(repo, requireAccess(repo, viewer, candidateName));
}

// Edited by LLM, model GPT-6
export function createCandidate(
  repo: CsvRepository,
  viewer: User,
  body: Record<string, unknown>,
): CandidateSummary {
  const name = requiredString(body, "name");
  // URL parsers normalize these entire path segments, making name-keyed links unusable.
  if (name === "." || name === "..") throw new HttpError(400, 'Candidate name cannot be "." or ".."');
  const role = requiredString(body, "role");
  const taken = repo.listCandidates().some((c) => c.name.toLowerCase() === name.toLowerCase());
  if (taken) throw new HttpError(409, `A candidate named "${name}" already exists`);

  repo.addCandidate({ name, role, hiringManager: viewer.name });
  return getCandidate(repo, viewer, name);
}

// Edited by LLM, model GPT-6
/** Anyone who can access the candidate may assign (see DECISIONS.md, A2). */
export function assignUser(
  repo: CsvRepository,
  viewer: User,
  candidateName: string,
  body: Record<string, unknown>,
): CandidateSummary {
  requireAccess(repo, viewer, candidateName);
  const userName = requiredString(body, "userName");
  if (userName === viewer.name) throw new HttpError(400, "You can only assign other users");
  if (!repo.getUser(userName)) throw new HttpError(400, `Unknown user "${userName}"`);
  if (repo.getScorecard(userName, candidateName)) {
    throw new HttpError(409, `${userName} is already assigned to ${candidateName}`);
  }

  repo.addAssignment(userName, candidateName);
  return getCandidate(repo, viewer, candidateName);
}

// Authored by LLM, model unknown
export function getScorecards(repo: CsvRepository, viewer: User, candidateName: string): CandidateScorecards {
  const access = requireAccess(repo, viewer, candidateName);
  const hasSubmitted = Boolean(access.ownScorecard?.submitted);
  if (!access.isHiringManager && !hasSubmitted) {
    throw new HttpError(403, "Submit your own scorecard before reading the others");
  }

  const scorecards = repo
    .listScorecards(candidateName)
    .filter((s) => s.submitted)
    .map((s) => toScorecardView(repo, s, viewer, access.isHiringManager));
  return { candidate: toSummary(repo, access), scorecards };
}

// Authored by LLM, model unknown
/** Mask structured author fields on the server; free-text notes can still identify people. */
function toScorecardView(repo: CsvRepository, s: Scorecard, viewer: User, showAuthor: boolean): ScorecardView {
  const isOwn = s.userName === viewer.name;
  const revealed = showAuthor || isOwn;
  return {
    author: revealed ? s.userName : null,
    authorRole: revealed ? (repo.getUser(s.userName)?.role ?? null) : null,
    isOwn,
    submitted: s.submitted ?? "",
    technicalSkill: s.technicalSkill as Rating,
    communication: s.communication as Rating,
    collaboration: s.collaboration as Rating,
    roleFit: s.roleFit as Rating,
    notes: s.notes,
  };
}

// Authored by LLM, model unknown
export function submitScorecard(
  repo: CsvRepository,
  viewer: User,
  candidateName: string,
  body: Record<string, unknown>,
): CandidateScorecards {
  const access = requireAccess(repo, viewer, candidateName);
  if (!access.ownScorecard) throw new HttpError(403, "You are not assigned to this candidate");
  if (access.ownScorecard.submitted) throw new HttpError(409, "You have already submitted a scorecard");

  const ratings = {} as Record<RatingField, Rating>;
  for (const field of Object.keys(RATING_FIELDS) as RatingField[]) {
    const value = body[field];
    if (!RATINGS.includes(value as Rating)) {
      throw new HttpError(400, `${RATING_FIELDS[field]} must be one of: ${RATINGS.join(", ")}`);
    }
    ratings[field] = value as Rating;
  }
  const notes = body.notes ?? "";
  if (typeof notes !== "string") throw new HttpError(400, "Notes must be a string");

  repo.submitScorecard(viewer.name, candidateName, {
    ...ratings,
    notes: notes.trim(),
    submitted: localDate(),
  });
  return getScorecards(repo, viewer, candidateName);
}

// Authored by LLM, model unknown
function requiredString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(400, `"${key}" is required`);
  }
  return value.trim();
}

// Authored by LLM, model unknown
/** Today's date as YYYY-MM-DD in the server's time zone (the format used in scorecards.csv). */
function localDate(): string {
  return new Date().toLocaleDateString("en-CA");
}
