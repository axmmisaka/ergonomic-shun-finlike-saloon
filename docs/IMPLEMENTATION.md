# Implementation overview

A single-process scorecard application with an explicit REST boundary and CSV persistence. Mock identity and structured author masking support the exercise's access rules; they are not production authentication or strong anonymity.

## What is implemented

- A user dropdown, candidate creation, separate managed/assigned lists, assignment, four-rating scorecard submission and scorecard viewing.
- Server authorization based on candidate ownership and assignment, including combined manager/assignee permissions. Submission updates the existing pending row exactly once.
- Server-side masking of other authors for submitted assignees; managers always see named submitted cards.
- Schema-preserving CSV writes through a process-local cache, using temporary-file replacement and updating memory only after persistence succeeds.
- Independent API/repository and React component suites, setup instructions, decision rationale and a browser smoke walkthrough.

## Deliberate omissions

No overall recommendation is invented or squeezed into notes: there is no CSV column for it. No schema change, database, ORM, real authentication, user management, editing/deletion, background persistence, multi-process locking or state-management framework was added. Screenshots guide the visual layout; the written behavior and CSV schema govern conflicts.

## Review path

1. `src/lib/types.ts`: API contracts and the rating vocabulary.
2. `src/server/scorecard-service.ts`: ownership, assignment, submission gating and response masking.
3. `src/server/csv-repository.ts`: copy/persist/swap mutations; `repository.ts` owns the process cache.
4. `src/app/api/`: thin REST handlers; `src/server/session.ts` isolates mock identity.
5. `src/components/` and `src/client/`: UI states and REST calls.
6. [TESTING.md](TESTING.md): each test's purpose, verified results and reproducible browser walkthrough. [DECISIONS.md](DECISIONS.md): origins, alternatives and tradeoffs.

## Source attribution

LLM comments record authorship or edits. Exact model labels are retained where declared by the coding session. Inherited code whose exact model could not be independently verified is marked `model unknown`; source comments are not authenticated provider metadata.
