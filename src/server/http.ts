// HTTP plumbing shared by all Route Handlers: typed errors -> JSON responses.

export class HttpError extends Error {
  // Authored by LLM, model unknown
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// Authored by LLM, model unknown
/** Runs a handler and converts thrown HttpErrors into `{ error }` JSON responses. */
export async function withErrors(handler: () => Response | Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof HttpError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Authored by LLM, model unknown
/** Parses a JSON object body; anything else is a 400. */
export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new HttpError(400, "Request body must be a JSON object");
  }
  return body as Record<string, unknown>;
}
