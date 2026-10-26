import path from "node:path";
import { CsvRepository } from "./csv-repository";

// One repository (and therefore one cache) per server process.
//
// It is stored on globalThis rather than in a module variable because Next.js
// may bundle each route separately and re-evaluate modules on dev hot reload.
// Separate copies would each hold their own cache, so one route would not see
// another route's writes.

const globalForRepo = globalThis as typeof globalThis & { scorecardRepository?: CsvRepository };

// Authored by LLM, model Claude Opus 5.5
export function getRepository(): CsvRepository {
  globalForRepo.scorecardRepository ??= new CsvRepository(
    process.env.DATA_DIR ?? path.join(process.cwd(), "data"),
  );
  return globalForRepo.scorecardRepository;
}

// Authored by LLM, model Claude Opus 5.5
/** Test seam: forget the cached repository so the next call re-reads DATA_DIR. */
export function resetRepository(): void {
  globalForRepo.scorecardRepository = undefined;
}
