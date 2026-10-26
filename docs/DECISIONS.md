# Engineering Decisions

This log records the decisions that matter for review: what was chosen, what else was considered, and the cost of the choice.

**Origin** tells you where each decision came from:
- **Spec**: required by the assignment.
- **Developer**: decided by the developer before implementation started.
- **Agent**: an implementation choice made by the AI coding agent while building, which the developer reviewed.

---

## D1. CSV files as the only persistence, with a write-through in-memory cache

- **Decision:** `CsvRepository` reads all three CSVs into memory once. Every mutation rewrites the whole affected CSV to a uniquely named temp file in the same directory, `rename`s it over the original, and only then updates memory.
- **Context:** The spec says to use the provided CSVs as persistence, not a database, and allows a cache.
- **Alternatives:** (a) Re-read and re-parse the CSVs on every request. Simple, never stale, but it does redundant work and still needs atomic writes. (b) Write-behind or periodic flushing. Faster writes, but acknowledged data can be lost. (c) Appending rows. Cheap for inserts, but a scorecard submission must *update* an existing row, so the file has to be rewritten anyway.
- **Rationale:** A write-through cache has a single source of truth (the file), so a request never gets an acknowledgement for data that is not on disk. Temp file plus rename means a crash mid-write cannot leave a half-written CSV. Updating memory after the write means a failed write leaves memory and disk in agreement. A test covers this.
- **Consequences / limitations:**
  - Each mutation is an O(N) rewrite of one file. That is fine for this data size, but it would not scale.
  - Synchronous `fs` calls block the event loop during a write. This is deliberate: because nothing awaits between "read state" and "swap state", two requests in one Node process cannot interleave a read-modify-write. No lock is needed.
  - **Single process only.** Two server processes, or anything editing the CSVs while the app runs, would cause lost updates and a stale cache. Multi-process safety would need a file lock or a real database.
  - The cache is never invalidated. Restart the app after editing the CSVs by hand.
  - `rename` is atomic on POSIX filesystems. No `fsync` is done, so durability across a power loss is not guaranteed.
- **Origin:** Developer (CSV with in-memory write-through cache, synchronous single-process writes). Agent (temp file naming, column validation on load).

## D2. The CSV schemas are authoritative and are not changed

- **Decision:** Column order and names are fixed in code (`USER_COLUMNS`, etc.). Loading fails loudly if a header does not match. Every write emits exactly those columns.
- **Context:** "Do not add or modify the columns of the provided CSV."
- **Alternatives:** Infer columns from the header. That would silently accept drift.
- **Rationale:** This makes accidental schema changes impossible to miss. A test checks that headers are unchanged after mutations.
- **Origin:** Spec (no schema changes). Agent (fail-fast header check).

## D3. Names are the identifiers

- **Decision:** Users and candidates are identified by their `name`. A scorecard row is identified by `(user_name, candidate_name)`. URLs use the URL-encoded candidate name.
- **Context:** The CSVs have no ID columns, and IDs cannot be added.
- **Alternatives:** Generate UUIDs in memory. They would not survive a restart, and nothing on disk could refer to them.
- **Rationale:** Names are the only stable keys the data provides.
- **Consequences:** Candidate names must be unique, so creation rejects a duplicate (case-insensitively, ignoring surrounding whitespace). Renaming a person or candidate is impossible without rewriting every reference, which is out of scope. Two real people with the same name cannot both be represented.
- **Origin:** Developer.

## D4. An unsubmitted scorecard row *is* the assignment

- **Decision:** Assigning a user appends a scorecard row with empty `submitted` and empty ratings. Submitting fills in that same row; it never adds a second one. `submitted` holds a `YYYY-MM-DD` date.
- **Context:** The seed data already models assignments this way (for example, `Sam Okonkwo,Noah Patel,,,,,,`). There is no separate assignments file.
- **Rationale:** This matches the existing data, needs no new schema, and guarantees at most one scorecard per user per candidate.
- **Origin:** Developer (row semantics). Spec/CSV (date format).
