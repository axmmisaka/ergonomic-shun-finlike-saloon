import { NextResponse, type NextRequest } from "next/server";
import { HttpError, readJsonObject, withErrors } from "@/server/http";
import { getRepository } from "@/server/repository";
import { SESSION_COOKIE, getCurrentUser } from "@/server/session";

// Authored by LLM, model unknown
export async function GET(request: NextRequest) {
  return withErrors(() => Response.json(getCurrentUser(request, getRepository())));
}

// Authored by LLM, model unknown
/** Simulated sign-in: no credentials, but only existing users can be selected. */
export async function PUT(request: NextRequest) {
  return withErrors(async () => {
    const { userName } = await readJsonObject(request);
    const user = typeof userName === "string" ? getRepository().getUser(userName) : undefined;
    if (!user) throw new HttpError(400, "Unknown user");

    const response = NextResponse.json(user);
    response.cookies.set(SESSION_COOKIE, user.name, { httpOnly: true, sameSite: "lax", path: "/" });
    return response;
  });
}
