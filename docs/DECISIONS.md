# Engineering Decisions

This log records the decisions that matter for review: what was chosen, what else was considered, and the cost of the choice.

**Origin** tells you where each decision came from:
- **Spec**: required by the assignment.
- **Developer**: decided by the developer before implementation started.
- **Agent**: an implementation choice made by the AI coding agent while building; this label does not imply developer review or approval.

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
- **Consequences:** An incompatible header stops loading instead of attempting a migration. Supplied seed rows are trusted; this is not a general CSV import tool.
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
- **Alternatives:** A separate assignments file or another submitted row would duplicate the relationship and complicate uniqueness.
- **Rationale:** This matches the existing data and needs no new schema. The service rejects duplicate assignments and submissions.
- **Consequences:** There is one review per user/candidate, with no interview-round history.
- **Origin:** Developer (row semantics). Spec/CSV (date format).

## D5. Simulated authentication: a session cookie, resolved in one place

- **Decision:** Choosing a user in the dropdown calls `PUT /api/session`. That checks the user exists and sets an `httpOnly` cookie holding the user's name. Every protected handler calls `getCurrentUser(request)`, which reads only that cookie and returns 401 if it is missing or names an unknown user. Request bodies never carry the acting identity. A test sends a spoofed `userName` in a body and checks it is ignored.
- **Context:** "You shouldn't build actual authentication, but design your app as if Users needed to authenticate."
- **Alternatives:** (a) Send the current user in a header or the body from client state. Simplest, but it puts identity under client control in every request and teaches the wrong shape. (b) JWT or NextAuth. Real complexity, and still fake without credentials.
- **Rationale:** Authorization is written against a resolved server-side identity. Real authentication (a signed session, OIDC, and so on) would replace one function (`src/server/session.ts`) and the login endpoint, and no business rule would change.
- **Consequences:** The cookie is unsigned, so anyone can edit it to become another user. That is acceptable only because authentication is explicitly simulated. `GET /api/users` is public because it stands in for the login screen.
- **Origin:** Developer (mock session/cookie abstraction). Agent (cookie details, 401 semantics).

## D6. Authorization lives in the service layer, and anonymization is done on the server

