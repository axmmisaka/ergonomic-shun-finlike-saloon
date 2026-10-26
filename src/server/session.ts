import type { NextRequest } from "next/server";
import type { User } from "@/lib/types";
import type { CsvRepository } from "./csv-repository";
import { HttpError } from "./http";

// Simulated authentication.
//
// The "session" is just a cookie holding the user's name, set when someone is
// picked in the user dropdown. It is NOT secure: anyone can edit the cookie.
// What matters is the shape: every handler gets the current user from
// getCurrentUser(), and never from the request body. Real authentication would
// replace this file (for example, verify a signed session or OIDC token and
// look up the user) without changing any business logic.

export const SESSION_COOKIE = "scorecards_user";

// Authored by LLM, model unknown
export function getCurrentUser(request: NextRequest, repo: CsvRepository): User {
  const name = request.cookies.get(SESSION_COOKIE)?.value;
  const user = name ? repo.getUser(name) : undefined;
  if (!user) throw new HttpError(401, "Not signed in");
  return user;
}
