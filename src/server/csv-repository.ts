import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import type { User } from "@/lib/types";

// CSV-backed persistence with a process-local, write-through, in-memory cache.
//
// - All CSVs are read once at construction; requests are served from memory.
// - Every mutation serializes the whole affected file, writes it to a unique
//   temp file in the same directory, and atomically renames it over the original.
// - The in-memory state changes only after the write succeeded.
//
// Assumptions (see docs/DECISIONS.md): a single Node.js process owns the files,
// nothing else edits them while the app runs, and the files stay small enough
// that O(N) synchronous rewrites are acceptable.

export interface Candidate {
  name: string;
  role: string;
  hiringManager: string;
}

/** A row of scorecards.csv. `submitted === null` means "assigned, not yet submitted". */
export interface Scorecard {
  userName: string;
  candidateName: string;
  submitted: string | null;
  technicalSkill: string;
  communication: string;
  collaboration: string;
  roleFit: string;
  notes: string;
}

export type ScorecardSubmission = Omit<Scorecard, "userName" | "candidateName" | "submitted"> & {
  submitted: string;
};

const USER_COLUMNS = ["name", "role"];
const CANDIDATE_COLUMNS = ["name", "role", "hiring_manager"];
const SCORECARD_COLUMNS = [
  "user_name",
  "candidate_name",
  "submitted",
  "technical_skill",
  "communication",
  "collaboration",
  "role_fit",
  "notes",
];

type CsvRow = Record<string, string>;

export class CsvRepository {
  private users: Map<string, User>;
  private candidates: Map<string, Candidate>;
  private scorecards: Scorecard[];

  // Authored by LLM, model Claude Opus 5.5
  constructor(private readonly dataDir: string) {
    this.users = new Map(
      this.readCsv("users.csv", USER_COLUMNS).map((r) => [r.name, { name: r.name, role: r.role }]),
    );
    this.candidates = new Map(
      this.readCsv("candidates.csv", CANDIDATE_COLUMNS).map((r) => [
        r.name,
        { name: r.name, role: r.role, hiringManager: r.hiring_manager },
      ]),
    );
    this.scorecards = this.readCsv("scorecards.csv", SCORECARD_COLUMNS).map((r) => ({
      userName: r.user_name,
      candidateName: r.candidate_name,
      submitted: r.submitted || null,
      technicalSkill: r.technical_skill,
      communication: r.communication,
      collaboration: r.collaboration,
      roleFit: r.role_fit,
      notes: r.notes,
    }));
  }

  // Authored by LLM, model Claude Opus 5.5
  listUsers(): User[] {
    return [...this.users.values()];
  }

  // Authored by LLM, model Claude Opus 5.5
  getUser(name: string): User | undefined {
    return this.users.get(name);
  }

  // Authored by LLM, model Claude Opus 5.5
  listCandidates(): Candidate[] {
    return [...this.candidates.values()];
  }

  // Authored by LLM, model Claude Opus 5.5
  getCandidate(name: string): Candidate | undefined {
    return this.candidates.get(name);
  }

  // Authored by LLM, model Claude Opus 5.5
  /** All rows (pending and submitted) for a candidate. */
  listScorecards(candidateName: string): Scorecard[] {
    return this.scorecards.filter((s) => s.candidateName === candidateName);
  }

  // Authored by LLM, model Claude Opus 5.5
  getScorecard(userName: string, candidateName: string): Scorecard | undefined {
    return this.scorecards.find((s) => s.userName === userName && s.candidateName === candidateName);
  }

  // Authored by LLM, model Claude Opus 5.5
  addCandidate(candidate: Candidate): void {
    const next = new Map(this.candidates).set(candidate.name, { ...candidate });
    this.writeCandidates([...next.values()]);
    this.candidates = next;
  }

  // Authored by LLM, model Claude Opus 5.5
  /** An assignment is a scorecard row with no submission date and empty ratings. */
  addAssignment(userName: string, candidateName: string): void {
    const pending: Scorecard = {
      userName,
      candidateName,
      submitted: null,
      technicalSkill: "",
      communication: "",
      collaboration: "",
      roleFit: "",
      notes: "",
    };
    const next = [...this.scorecards, pending];
    this.writeScorecards(next);
    this.scorecards = next;
  }

  // Authored by LLM, model Claude Opus 5.5
  /** Fills in the existing assignment row; it never appends a second row. */
  submitScorecard(userName: string, candidateName: string, submission: ScorecardSubmission): void {
    const existing = this.getScorecard(userName, candidateName);
    if (!existing) throw new Error(`No assignment for ${userName} on ${candidateName}`);
    const next = this.scorecards.map((s) => (s === existing ? { ...s, ...submission } : s));
    this.writeScorecards(next);
    this.scorecards = next;
  }

  // Authored by LLM, model Claude Opus 5.5
  private writeCandidates(candidates: Candidate[]): void {
    this.writeCsv(
      "candidates.csv",
      CANDIDATE_COLUMNS,
      candidates.map((c) => ({ name: c.name, role: c.role, hiring_manager: c.hiringManager })),
    );
  }

  // Authored by LLM, model Claude Opus 5.5
  private writeScorecards(scorecards: Scorecard[]): void {
    this.writeCsv(
      "scorecards.csv",
      SCORECARD_COLUMNS,
      scorecards.map((s) => ({
        user_name: s.userName,
        candidate_name: s.candidateName,
        submitted: s.submitted ?? "",
        technical_skill: s.technicalSkill,
        communication: s.communication,
        collaboration: s.collaboration,
        role_fit: s.roleFit,
        notes: s.notes,
      })),
    );
  }

  // Authored by LLM, model Claude Opus 5.5
  private readCsv(file: string, expectedColumns: string[]): CsvRow[] {
    const content = fs.readFileSync(path.join(this.dataDir, file), "utf8");
    const [header = [], ...rows] = parse(content, { skip_empty_lines: true }) as string[][];
    if (header.join(",") !== expectedColumns.join(",")) {
      throw new Error(`${file}: expected columns "${expectedColumns}", found "${header}"`);
    }
    return rows.map((values) =>
      Object.fromEntries(expectedColumns.map((column, i) => [column, values[i] ?? ""])),
    );
  }

  // Authored by LLM, model Claude Opus 5.5
  /** Writes to a unique temp file, then renames it over the target (atomic on POSIX). */
  private writeCsv(file: string, columns: string[], rows: CsvRow[]): void {
    const target = path.join(this.dataDir, file);
    const temp = path.join(this.dataDir, `.${file}.${randomUUID()}.tmp`);
    const content = stringify(rows, { header: true, columns });
    try {
      fs.writeFileSync(temp, content, "utf8");
      fs.renameSync(temp, target);
    } catch (error) {
      fs.rmSync(temp, { force: true });
      throw error;
    }
  }
}
