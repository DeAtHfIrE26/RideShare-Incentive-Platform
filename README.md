# RideShare Incentive Platform

A carpooling application with a rewards system: users offer and book rides,
earn reward points, exchange messages, and use a set of safety features
(trusted contacts, ride verification codes, location sharing, safety zones).

> **Status: this repository does not currently build.** Part of the client
> source tree is missing from version control — see
> [Known limitations](#known-limitations) before attempting setup. The
> instructions below are accurate for the code that is present, but
> `npm run build` and `npm run dev` will fail until the missing files are
> restored.

## Architecture

Single Node process serving both the API and the client.

- **Server** — Express 4 (`server/index.ts`). Registers ~29 REST endpoints
  under `/api` (`server/routes.ts`) and a WebSocket server on `/ws` used for
  chat and live ride tracking. In development it mounts Vite as middleware; in
  production it serves the prebuilt client from `dist/public`.
- **Database** — PostgreSQL accessed through Drizzle ORM using the
  `@neondatabase/serverless` driver over WebSockets. Schema and Zod validators
  live in `shared/schema.ts` and are shared by client and server. Ten tables:
  `users`, `rides`, `bookings`, `rewards`, `messages`, `reviews`,
  `safety_alerts`, `trusted_contacts`, `safety_zones`, `ride_verifications`.
- **Auth** — Passport local strategy with bcrypt password hashing
  (`server/auth.ts`). Sessions are stored in Postgres via `connect-pg-simple`.
- **Client** — React 18 + TypeScript, built by Vite from `client/`. Routing
  with `wouter`, server state with TanStack Query, UI from shadcn components
  on Radix primitives, styled with Tailwind. Theme variables are generated
  from `theme.json` at build time.

Path aliases: `@/*` → `client/src/*`, `@shared/*` → `shared/*`.

## Prerequisites

- Node.js 20 or later. Development and verification of this document were done
  on Node 22.22.2 / npm 10.9.7. There is no `engines` field in `package.json`,
  so this is a recommendation rather than an enforced constraint.
- A PostgreSQL database. The code paths assume a Neon-compatible endpoint
  because the driver connects over WebSockets; a plain Postgres server may
  require swapping the driver.

## Setup

```bash
git clone https://github.com/DeAtHfIrE26/RideShare-Incentive-Platform
cd RideShare-Incentive-Platform
npm install
cp .env.example .env    # then fill in real values
```

Apply the schema:

```bash
npm run db:push         # drizzle-kit push, uses drizzle.config.ts
```

Run the SQL migration that `server/migrate.ts` applies:

```bash
npm run migrate
```

Verify database connectivity:

```bash
node test-db.mjs
npm run healthcheck     # also asserts DATABASE_URL and SESSION_SECRET are set
```

Start the dev server:

```bash
npm run dev             # tsx watch on server/index.ts, Vite middleware, port 5000
```

The port is hardcoded to `5000` in `server/index.ts` and is not configurable
via environment variable.

## Environment variables

See `.env.example`. Three variables are read anywhere in the codebase:

| Variable | Used by | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `server/db.ts`, `server/migrate.ts`, `drizzle.config.ts` | Postgres connection string |
| `SESSION_SECRET` | `server/auth.ts` | Signs express-session cookies |
| `NODE_ENV` | `server/index.ts`, `server/db.ts` | Selects dev middleware and DB error behaviour |

## Tests

There are none. The repository contains no test files, no test runner
dependency, and no `test` script. `tsconfig.json` excludes `**/*.test.ts`,
which suggests tests were intended but never committed.

The only available static check is:

```bash
npm run check           # tsc, no emit
```

This currently reports 63 errors — see below.

## Known limitations

These are pre-existing defects, not consequences of repository cleanup. They
were verified by running the commands above against a clean clone.

1. **The client entrypoint and roughly a third of the client source are absent
   from git.** `client/index.html` loads `/src/main.tsx`, which has never been
   committed in any commit. Also missing: the entire `client/src/lib/`
   directory (`utils`, `queryClient`, `protected-route`, `auth-fetch`, `ws`)
   and the entire `client/src/pages/` directory (all nine page components
   imported by `client/src/App.tsx`). 44 of the 64 committed client files
   import `@/lib/utils`, so very little compiles.

   Consequence: `npm run build` fails with
   `Rollup failed to resolve import "/src/main.tsx"`, and `npm run check`
   reports 63 errors, most of them `TS2307 Cannot find module`. Only the
   owner's local working copy has these files; they must be committed before
   the project can build.

2. **`npm start` cannot work even once the build is fixed.** `build` runs only
   `vite build`, which emits the client to `dist/public`. `start` runs
   `node dist/index.js`, which nothing produces — the server-bundling step is
   missing from the build script. `esbuild` is present as an unused
   devDependency, suggesting such a step was removed.

3. **The migration chain is incomplete.** `migrations/` contains `0001`, `0005`
   and `0006`; `0002` through `0004` are absent. `server/migrate.ts` hardcodes
   only `0001`. The schema cannot be reproduced from this repository alone;
   `npm run db:push` derives it from `shared/schema.ts` instead.

4. **Two of the 63 type errors are not missing-module errors.**
   `client/src/components/safety/RealTimeTracking.tsx:229` passes a
   `"success"` variant to `Badge`, which only accepts `default`,
   `destructive`, `outline` and `secondary` — a real mismatch that will
   survive restoring the missing files.
   `client/src/components/notifications/notification-list.tsx:54` has an
   implicit-`any` parameter that is most likely downstream of the missing
   `@/lib/ws` module and may resolve on its own once that file is restored.

5. **Deployment target.** The WebSocket server rules out a standard Vercel
   serverless deployment for the backend. See `docs/DEPLOYMENT.md`.

## Security note

A MongoDB Atlas connection URI containing a username and password was
committed to this repository in `b9f390f` (2025-03-21) inside
`attached_assets/`, and the repository has been public since that date. The
file has been removed from the working tree, but the credential remains in git
history until history is rewritten. See `docs/DEPLOYMENT.md` for the rewrite
procedure and the rotation requirement.

Scan the repository with:

```bash
gitleaks detect --source . --config .gitleaks.toml --log-opts="--all" --redact -v
```

The bundled `.gitleaks.toml` adds database connection-URI rules. Upstream
gitleaks has no MongoDB rule and does not detect the URI above with its
default configuration.

## License

MIT (per `package.json`). No LICENSE file is committed.
