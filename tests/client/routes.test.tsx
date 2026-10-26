import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import SubmitPage from "@/app/candidates/[name]/submit/page";
import ScorecardsPage from "@/app/candidates/[name]/scorecards/page";

// The installed App Router supplies encoded page params. Decode once before building API URLs.
// Authored by LLM, model GPT-6
vi.mock("next/navigation", () => ({
  // Authored by LLM, model GPT-6
  useParams: () => ({ name: "Taylor%20100%25%20%2F%20%2520" }),
  // Authored by LLM, model GPT-6
  useRouter: () => ({ push: vi.fn() }),
}));

// Authored by LLM, model GPT-6
it.each([SubmitPage, ScorecardsPage])("preserves special characters in candidate route parameters (%#)", async (Page) => {
  // Authored by LLM, model GPT-6
  const fetchMock = vi.fn(() => Promise.resolve(Response.json({ error: "Candidate not found" }, { status: 404 })));
  vi.stubGlobal("fetch", fetchMock);
  render(<Page />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Candidate not found");
  expect(fetchMock.mock.calls).toHaveLength(1);
  expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/candidates/Taylor%20100%25%20%2F%20%2520"), expect.anything());
});
