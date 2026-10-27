# Verification

## Automated suites

`npm run test:server`: 19 scenarios. The API tests invoke real Next.js Route Handler exports with `NextRequest` objects, cookies and JSON. They exercise the service and repository with a fresh temporary copy of the three supplied CSVs stored in `tests/fixtures/`, not the mutable application `data/`. They do **not** open a socket or exercise Next.js routing.

| Scenario (`tests/server/api.test.ts`) | What it verifies |
| --- | --- |
| Session identity | Missing/unknown sessions return 401; selecting a known user sets the cookie; users are available to the dropdown. |
| Body identity spoofing | Submission uses the session user even when a different author is supplied in the body. |
| Candidate visibility | Exact visible candidate sets for three users; unrelated direct reads, assignments and submissions return 404. |
| Manager identity | Senior Engineer Jordan manages Mina; another user's Manager job title grants no ownership. |
| Candidate creation | Creator becomes manager despite body spoofing; data persists; duplicate names, blanks and missing roles fail. |
| Dot-segment names | Reject complete `.` and `..` names after trimming, preserve the CSV on rejection, and accept ordinary dotted names. |
| Assignment | Both managers and assignees can assign; one pending row per target; unknown, blank and duplicate targets fail; assignees do not receive a roster. |
| Self-assignment | Both manager and assignee requests targeting the session user return 400 without changing CSV data. |
| Submission | Assignment row is updated, not appended; a second submission and unassigned submissions fail. |
| Before submission | Assigned reviewers cannot read existing feedback yet. |
| After submission | Other authors' names and roles are absent from the response; own card remains identified; no assignee roster leaks. |
| Manager read | Managers see names without submitting; pending rows are excluded. |
| Combined permissions | A manager assigned by another interviewer can read names before submitting and submit once. |
| Validation | Missing/invalid ratings, non-string notes, malformed JSON and unknown candidates fail without altering CSV data. |

Four repository scenarios in `tests/server/csv-repository.test.ts` verify seed loading, recreation after all mutation types (including quoted/multiline notes and unchanged headers), failed rename leaving disk/cache unchanged and cleaning the temporary file, and rejection of schema drift.

One proxy scenario in `tests/server/proxy.test.ts` checks malformed-path rejection and preservation of valid percent-encoded paths. Live HTTP testing also verifies the proxy is invoked before dynamic routing.

`npm run test:client`: 12 scenarios using React Testing Library and jsdom. Workflow tests stub only `fetch`; the components and fetch client run normally. The route tests also stub Next navigation hooks. Tests are independent of backend authorization logic.

| Scenario | What it verifies |
| --- | --- |
| User selection | Candidate lists/actions reflect API flags; switching hides the old page, disables the dropdown while pending, and reloads the new user's data. |
| Creation and assignment | Creation sends the expected body and refreshes the list; assignees have Assign; duplicate-assignment feedback appears beside the form. |
| Scorecard form | All four ratings are required before POST; exact payload includes notes; failed saves retain the form and allow retry. |
| Submitted/anonymous display | Own versus anonymous author labels, date rendering and already-submitted state. |
| Assignment options (two roles) | The current user is absent from the dropdown for both a manager and an assignee, while another user remains selectable. |
| Manager form copy | A manager who is also assigned is told they already have named access, instead of being promised anonymous access after submission. |
| Malformed parameters (two pages) | Render an invalid-URL message and home link without issuing a fetch or throwing a URIError. |
| Read failures | Candidate and scorecard failures show meaningful alerts. |
| Route parameters (two pages) | Both detail pages preserve a name containing `%`, `/` and literal `%20` by decoding the encoded page parameter once before building an API URL. The installed App Router's encoded parameter behavior was verified in the browser; the component tests do not run the router. |

The assignment-policy, user-switching and assignee-action tests were observed failing before their fixes. The route fixture initially assumed decoded page params; the real browser exposed that error. The fixture was corrected to the installed App Router's encoded values, observed failing, and single decoding restored. Other frontend tests cover the inherited implementation; they were not written before that implementation. No coverage-percentage target or browser E2E dependency was added.

