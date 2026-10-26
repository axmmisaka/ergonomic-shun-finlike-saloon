# Implementation handoff

The agreed design is reasonable for a small, single-process take-home. No architectural reversal was needed. Keep its limitations explicit in the interview: simulated identity is not secure authentication, author masking is not a guarantee against inference, and synchronous cached CSV persistence is not a production database.

## What is implemented

- A user dropdown, candidate creation, separate managed/assigned lists, assignment, four-rating scorecard submission and scorecard viewing.
- Server authorization based on candidate ownership and assignment, including combined manager/assignee permissions. Submission updates the existing pending row exactly once.
- Server-side masking of other authors for submitted assignees; managers always see named submitted cards.
- Schema-preserving CSV writes through a process-local cache, using temporary-file replacement and updating memory only after persistence succeeds.
- Independent API/repository and React component suites, setup instructions, decision rationale and a browser smoke walkthrough.

The existing repository and API were retained. The unfinished frontend was completed, and its missing tests were added. The initial manager-only assignment rule was corrected to the agreed access-based rule. User switching now hides actions during session changes. Narrow layouts keep controls usable. Route parameter tests match the installed framework's actual encoded values and protect names containing percent signs and slashes.

## Deliberate omissions

No overall recommendation is invented or squeezed into notes: there is no CSV column for it. No schema change, database, ORM, real authentication, user management, editing/deletion, background persistence, multi-process locking or state-management framework was added. Screenshots guide the visual layout; the written behavior and CSV schema govern conflicts.

## Review path

1. `src/lib/types.ts`: API contracts and the rating vocabulary.
2. `src/server/scorecard-service.ts`: ownership, assignment, submission gating and response masking.
3. `src/server/csv-repository.ts`: copy/persist/swap mutations; `repository.ts` owns the process cache.
4. `src/app/api/`: thin REST handlers; `src/server/session.ts` isolates mock identity.
5. `src/components/` and `src/client/`: UI states and REST calls.
6. [TESTING.md](TESTING.md): each test's purpose, verified results and reproducible browser walkthrough. [DECISIONS.md](DECISIONS.md): origins, alternatives and tradeoffs.

Useful interview points: explain why job title grants no permission; why a pending scorecard is an assignment; why masking in JSX would leak data; why disk writes precede cache updates; and why the small application can use synchronous writes only under its single-process assumption.

All deliverable code, documentation, data and Git history live in `submission/`. Original inputs and personal skill files remain outside that repository. The repository stays local with no remote, as requested. Existing commits were preserved; the continuation is recorded as a coherent working application change.
