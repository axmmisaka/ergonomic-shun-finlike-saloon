import type { NextRequest } from "next/server";
import { readJsonObject, withErrors } from "@/server/http";
import { getRepository } from "@/server/repository";
import { getScorecards, submitScorecard } from "@/server/scorecard-service";
import { getCurrentUser } from "@/server/session";

type Context = { params: Promise<{ name: string }> };

// Authored by LLM, model unknown
export async function GET(request: NextRequest, { params }: Context) {
  return withErrors(async () => {
    const repo = getRepository();
    const viewer = getCurrentUser(request, repo);
    const { name } = await params;
    return Response.json(getScorecards(repo, viewer, name));
  });
}

// Authored by LLM, model unknown
/** Submits the *current user's* scorecard; identity fields in the body are ignored. */
export async function POST(request: NextRequest, { params }: Context) {
  return withErrors(async () => {
    const repo = getRepository();
    const viewer = getCurrentUser(request, repo);
    const { name } = await params;
    const body = await readJsonObject(request);
    return Response.json(submitScorecard(repo, viewer, name, body), { status: 201 });
  });
}
