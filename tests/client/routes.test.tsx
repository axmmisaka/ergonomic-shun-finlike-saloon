import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import SubmitPage from "@/app/candidates/[name]/submit/page";
import ScorecardsPage from "@/app/candidates/[name]/scorecards/page";

// Authored by LLM, model GPT-6
const route = vi.hoisted(() => ({ name: "" }));

// Authored by LLM, model GPT-6
beforeEach(() => { route.name = "Taylor%20100%25%20%2F%20%2520"; });

// The installed App Router supplies encoded page params. Decode once before building API URLs.
// Edited by LLM, model GPT-6
vi.mock("next/navigation", () => ({
  // Edited by LLM, model GPT-6
  useParams: () => ({ name: route.name }),
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

// Authored by LLM, model GPT-6
it.each([SubmitPage, ScorecardsPage])("shows an invalid-URL message instead of crashing on malformed encoding (%#)", (Page) => {
  route.name = "100%";
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  render(<Page />);
  expect(screen.getByRole("alert")).toHaveTextContent("Invalid candidate URL");
  expect(screen.getByRole("link", { name: "Candidates" })).toHaveAttribute("href", "/");
  expect(fetchMock).not.toHaveBeenCalled();
});
