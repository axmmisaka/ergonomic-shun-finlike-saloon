// Shared contract between the React client and the REST API.
// Server modules may import from here; client code must not import from src/server.

export const RATINGS = ["Developing", "Solid", "Strong", "Exceptional"] as const;
export type Rating = (typeof RATINGS)[number];

/** The four attribute ratings, keyed by API field name, with display labels. */
export const RATING_FIELDS = {
  technicalSkill: "Technical skill",
  communication: "Communication",
  collaboration: "Collaboration",
  roleFit: "Role fit",
} as const;
export type RatingField = keyof typeof RATING_FIELDS;

export interface User {
  name: string;
  role: string;
}

export interface Assignee {
  name: string;
  submitted: boolean;
}

/** A candidate as seen by the current user. */
export interface CandidateSummary {
  name: string;
  role: string;
  hiringManager: string;
  isHiringManager: boolean;
  isAssigned: boolean;
  /** Whether the current user has submitted their own scorecard. */
  hasSubmitted: boolean;
  /** Only returned to the hiring manager; null for everyone else. */
  assignees: Assignee[] | null;
}

export interface ScorecardView {
  /** Null when the author is hidden from the current user. */
  author: string | null;
  authorRole: string | null;
  isOwn: boolean;
  submitted: string; // YYYY-MM-DD
  technicalSkill: Rating;
  communication: Rating;
  collaboration: Rating;
  roleFit: Rating;
  notes: string;
}

export interface CandidateScorecards {
  candidate: CandidateSummary;
  scorecards: ScorecardView[];
}

export interface CreateCandidateRequest {
  name: string;
  role: string;
}

export interface AssignUserRequest {
  userName: string;
}

export type SubmitScorecardRequest = Record<RatingField, Rating> & { notes: string };

export interface ApiError {
  error: string;
}
