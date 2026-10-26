// Page URLs. Candidate names are the identifiers, so they are URL-encoded.

// Authored by LLM, model unknown
export function submitHref(candidateName: string): string {
  return `/candidates/${encodeURIComponent(candidateName)}/submit`;
}

// Authored by LLM, model unknown
export function scorecardsHref(candidateName: string): string {
  return `/candidates/${encodeURIComponent(candidateName)}/scorecards`;
}
