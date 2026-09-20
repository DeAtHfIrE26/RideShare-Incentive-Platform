# RideShare Incentive Platform

A carpooling application with a rewards system: users offer and book rides,
earn reward points, exchange messages, and use a set of safety features
(trusted contacts, ride verification codes, location sharing, safety zones).

> **Note on provenance.** The client entrypoint, `client/src/lib/` and
> `client/src/pages/` were missing from every commit in this repository's
> history and were not recoverable from git. They have been reimplemented
> against the surviving contracts (the components, hooks and API that were
> committed). They are not the original author's UI code.

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

Both attempt a live connection. With placeholder values from `.env.example`
they emit a large WebSocket `ErrorEvent` dump before reporting unhealthy;
that is the driver failing to reach the host, not a configuration error in
the scripts themselves.

Build and run in production mode:

```bash
npm run build             # vite build + esbuild server bundle -> dist/
npm start                 # node dist/index.js, serves API and client on :5000
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

This currently reports 0 errors.

## Known limitations

These are pre-existing defects, not consequences of repository cleanup. They
were verified by running the commands above against a clean clone.

1. **Part of the client was reconstructed, not recovered.** `main.tsx`, all of
   `client/src/lib/` (`utils`, `queryClient`, `protected-route`, `auth-fetch`,
   `ws`) and all nine page components in `client/src/pages/` never existed in
   any commit. They are new implementations matching how the surviving code
   calls them, not the original UI. If the original files resurface they should
   be preferred.

2. **The `/ws` realtime channel does not work in a serverless deployment.**
   `server/routes.ts` attaches a `WebSocketServer` to the HTTP server. Under
   `npm start` on a long-running host this works normally. In the Vercel
   serverless handler (`api/index.ts`) the WebSocket server is constructed but
   never listened on, so chat delivery and live ride tracking fall back to
   whatever polling the components do. See `docs/DEPLOYMENT.md`.

3. **The migration chain is incomplete.** `migrations/` contains `0001`, `0005`
   and `0006`; `0002` through `0004` are absent. `server/migrate.ts` hardcodes
   only `0001`. The schema cannot be reproduced from this repository alone;
   `npm run db:push` derives it from `shared/schema.ts` instead.

4. **One pre-existing type error was fixed to get a clean typecheck.**
   `RealTimeTracking.tsx:229` passed `variant="success"` to `Badge`, which
   never defined that variant. The variant was added to `Badge` rather than
   changing the call site, preserving the intent of showing a completed ride
   in a success style.

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
