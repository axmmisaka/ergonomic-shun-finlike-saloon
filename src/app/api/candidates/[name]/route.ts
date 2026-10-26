import type { NextRequest } from "next/server";
import { withErrors } from "@/server/http";
import { getRepository } from "@/server/repository";
import { getCandidate } from "@/server/scorecard-service";
import { getCurrentUser } from "@/server/session";

// Authored by LLM, model unknown
export async function GET(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  return withErrors(async () => {
    const repo = getRepository();
    const viewer = getCurrentUser(request, repo);
    const { name } = await params;
    return Response.json(getCandidate(repo, viewer, name));
  });
}
