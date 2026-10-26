import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CsvRepository } from "@/server/csv-repository";
import { makeTempDataDir, readCsv, readSeedCsv } from "./helpers";

const RATINGS = {
  technicalSkill: "Strong",
  communication: "Solid",
  collaboration: "Exceptional",
  roleFit: "Developing",
} as const;

describe("CsvRepository", () => {
  let dir: string;

  // Authored by LLM, model unknown
  beforeEach(() => {
    dir = makeTempDataDir();
  });

  // Authored by LLM, model unknown
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  // Tests: seed CSVs load into memory, including empty fields of pending rows.
  // Authored by LLM, model unknown
  it("loads the seed data", () => {
    const repo = new CsvRepository(dir);
    expect(repo.listUsers().map((u) => u.name)).toEqual([
      "Avery Lin",
      "Jordan Hale",
      "Priya Shah",
      "Sam Okonkwo",
      "Riley Chen",
    ]);
    expect(repo.getCandidate("Mina Alvarez")).toEqual({
      name: "Mina Alvarez",
      role: "Frontend Engineer",
      hiringManager: "Jordan Hale",
    });
    expect(repo.getScorecard("Sam Okonkwo", "Noah Patel")?.submitted).toBeNull();
  });

  // Tests: every mutation survives a fresh repository load, headers are unchanged,
  // a submission updates the assignment row instead of appending, and notes with
  // commas, quotes and newlines round-trip through the CSV.
  // Authored by LLM, model unknown
  it("persists mutations and round-trips tricky notes", () => {
    const notes = 'Said "ship it", then paused.\nSecond line, with a comma.';
    const repo = new CsvRepository(dir);

    repo.addCandidate({ name: "Taylor Brooks", role: "SRE", hiringManager: "Sam Okonkwo" });
    repo.addAssignment("Priya Shah", "Taylor Brooks");
    repo.submitScorecard("Priya Shah", "Taylor Brooks", { ...RATINGS, notes, submitted: "2026-10-26" });

    const reloaded = new CsvRepository(dir);
    expect(reloaded.getCandidate("Taylor Brooks")?.hiringManager).toBe("Sam Okonkwo");
    expect(reloaded.getScorecard("Priya Shah", "Taylor Brooks")).toEqual({
      userName: "Priya Shah",
      candidateName: "Taylor Brooks",
      submitted: "2026-10-26",
      ...RATINGS,
      notes,
    });
    // One assignment row was added and then updated in place: exactly one row for the pair.
    expect(reloaded.listScorecards("Taylor Brooks")).toHaveLength(1);

    for (const file of ["users.csv", "candidates.csv", "scorecards.csv"]) {
      expect(readCsv(dir, file).split("\n")[0]).toBe(readSeedCsv(file).split("\n")[0]);
    }
  });

  // Tests: if writing the CSV fails, the in-memory cache is not updated, the
  // original file is untouched, and no temp file is left behind.
  // Authored by LLM, model unknown
  it("does not update the cache when the write fails", () => {
    const repo = new CsvRepository(dir);
    const before = readCsv(dir, "candidates.csv");
    vi.spyOn(fs, "renameSync").mockImplementation(() => {
      throw new Error("disk full");
    });

    expect(() =>
      repo.addCandidate({ name: "Taylor Brooks", role: "SRE", hiringManager: "Sam Okonkwo" }),
    ).toThrow("disk full");

    expect(repo.getCandidate("Taylor Brooks")).toBeUndefined();
    expect(readCsv(dir, "candidates.csv")).toBe(before);
    expect(fs.readdirSync(dir).filter((f) => f.endsWith(".tmp"))).toEqual([]);
  });

  // Tests: a CSV whose columns differ from the expected schema is rejected at load.
  // Authored by LLM, model unknown
  it("refuses to load a CSV with unexpected columns", () => {
    fs.writeFileSync(`${dir}/users.csv`, "name,role,email\nA,B,c@example.com\n");
    expect(() => new CsvRepository(dir)).toThrow(/users\.csv/);
  });
});
