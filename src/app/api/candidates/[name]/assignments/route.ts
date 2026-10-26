import type { NextRequest } from "next/server";
import { readJsonObject, withErrors } from "@/server/http";
import { getRepository } from "@/server/repository";
import { assignUser } from "@/server/scorecard-service";
import { getCurrentUser } from "@/server/session";

// Authored by LLM, model unknown
export async function POST(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  return withErrors(async () => {
    const repo = getRepository();
    const viewer = getCurrentUser(request, repo);
    const { name } = await params;
    const body = await readJsonObject(request);
    return Response.json(assignUser(repo, viewer, name, body), { status: 201 });
  });
}
