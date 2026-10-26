import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { AppShell } from "@/components/AppShell";
import { CandidatesPage } from "@/components/CandidatesPage";
import { ScorecardForm } from "@/components/ScorecardForm";
import { ScorecardList } from "@/components/ScorecardList";
import type { CandidateSummary, ScorecardView } from "@/lib/types";

const users = [
  { name: "Avery Lin", role: "Engineering Manager" },
  { name: "Sam Okonkwo", role: "Product Designer" },
];
const pending: CandidateSummary = {
  name: "Noah Patel", role: "Product Designer", hiringManager: "Avery Lin",
  isHiringManager: false, isAssigned: true, hasSubmitted: false, assignees: null,
};
const managed: CandidateSummary = {
  ...pending, name: "Elena Voss", isHiringManager: true, isAssigned: false,
  assignees: [{ name: "Sam Okonkwo", submitted: false }],
};
const submitted: CandidateSummary = { ...pending, name: "Chris Adeyemi", hasSubmitted: true };

// Authored by LLM, model GPT-6
function json(body: unknown, status = 200) {
  return Promise.resolve(Response.json(body, { status }));
}

// Authored by LLM, model GPT-6
function mockFetch(handler: (url: string, init: RequestInit) => Promise<Response>) {
  // Authored by LLM, model GPT-6
  const fetchMock = vi.fn((url: string, init: RequestInit = {}) => handler(url, init));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// User switches must clear the previous user's data and disable actions while the cookie changes.
// Authored by LLM, model GPT-6
it("selects users, reloads their candidates, and hides actions while switching", async () => {
  let current = users[0];
  let finishSwitch!: (response: Response) => void;
  // Authored by LLM, model GPT-6
  mockFetch((url, init) => {
    if (url === "/api/users") return json(users);
    if (url === "/api/session" && init.method === "PUT") {
      current = users.find((u) => u.name === JSON.parse(init.body as string).userName)!;
      return new Promise((resolve) => { finishSwitch = resolve; });
    }
    if (url === "/api/session") return json(current);
    if (url === "/api/candidates") return json(current === users[0] ? [managed, pending, submitted] : [pending]);
    throw new Error(`Unexpected request: ${url}`);
  });
  const user = userEvent.setup();
  render(<AppShell><CandidatesPage /></AppShell>);
  expect(await screen.findByRole("heading", { name: "Elena Voss" })).toBeVisible();
  expect(within(screen.getByRole("listitem", { name: "Elena Voss" })).getByRole("link", { name: "View scorecards" })).toBeVisible();
  expect(within(screen.getByRole("listitem", { name: "Noah Patel" })).getByRole("link", { name: "Submit scorecard" })).toBeVisible();
  expect(within(screen.getByRole("listitem", { name: "Chris Adeyemi" })).queryByRole("link", { name: "Submit scorecard" })).not.toBeInTheDocument();

  await user.selectOptions(screen.getByRole("combobox", { name: "Signed in as" }), "Sam Okonkwo");
  expect(screen.getByRole("combobox", { name: "Signed in as" })).toBeDisabled();
  expect(screen.queryByRole("heading", { name: "Elena Voss" })).not.toBeInTheDocument();
  await act(async () => { finishSwitch(Response.json(current)); });
  expect(await screen.findByRole("heading", { name: "Noah Patel" })).toBeVisible();
  expect(screen.queryByRole("heading", { name: "Elena Voss" })).not.toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Signed in as" })).toHaveValue("Sam Okonkwo");
});

// Creation refreshes the list; an assignee can assign, with failures shown in context.
// Authored by LLM, model GPT-6
it("creates a candidate and lets an assignee assign with useful duplicate feedback", async () => {
  let candidates = [pending];
  // Authored by LLM, model GPT-6
  const fetchMock = mockFetch((url, init) => {
    if (url === "/api/users") return json(users);
    if (url.endsWith("/assignments")) return json({ error: "Sam Okonkwo is already assigned to Noah Patel" }, 409);
    if (url === "/api/candidates" && init.method === "POST") {
      const body = JSON.parse(init.body as string);
      candidates = [...candidates, { ...managed, ...body }];
      return json(candidates[1], 201);
    }
    if (url === "/api/candidates") return json(candidates);
    throw new Error(`Unexpected request: ${url}`);
  });
  const user = userEvent.setup();
  render(<CandidatesPage />);
  await user.click(await screen.findByRole("button", { name: "+ Add candidate" }));
  await user.type(screen.getByRole("textbox", { name: "Name" }), "Taylor Brooks");
  await user.type(screen.getByRole("textbox", { name: "Role" }), "SRE");
  await user.click(screen.getByRole("button", { name: "Add" }));
  expect(await screen.findByRole("heading", { name: "Taylor Brooks" })).toBeVisible();
  expect(fetchMock).toHaveBeenCalledWith("/api/candidates", expect.objectContaining({
    method: "POST", body: JSON.stringify({ name: "Taylor Brooks", role: "SRE" }),
  }));

  const card = within(screen.getByRole("listitem", { name: "Noah Patel" }));
  await user.click(card.getByRole("button", { name: "Assign" }));
  const form = within(card.getByRole("form", { name: "Assign interviewer to Noah Patel" }));
  await user.selectOptions(await form.findByRole("combobox"), "Sam Okonkwo");
  await user.click(form.getByRole("button", { name: "Assign" }));
  expect(await form.findByRole("alert")).toHaveTextContent("already assigned");
  expect(fetchMock).toHaveBeenCalledWith("/api/candidates/Noah%20Patel/assignments", expect.objectContaining({
    method: "POST", body: JSON.stringify({ userName: "Sam Okonkwo" }),
  }));
});

// Required ratings are validated before sending; network failures keep the form available to retry.
// Authored by LLM, model GPT-6
it("validates ratings, sends the scorecard payload, and allows retry after failure", async () => {
  let fail = true;
  // Authored by LLM, model GPT-6
  const fetchMock = mockFetch((_url, init) => {
    if (init.method === "POST") return fail ? json({ error: "Unable to save" }, 500) : json({}, 201);
    return json(pending);
  });
  const onSubmitted = vi.fn();
  const user = userEvent.setup();
  render(<ScorecardForm candidateName="Noah Patel" onSubmitted={onSubmitted} />);
  await user.click(await screen.findByRole("button", { name: "Submit scorecard" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Please rate: Technical skill, Communication, Collaboration, Role fit");
  expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  for (const label of ["Technical skill", "Communication", "Collaboration", "Role fit"]) {
    await user.click(within(screen.getByRole("group", { name: label })).getByRole("radio", { name: "Strong" }));
  }
  await user.type(screen.getByRole("textbox", { name: "Notes" }), 'Clear, "thoughtful"\nSecond line');
  await user.click(screen.getByRole("button", { name: "Submit scorecard" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Unable to save");
  expect(onSubmitted).not.toHaveBeenCalled();
  fail = false;
  await user.click(screen.getByRole("button", { name: "Submit scorecard" }));
  await waitFor(() => expect(onSubmitted).toHaveBeenCalledOnce());
  expect(fetchMock).toHaveBeenLastCalledWith("/api/candidates/Noah%20Patel/scorecards", expect.objectContaining({
    method: "POST", body: JSON.stringify({ technicalSkill: "Strong", communication: "Strong", collaboration: "Strong", roleFit: "Strong", notes: 'Clear, "thoughtful"\nSecond line' }),
  }));
});

// Display uses the server's anonymous author contract, and submitted assignments cannot be edited.
// Authored by LLM, model GPT-6
it("shows anonymous and own scorecards and the already-submitted state", async () => {
  const scorecard: ScorecardView = {
    author: null, authorRole: null, isOwn: false, submitted: "2026-10-02",
    technicalSkill: "Strong", communication: "Solid", collaboration: "Exceptional", roleFit: "Developing", notes: "Good discussion",
  };
  // Authored by LLM, model GPT-6
  mockFetch((url) => json(url.endsWith("/scorecards") ? {
    candidate: submitted, scorecards: [scorecard, { ...scorecard, author: "Avery Lin", isOwn: true }],
  } : submitted));
  const view = render(<ScorecardList candidateName="Chris Adeyemi" />);
  expect(await screen.findByRole("listitem", { name: "Scorecard by Interviewer" })).toHaveTextContent("Oct 2, 2026");
  expect(screen.getByRole("listitem", { name: "Scorecard by You" })).toHaveTextContent("Your scorecard");
  view.unmount();
  render(<ScorecardForm candidateName="Chris Adeyemi" onSubmitted={vi.fn()} />);
  expect(await screen.findByText(/You already submitted/)).toBeVisible();
  expect(screen.queryByRole("form")).not.toBeInTheDocument();
});

// A rejected read should produce meaningful feedback instead of an empty page or endless spinner.
// Authored by LLM, model GPT-6
it("shows failed candidate and scorecard reads", async () => {
  // Authored by LLM, model GPT-6
  mockFetch(() => json({ error: "Service unavailable" }, 503));
  const view = render(<CandidatesPage />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Service unavailable");
  view.unmount();
  render(<ScorecardList candidateName="Noah Patel" />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Service unavailable");
});

// Authored by LLM, model GPT-6
it("explains existing named access when a hiring manager submits their own scorecard", async () => {
  // Authored by LLM, model GPT-6
  mockFetch(() => json({ ...managed, isAssigned: true }));
  render(<ScorecardForm candidateName="Elena Voss" onSubmitted={vi.fn()} />);
  expect(await screen.findByText(/You can already read all submitted scorecards with author names/)).toBeVisible();
  expect(screen.getByText(/You are the hiring manager/)).toBeVisible();
  expect(screen.queryByText(/After you submit, you can read the others with the author hidden/)).not.toBeInTheDocument();
});
