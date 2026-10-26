import { NextRequest } from "next/server";
import { expect, it } from "vitest";
import { proxy } from "@/proxy";

// Authored by LLM, model GPT-6
it("rejects malformed candidate paths while preserving valid encoded names", async () => {
  for (const pathname of ["/candidates/100%/submit", "/api/candidates/%E0%A4/scorecards"]) {
    const response = proxy(new NextRequest(`http://localhost${pathname}`));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid candidate URL encoding" });
  }
  const request = new NextRequest("http://localhost/candidates/Taylor%20100%25%20%2F%20%2520/submit");
  const response = proxy(request);
  expect(response.headers.get("x-middleware-next")).toBe("1");
  expect(request.nextUrl.pathname).toBe("/candidates/Taylor%20100%25%20%2F%20%2520/submit");
});
