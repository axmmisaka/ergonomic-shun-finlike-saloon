# Interview scorecards

A small Next.js + TypeScript app for creating candidates, assigning interviewers, and collecting one scorecard per interviewer. The supplied CSV schemas are unchanged.

## Run

Use Node.js 24 (verified with 24.14.1) and npm. Run these commands from this directory:

```sh
npm ci
npm run dev
```

Open http://localhost:3000 and choose a user in the dropdown. For a production build, run `npm run build` followed by `npm start`.

The default data directory is `./data`, and actions persist there. To explore without modifying those files, copy the three CSVs to a temporary directory and set `DATA_DIR` to its absolute path **before starting the server**. Restart after changing CSVs outside the app. Tests always use temporary copies of the original seeds in `tests/fixtures/`, independently of edits to live `data/`.

A quick tour with the supplied data:

- **Avery Lin:** manages Elena Voss and Noah Patel; can submit for Mina Alvarez and view anonymized scorecards for Chris Adeyemi.
- **Sam Okonkwo:** has a pending scorecard for Noah Patel. Submit it, then switch to Avery to see Sam's named scorecard.
- **Jordan Hale:** manages Mina Alvarez despite having the job title Senior Engineer. Candidate ownership, not job title, grants manager rights.

## Checks

```sh
npm run test:server  # API handlers + real service/repository + temporary CSVs
npm run test:client  # React components with mocked REST responses
npm test            # both suites
npm run typecheck
npm run build
```

See [TESTING.md](docs/TESTING.md) for what each scenario verifies, actual results, and the browser smoke walkthrough.

## Design and scope

`React → REST Route Handlers → service → CSV repository`

Client components import shared contracts and a small fetch client. Authorization and author masking happen on the server. A dropdown sets an unsigned HTTP-only mock-session cookie; this is deliberately **not real authentication**.

Names are persistent keys. Creating a candidate makes the current user its manager. Managers and assignees can assign other existing users; self-assignment is rejected. Another assignee can assign the manager, preserving combined manager/interviewer permissions. An assignment is a pending scorecard row; submitting fills that row once. Managers see named submitted scorecards immediately. Other assignees must submit first and receive other authors as `null`.

Persistence uses an in-memory cache and synchronous, atomic file replacement, updating the cache only after a successful write. Run **one Node process on a persistent writable filesystem**: rewrites are O(N), block the event loop, do not notice external edits, and are not safe across processes. This is unsuitable for ephemeral/serverless storage. No `fsync` power-loss guarantee is claimed.

The screenshot's overall recommendation is omitted because the CSV has no column for it. There is no database, real login, editing/deletion, or user administration. [DECISIONS.md](docs/DECISIONS.md) explains alternatives, assumptions, and screenshot conflicts; [IMPLEMENTATION.md](docs/IMPLEMENTATION.md) provides an implementation overview and code review path.
