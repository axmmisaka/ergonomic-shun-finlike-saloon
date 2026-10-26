// Page URLs. Candidate names are the identifiers, so they are URL-encoded.

// Authored by LLM, model Claude Opus 5.5
export function submitHref(candidateName: string): string {
  return `/candidates/${encodeURIComponent(candidateName)}/submit`;
}

// Authored by LLM, model Claude Opus 5.5
export function scorecardsHref(candidateName: string): string {
  return `/candidates/${encodeURIComponent(candidateName)}/scorecards`;
}
