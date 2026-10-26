import type { NextRequest } from "next/server";
import { readJsonObject, withErrors } from "@/server/http";
import { getRepository } from "@/server/repository";
import { createCandidate, listVisibleCandidates } from "@/server/scorecard-service";
import { getCurrentUser } from "@/server/session";

// Authored by LLM, model Claude Opus 5.5
export async function GET(request: NextRequest) {
  return withErrors(() => {
    const repo = getRepository();
    return Response.json(listVisibleCandidates(repo, getCurrentUser(request, repo)));
  });
}

// Authored by LLM, model Claude Opus 5.5
export async function POST(request: NextRequest) {
  return withErrors(async () => {
    const repo = getRepository();
    const viewer = getCurrentUser(request, repo);
    const body = await readJsonObject(request);
    return Response.json(createCandidate(repo, viewer, body), { status: 201 });
  });
}
