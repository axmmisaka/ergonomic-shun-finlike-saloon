import fs from "node:fs";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as candidateRoute from "@/app/api/candidates/[name]/route";
import * as assignmentsRoute from "@/app/api/candidates/[name]/assignments/route";
import * as scorecardsRoute from "@/app/api/candidates/[name]/scorecards/route";
import * as candidatesRoute from "@/app/api/candidates/route";
import * as sessionRoute from "@/app/api/session/route";
import * as usersRoute from "@/app/api/users/route";
import type { CandidateScorecards, CandidateSummary } from "@/lib/types";
import { resetRepository } from "@/server/repository";
import { SESSION_COOKIE } from "@/server/session";
import { makeTempDataDir, readCsv } from "./helpers";

// API integration tests: they call the real Route Handlers with real Request
// objects, so routing params, cookies, JSON parsing, status codes, the service
// layer, and CSV persistence are all exercised. Each test runs against a fresh
// temp copy of the seed CSVs.

const VALID_SCORECARD = {
  technicalSkill: "Strong",
  communication: "Solid",
  collaboration: "Exceptional",
  roleFit: "Developing",
  notes: "Good systems thinking.",
};

interface Options {
  as?: string;
  method?: string;
  body?: unknown;
}

// Authored by LLM, model unknown
function makeRequest(path: string, { as, method = "GET", body }: Options = {}): NextRequest {
  const headers = new Headers();
  if (as) headers.set("cookie", `${SESSION_COOKIE}=${encodeURIComponent(as)}`);
  if (body !== undefined) headers.set("content-type", "application/json");
  return new NextRequest(new URL(path, "http://localhost"), {
    method,
    headers,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

// Authored by LLM, model unknown
function params(name: string) {
  return { params: Promise.resolve({ name }) };
}

// Thin wrappers so each test reads as "user X does Y".
// Authored by LLM, model unknown
const api = {
  listCandidates: (as?: string) => candidatesRoute.GET(makeRequest("/api/candidates", { as })),
  createCandidate: (as: string, body: unknown) =>
    candidatesRoute.POST(makeRequest("/api/candidates", { as, method: "POST", body })),
  getCandidate: (as: string, name: string) =>
    candidateRoute.GET(makeRequest(`/api/candidates/${encodeURIComponent(name)}`, { as }), params(name)),
  assign: (as: string, name: string, body: unknown) =>
    assignmentsRoute.POST(makeRequest("/api/x", { as, method: "POST", body }), params(name)),
  getScorecards: (as: string, name: string) =>
    scorecardsRoute.GET(makeRequest("/api/x", { as }), params(name)),
  submit: (as: string, name: string, body: unknown = VALID_SCORECARD) =>
    scorecardsRoute.POST(makeRequest("/api/x", { as, method: "POST", body }), params(name)),
};

// Authored by LLM, model unknown
async function candidateNames(as: string): Promise<string[]> {
  const res = await api.listCandidates(as);
  expect(res.status).toBe(200);
  return ((await res.json()) as CandidateSummary[]).map((c) => c.name).sort();
}

describe("API", () => {
  let dir: string;

  // Authored by LLM, model unknown
  beforeEach(() => {
    dir = makeTempDataDir();
    process.env.DATA_DIR = dir;
    resetRepository();
  });

  // Authored by LLM, model unknown
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    delete process.env.DATA_DIR;
    resetRepository();
  });

  // Tests: no session -> 401; "logging in" sets a cookie that identifies the
  // user; unknown users cannot log in; the user list is available for the dropdown.
  // Authored by LLM, model unknown
  it("resolves the current user only from the session cookie", async () => {
    expect((await api.listCandidates()).status).toBe(401);
    expect((await sessionRoute.GET(makeRequest("/api/session"))).status).toBe(401);
    expect((await api.listCandidates("Not A User")).status).toBe(401);

    const users = await (await usersRoute.GET()).json();
    expect(users).toHaveLength(5);

    const login = await sessionRoute.PUT(
      makeRequest("/api/session", { method: "PUT", body: { userName: "Jordan Hale" } }),
    );
    expect(login.status).toBe(200);
    expect(login.headers.get("set-cookie")).toContain(`${SESSION_COOKIE}=Jordan%20Hale`);

    const me = await sessionRoute.GET(makeRequest("/api/session", { as: "Jordan Hale" }));
    expect(await me.json()).toEqual({ name: "Jordan Hale", role: "Senior Engineer" });

    const bad = await sessionRoute.PUT(
      makeRequest("/api/session", { method: "PUT", body: { userName: "Mallory" } }),
    );
    expect(bad.status).toBe(400);
  });

  // Tests: identity fields in a request body are ignored; the session user is
  // the one whose scorecard is submitted.
  // Authored by LLM, model unknown
  it("ignores identity supplied in the request body", async () => {
    const res = await api.submit("Sam Okonkwo", "Noah Patel", {
      ...VALID_SCORECARD,
      userName: "Priya Shah",
      user_name: "Priya Shah",
    });
    expect(res.status).toBe(201);
    const csv = readCsv(dir, "scorecards.csv");
    expect(csv).toMatch(/^Sam Okonkwo,Noah Patel,\d{4}-\d{2}-\d{2},Strong,/m);
    expect(csv).not.toContain("Priya Shah,Noah Patel");
  });

  // Tests: each user sees exactly the candidates they manage or are assigned
  // to; unrelated users get 404 on direct API access to a candidate.
  // Authored by LLM, model unknown
  it("shows candidates only to their hiring manager and assignees", async () => {
    expect(await candidateNames("Avery Lin")).toEqual([
      "Chris Adeyemi",
      "Elena Voss",
      "Mina Alvarez",
      "Noah Patel",
    ]);
    expect(await candidateNames("Sam Okonkwo")).toEqual(["Noah Patel"]);
    expect(await candidateNames("Riley Chen")).toEqual(["Chris Adeyemi"]);

    expect((await api.getCandidate("Sam Okonkwo", "Elena Voss")).status).toBe(404);
    expect((await api.getScorecards("Sam Okonkwo", "Elena Voss")).status).toBe(404);
    expect((await api.submit("Sam Okonkwo", "Elena Voss")).status).toBe(404);
    expect((await api.assign("Sam Okonkwo", "Elena Voss", { userName: "Sam Okonkwo" })).status).toBe(404);
  });

  // Tests: hiring-manager status comes from candidates.hiring_manager, not from
  // the user's job title (Jordan is a "Senior Engineer").
  // Authored by LLM, model unknown
  it("treats the candidate's hiring_manager as manager regardless of job title", async () => {
    const res = await api.getCandidate("Jordan Hale", "Mina Alvarez");
    const mina = (await res.json()) as CandidateSummary;
    expect(mina.isHiringManager).toBe(true);
    expect(mina.assignees).toEqual([{ name: "Avery Lin", submitted: false }]);

    // An "Engineering Manager" has no manager rights over someone else's candidate.
    const asAvery = (await (await api.getCandidate("Avery Lin", "Mina Alvarez")).json()) as CandidateSummary;
    expect(asAvery.isHiringManager).toBe(false);
  });

  // Tests: creating a candidate makes the creator the hiring manager and
  // persists to candidates.csv; duplicates and blank fields are rejected.
  // Authored by LLM, model unknown
  it("creates candidates with the current user as hiring manager", async () => {
    const res = await api.createCandidate("Sam Okonkwo", {
      name: "  Taylor Brooks ",
      role: "SRE",
      hiringManager: "Riley Chen", // must be ignored
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({
      name: "Taylor Brooks",
      hiringManager: "Sam Okonkwo",
      isHiringManager: true,
    });
    expect(readCsv(dir, "candidates.csv")).toContain("Taylor Brooks,SRE,Sam Okonkwo");
    expect(await candidateNames("Sam Okonkwo")).toContain("Taylor Brooks");

    expect((await api.createCandidate("Sam Okonkwo", { name: "elena voss", role: "X" })).status).toBe(409);
    expect((await api.createCandidate("Sam Okonkwo", { name: "  ", role: "X" })).status).toBe(400);
    expect((await api.createCandidate("Sam Okonkwo", { name: "New Person" })).status).toBe(400);
  });

  // Authored by LLM, model GPT-6
  it("rejects dot-segment candidate names without persisting unreachable candidates", async () => {
    const before = readCsv(dir, "candidates.csv");
    for (const name of [".", " .. "]) {
      const response = await api.createCandidate("Sam Okonkwo", { name, role: "SRE" });
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'Candidate name cannot be "." or ".."' });
    }
    expect(readCsv(dir, "candidates.csv")).toBe(before);
    expect((await api.createCandidate("Sam Okonkwo", { name: "Dr. Taylor", role: "SRE" })).status).toBe(201);
  });

  // Tests: managers and assignees can assign; invalid and duplicate targets fail.
  // Edited by LLM, model GPT-6
  it("lets users assign interviewers to candidates they can access", async () => {
    const res = await api.assign("Avery Lin", "Noah Patel", { userName: "Priya Shah" });
    expect(res.status).toBe(201);
    expect(readCsv(dir, "scorecards.csv")).toContain("Priya Shah,Noah Patel,,,,,,");
    expect(await candidateNames("Priya Shah")).toContain("Noah Patel");

    expect((await api.assign("Avery Lin", "Noah Patel", { userName: "Priya Shah" })).status).toBe(409);
    expect((await api.assign("Avery Lin", "Noah Patel", { userName: "Nobody" })).status).toBe(400);
    expect((await api.assign("Avery Lin", "Noah Patel", {})).status).toBe(400);
    // Sam is assigned to Noah but is not the hiring manager.
    const assigned = await api.assign("Sam Okonkwo", "Noah Patel", { userName: "Jordan Hale" });
    expect(assigned.status).toBe(201);
    expect((await assigned.json()).assignees).toBeNull();
    expect(await candidateNames("Jordan Hale")).toContain("Noah Patel");

    const rows = readCsv(dir, "scorecards.csv").split("\n").filter((l) => l.includes(",Noah Patel,"));
    expect(rows).toHaveLength(3); // Sam's original row + Priya and Jordan
  });

  // Authored by LLM, model GPT-6
  it("rejects assigning the session user to themselves without changing persistence", async () => {
    const before = readCsv(dir, "scorecards.csv");
    for (const as of ["Avery Lin", "Jordan Hale"]) {
      const response = await api.assign(as, "Elena Voss", { userName: as });
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "You can only assign other users" });
    }
    expect(readCsv(dir, "scorecards.csv")).toBe(before);
  });

  // Tests: an assignee submits once, which fills in their existing row; a second
  // submission, an unassigned manager, and an unrelated user are rejected.
  // Authored by LLM, model unknown
  it("accepts exactly one scorecard from an assigned user", async () => {
    const rowCount = () => readCsv(dir, "scorecards.csv").trim().split("\n").length;
    const before = rowCount();

    const res = await api.submit("Sam Okonkwo", "Noah Patel");
    expect(res.status).toBe(201);
    expect(rowCount()).toBe(before);
    expect(readCsv(dir, "scorecards.csv")).not.toContain("Sam Okonkwo,Noah Patel,,");

    expect((await api.submit("Sam Okonkwo", "Noah Patel")).status).toBe(409);
    // Jordan manages Mina but is not assigned to her.
    expect((await api.submit("Jordan Hale", "Mina Alvarez")).status).toBe(403);
    expect((await api.submit("Riley Chen", "Noah Patel")).status).toBe(404);
  });

  // Tests: an assignee who has not submitted cannot read anyone's scorecards.
  // Authored by LLM, model unknown
  it("hides scorecards from an assignee until they submit", async () => {
    await api.assign("Avery Lin", "Elena Voss", { userName: "Sam Okonkwo" });
    const res = await api.getScorecards("Sam Okonkwo", "Elena Voss");
    expect(res.status).toBe(403);
    expect(await res.text()).not.toContain("replication-lag");
  });

  // Tests: after submitting, an assignee sees all submitted scorecards, their own
  // labelled as theirs, with no other author's name or role anywhere in the
  // response, and no assignee list on the candidate.
  // Authored by LLM, model unknown
  it("anonymizes other authors for an assignee who has submitted", async () => {
    const res = await api.getScorecards("Avery Lin", "Chris Adeyemi");
    expect(res.status).toBe(200);
    const raw = await res.clone().text();
    const body = (await res.json()) as CandidateScorecards;

    expect(body.scorecards).toHaveLength(2);
    const own = body.scorecards.find((s) => s.isOwn);
    const other = body.scorecards.find((s) => !s.isOwn);
    expect(own).toMatchObject({ author: "Avery Lin", communication: "Solid" });
    expect(other).toMatchObject({ author: null, authorRole: null, technicalSkill: "Exceptional" });
    expect(body.candidate.assignees).toBeNull();
    expect(raw).not.toContain("Priya");
    expect(raw).not.toContain("Staff Engineer");
  });

  // Tests: the hiring manager sees named scorecards without submitting one, and
  // pending assignments are not shown as scorecards.
  // Authored by LLM, model unknown
  it("shows named scorecards to the hiring manager", async () => {
    const chris = (await (await api.getScorecards("Riley Chen", "Chris Adeyemi")).json()) as CandidateScorecards;
    expect(chris.scorecards.map((s) => [s.author, s.authorRole]).sort()).toEqual([
      ["Avery Lin", "Engineering Manager"],
      ["Priya Shah", "Staff Engineer"],
    ]);

    const noahBefore = (await (await api.getScorecards("Avery Lin", "Noah Patel")).json()) as CandidateScorecards;
    expect(noahBefore.scorecards).toEqual([]);
    await api.submit("Sam Okonkwo", "Noah Patel");
    const noahAfter = (await (await api.getScorecards("Avery Lin", "Noah Patel")).json()) as CandidateScorecards;
    expect(noahAfter.scorecards.map((s) => s.author)).toEqual(["Sam Okonkwo"]);
  });

  // Tests: a hiring manager assigned by another interviewer keeps full named access
  // before submitting, and can also submit their own scorecard once.
  // Edited by LLM, model GPT-6
  it("combines manager and assignee permissions", async () => {
    expect((await api.assign("Jordan Hale", "Elena Voss", { userName: "Avery Lin" })).status).toBe(201);

    const before = (await (await api.getScorecards("Avery Lin", "Elena Voss")).json()) as CandidateScorecards;
    expect(before.candidate).toMatchObject({ isHiringManager: true, isAssigned: true, hasSubmitted: false });
    expect(before.scorecards.map((s) => s.author).sort()).toEqual(["Jordan Hale", "Priya Shah"]);

    expect((await api.submit("Avery Lin", "Elena Voss")).status).toBe(201);
    const after = (await (await api.getScorecards("Avery Lin", "Elena Voss")).json()) as CandidateScorecards;
    expect(after.scorecards.map((s) => s.author).sort()).toEqual(["Avery Lin", "Jordan Hale", "Priya Shah"]);
    expect((await api.submit("Avery Lin", "Elena Voss")).status).toBe(409);
  });

  // Tests: invalid or missing ratings, wrong types, malformed JSON, and unknown
  // candidates are rejected without writing anything.
  // Authored by LLM, model unknown
  it("validates scorecard submissions", async () => {
    const before = readCsv(dir, "scorecards.csv");
    const { communication: _omitted, ...missingField } = VALID_SCORECARD;

    expect((await api.submit("Sam Okonkwo", "Noah Patel", { ...VALID_SCORECARD, roleFit: "Great" })).status).toBe(400);
    expect((await api.submit("Sam Okonkwo", "Noah Patel", missingField)).status).toBe(400);
    expect((await api.submit("Sam Okonkwo", "Noah Patel", { ...VALID_SCORECARD, notes: 42 })).status).toBe(400);
    expect((await api.submit("Sam Okonkwo", "Noah Patel", "{not json")).status).toBe(400);
    expect((await api.submit("Sam Okonkwo", "Nobody Here")).status).toBe(404);

    expect(readCsv(dir, "scorecards.csv")).toBe(before);
  });
});