- **Decision:** `scorecard-service.ts` holds every access rule. Route Handlers only parse input, resolve the user, and call the service. Scorecards returned to a non-manager have `author: null` and `authorRole: null` for everyone except the viewer. Other authors' structured names and roles are omitted from the scorecard records.
- **Context:** Feedback visibility depends on both candidate ownership and submission state.
- **Alternatives:** UI-only hiding would still expose names in network responses; duplicating rules in handlers would make them easier to drift.
- **Rationale:** One service owns the rules and projects the response before JSON serialization.
- **Consequences:** This masks structured author fields, not identifying information a reviewer writes in notes or outside knowledge of the panel.
- **Rules implemented:**
  - A candidate is visible to its hiring manager (`candidates.hiring_manager`, **not** the user's job title) and to its assignees.
  - Only an assignee can submit, and only once.
  - An assignee can read scorecards only after submitting their own, and other authors are anonymized.
  - The hiring manager always sees all submitted scorecards with names, whether or not they submitted one.
  - Someone who is both manager and assignee gets both sets of permissions.
- **Origin:** Spec (rules). Developer (service layer, server-side anonymization).

## D7. 404 for candidates you cannot see, 403 for actions you cannot take

- **Decision:** If a candidate exists but the viewer is neither its manager nor an assignee, every endpoint returns **404**. If the viewer can see the candidate but is not allowed to do something (for example, read scorecards before submitting), the endpoint returns **403**.
- **Context / alternatives:** A uniform 403 would distinguish an existing private candidate from a missing one.
- **Consequences:** Unauthorized and missing names intentionally produce the same error, at the cost of less-specific feedback.
- **Rationale:** Returning 403 for invisible candidates would confirm that a candidate with that name exists. 403 is right when the viewer already knows the candidate exists.
- **Origin:** Agent.

## D8. Assignees do not see the other assignees' names

- **Decision:** `CandidateSummary.assignees` is returned only to the hiring manager. Assignees see "Assigned to you" and their own status.
- **Context:** The homepage screenshot shows "Assigned to you and Priya Shah" on a candidate where the viewer is only an assignee.
- **Alternatives:** Return the screenshot's full roster to everyone. That would make author masking easier to undo.
- **Rationale:** If an assignee can see who else is assigned, anonymizing scorecard authors means little. With two interviewers, the "anonymous" scorecard is obviously the other person's. The spec's explicit anonymization requirement outranks a screenshot detail.
- **Consequences:** This differs slightly from the screenshot. Anonymity is still weak in small panels (an interviewer may simply know who else interviewed), and submission dates could hint at authorship. Those leaks are inherent to the data and are not addressed.
- **Origin:** Agent.

## D9. Testing approach

- **Decision:** There are two independent Vitest projects.
  - `server` calls the real Route Handler exports with real `Request` objects (cookies, JSON bodies, route params) against a temp copy of the seed CSVs. It covers HTTP status codes, authorization, validation, and what ends up on disk.
  - `client` renders React components in jsdom with `fetch` stubbed.
  - There is no maintained browser E2E suite. A one-off Chromium smoke walkthrough checks the assembled application.
- **Context:** The agreed plan calls for independent API and component suites with a brief browser smoke check.
- **Consequences:** Mocks cannot prove framework integration; the browser walkthrough covers cookies, real routing and rendering.
- **Alternatives:** (a) Start `next dev` and test over real sockets. Slower, flakier, and it adds process management to the tests. (b) Unit-test the service directly. This would miss cookie, JSON, and status-code behaviour.
- **Rationale:** Calling handlers in-process exercises everything except Next's router, which is framework code. Each test gets a fresh temp data dir via the `DATA_DIR` env var and a `resetRepository()` test seam. The seed data is never mutated.
- **Origin:** Developer (two suites, no E2E). Agent (in-process handler calls, `DATA_DIR` seam).

## D10. One repository instance per process, stored on `globalThis`

- **Decision:** `getRepository()` caches the `CsvRepository` on `globalThis`, not in a module-level variable.
- **Context:** Next.js can evaluate a module more than once (separate route bundles, dev hot reload). Two repository instances would mean two caches, and one route would not see the other's writes.
- **Alternatives / rationale:** A module-level instance is simpler, but can produce separate caches across route bundles. A process global preserves one cache without adding a connection pool or locking layer.
- **Consequences:** This still requires one process; it is not shared across workers. Tests explicitly reset it between temporary data directories.
- **Origin:** Agent.

## D11. Explicit REST and small client components

- **Decision:** Client components call a small typed fetch client. Route Handlers resolve the mock session, parse JSON and call the service. Shared types contain contracts, not server imports.
- **Context:** The developer requested `React → REST → Service → Repository → CSV` and separate frontend/backend testing.
- **Alternatives:** Server Actions or direct server-side data reads would shorten some calls but violate that chosen boundary. A query/state-management library is unnecessary for these few screens.
- **Rationale:** The network and authorization boundary is visible, and each suite can exercise its side independently.
- **Consequences:** Components own loading/error states and refetch after mutations. Switching users unmounts the page while the cookie changes and remounts it for the new identity, deliberately discarding unsaved form state. The selector is disabled during a switch to avoid competing session writes. Candidate detail components are keyed by name to discard stale form state when navigating between candidates.
- **Origin:** Developer (REST architecture and simplicity). Agent (component state and reset behavior).

---

# Specification ambiguities and conflicts

Precedence used: the **written spec** decides behaviour, the **CSV schema** decides storage, and the **screenshots** are visual references only.

## A1. Overall recommendation

1. **Written spec:** Does not mention a recommendation.
2. **Screenshots:** The submit form has an "Overall recommendation" (Strong no / No / Yes / Strong yes), and the scorecards page shows recommendation badges and totals.
3. **CSV:** `scorecards.csv` has no column for it.
4. **Implemented:** It is omitted. The form has the four attribute ratings and notes only.
5. **Why:** "Do not add or modify the columns." Storing it in another field (for example, prefixing `notes`) would corrupt that field's meaning, and making it up would be worse. If the schema could change, an `overall_recommendation` column would be the first thing to add.
- **Origin:** Developer (schema-first).

## A2. Who can assign interviewers

1. **Written spec:** "Users can assign other Users to a Candidate". It does not say which users can assign.
2. **Screenshots:** The **Assign** button appears only on candidates where the viewer is the hiring manager, not on candidates where they are only an assignee.
3. **Ambiguity:** Read literally, any user could assign anyone to any candidate.
4. **Implemented:** Any user who can access the candidate (manager or assignee) can assign existing users. Unrelated users receive 404. Both candidate lists expose Assign.
5. **Why:** This follows the developer's explicit pre-implementation instruction and the broader written requirement. The screenshot's manager-only button is a visual reference, not an authorization rule. The initial implementation narrowed this to managers; it was corrected with an API regression test.
- **Consequences:** Assignees can expand candidate access. Only managers receive an assignee roster; others select from all users and may receive a duplicate-assignment error. That error can reveal whether a known user is assigned, so this is author masking, not strong anonymity. Restrict assignment to managers only if the product requirement changes.
- **Origin:** Developer (access-based assignment policy). Agent (UI and duplicate-feedback behavior).

## A3. Can the hiring manager assign themselves?

1. **Written spec:** "assign *other* Users", but the spec also implies a user can be both manager and assignee.
2. **Implemented:** Allowed. A hiring manager often interviews too, and this is the only way the "manager and assignee" case can come about through the UI.
- **Origin:** Agent.

## A4. Validation rules the spec does not define

- **Candidate:** `name` and `role` are required, and leading and trailing whitespace is trimmed. Names must be unique case-insensitively, because names are the keys (D3). `hiring_manager` is always the current user. A value in the request body is ignored.
- **Assignment:** The target must be an existing user. A duplicate assignment returns 409.
- **Scorecard:** All four ratings are required and must be one of `Developing`, `Solid`, `Strong`, `Exceptional`. That vocabulary comes from the screenshot and is consistent with the CSV values. `notes` is optional free text, trimmed, and may contain commas, quotes, or newlines. `submitted` is set by the server to today's date (`YYYY-MM-DD`, server time zone). The client cannot backdate it.
- **Origin:** Agent (specific rules). Developer (rating vocabulary must match the existing data).

## A5. Scorecard editing and deletion

Not requested, so not implemented. A submitted scorecard is final, and a second submission returns 409.