## Results (2026-10-26)

- `npm ci --no-audit --no-fund`: **passed** from the committed lockfile.
- `npm run test:server`: **18 passed**.
- `npm run test:client`: **10 passed**.
- `npm test`: **28 passed** across five files.
- `npm run typecheck`: **passed**.
- `npm run build`: **passed**, including all API and candidate page routes.
- Browser smoke: **passed** against `npm start` on port 3100 with Chromium 156.0.8078.47 and temporary CSV copies. A one-off Playwright-driven walkthrough exercised user switching, manager/assignee views, pre-submission denial, assignment by an assignee, validation, submissions, named/anonymous feedback, special-character links and full reloads. Desktop (1280px) and mobile (390px) screenshots were inspected; mobile home/form had no horizontal overflow. No unhandled page errors or HTTP 5xx responses were observed.
- Process restart: **passed** with the same temporary `DATA_DIR`; the new candidate, assignments, submissions and quoted/multiline notes remained available, with the same visibility rules.
- Seed integrity: all three `data/*.csv` files remain **byte-identical** to the supplied originals.

## Reproduce the browser smoke walkthrough

Use a throwaway copy so this walkthrough does not change the supplied examples. From the repository root on a normal local machine:

```sh
smoke_data_dir=$(mktemp -d)
cp tests/fixtures/*.csv "$smoke_data_dir/"
DATA_DIR="$smoke_data_dir" npm run dev
```

1. Open http://localhost:3000. Select Avery. Expect Elena/Noah under Hiring manager and Mina/Chris under Assigned to you. View Elena's named scorecards; return and view Chris's anonymous other author.
2. Select Sam. Noah should be the only candidate. Before submitting, directly opening `/candidates/Noah%20Patel/scorecards` should show the submission-required error.
3. Return home, use Noah's Assign button to assign Priya, and submit Sam's scorecard. First submit without ratings to check validation, then select all four ratings and add notes containing a comma, quote and newline. Expect navigation to the scorecards page and no second-submission form.
4. Select Priya on Noah's scorecards page. Feedback should be inaccessible until Priya submits. Submit as Priya, then verify Sam appears as Interviewer, not by name. Switch to Avery and verify both authors are named.
5. Add a candidate named `Taylor 100% / %20` as Sam. Confirm Sam is its manager and cannot select himself in Assign. Assign Jordan, switch to Jordan and assign Sam, then switch back to Sam and open both its Submit and View links. Confirm both work after a full page reload. Submit and verify the manager keeps named access.
6. Check the home and scorecard form at a narrow viewport. Stop and restart with the same `DATA_DIR` and confirm the new candidate and scorecards remain. Check the browser console for unexpected errors.

Stop the server before removing the temporary directory. Record the browser/version and any failures when repeating the walkthrough.


## External-review follow-up (2026-10-26)

The dot-name API test, both malformed-parameter component cases and the manager-copy case were observed failing before their fixes. Live requests reproduced a malformed-path 500 before the proxy and verified JSON 400 afterward, including API paths. Chromium also verified valid percent/slash names, reload, self-assignment, manager-specific copy and submission through the new proxy. No browser page exceptions were observed during that follow-up. All mutations used a temporary `DATA_DIR`; original CSVs remained unchanged.


## Self-assignment correction (2026-10-27)

The API self-assignment regression and both dropdown regressions were observed failing before the fix. The combined-permissions test now has Jordan assign Avery, preserving manager/interviewer behavior without self-assignment. The original seed copies in `tests/fixtures/` isolate tests from live application data.

Current results: **31 tests passed** (19 server, 12 client); typecheck and production build passed. A targeted browser/HTTP check verifies self-assignment rejection, hidden self options, and a colleague assigning the manager followed by named reads and submission. The earlier 2026-10-26 self-assignment smoke describes superseded behavior. Existing user edits in `data/` are preserved and are not part of this change.
