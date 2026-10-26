// Page URLs. Candidate names are the identifiers, so they are URL-encoded.

// Authored by LLM, model GPT-6
/** Page params are encoded in the installed App Router; malformed URLs are not candidate names. */
export function decodeCandidateName(encodedName: string): string | null {
  try {
    return decodeURIComponent(encodedName);
  } catch {
    return null;
  }
}

// Authored by LLM, model unknown
export function submitHref(candidateName: string): string {
  return `/candidates/${encodeURIComponent(candidateName)}/submit`;
}

// Authored by LLM, model unknown
export function scorecardsHref(candidateName: string): string {
  return `/candidates/${encodeURIComponent(candidateName)}/scorecards`;
}
