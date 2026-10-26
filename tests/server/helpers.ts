import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SEED_DIR = path.resolve(import.meta.dirname, "../../data");

// Authored by LLM, model Claude Opus 5.5
/** Copies the seed CSVs into a fresh temp directory so tests never touch data/. */
export function makeTempDataDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scorecards-test-"));
  for (const file of ["users.csv", "candidates.csv", "scorecards.csv"]) {
    fs.copyFileSync(path.join(SEED_DIR, file), path.join(dir, file));
  }
  return dir;
}

// Authored by LLM, model Claude Opus 5.5
export function readCsv(dir: string, file: string): string {
  return fs.readFileSync(path.join(dir, file), "utf8");
}

// Authored by LLM, model Claude Opus 5.5
export function readSeedCsv(file: string): string {
  return fs.readFileSync(path.join(SEED_DIR, file), "utf8");
}
