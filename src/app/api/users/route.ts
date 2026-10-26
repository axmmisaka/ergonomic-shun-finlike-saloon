import { withErrors } from "@/server/http";
import { getRepository } from "@/server/repository";

// Authored by LLM, model unknown
/** Public: feeds the "who is signed in" dropdown (stand-in for a login screen). */
export async function GET() {
  return withErrors(() => Response.json(getRepository().listUsers()));
}
