import type {
  CandidateScorecards,
  CandidateSummary,
  CreateCandidateRequest,
  SubmitScorecardRequest,
  User,
} from "@/lib/types";

// The only way the browser talks to the backend. Components never import
// anything from src/server.

export class ApiRequestError extends Error {
  // Authored by LLM, model unknown
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// Authored by LLM, model unknown
async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiRequestError(response.status, data?.error ?? `Request failed (${response.status})`);
  }
  return data as T;
}

// Authored by LLM, model unknown
const candidatePath = (name: string) => `/api/candidates/${encodeURIComponent(name)}`;

export const api = {
  listUsers: () => request<User[]>("/api/users"),
  getSession: () => request<User>("/api/session"),
  signIn: (userName: string) => request<User>("/api/session", "PUT", { userName }),
  listCandidates: () => request<CandidateSummary[]>("/api/candidates"),
  createCandidate: (input: CreateCandidateRequest) =>
    request<CandidateSummary>("/api/candidates", "POST", input),
  getCandidate: (name: string) => request<CandidateSummary>(candidatePath(name)),
  assignUser: (name: string, userName: string) =>
    request<CandidateSummary>(`${candidatePath(name)}/assignments`, "POST", { userName }),
  getScorecards: (name: string) => request<CandidateScorecards>(`${candidatePath(name)}/scorecards`),
  submitScorecard: (name: string, input: SubmitScorecardRequest) =>
    request<CandidateScorecards>(`${candidatePath(name)}/scorecards`, "POST", input),
};

// Authored by LLM, model unknown
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}
