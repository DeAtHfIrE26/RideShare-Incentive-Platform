# Deployment and history remediation

Two independent pieces of work: the credential in git history, and Vercel
readiness. The credential is the urgent one.

---

## 1. Credential rotation and history rewrite

### What was exposed

A MongoDB Atlas connection URI with username and password, in
`attached_assets/Pasted--Project-Carpooling-Reward-System-...txt`, line 31.

| | |
| --- | --- |
| Introduced in | `b9f390f` ("Add files via upload", 2025-03-21) |
| Present in | `b9f390f`, `643dae6`, `e1d7473`, `6de6154` |
| Repository visibility | Public since 2025-03-21 |
| Forks at time of audit | 0 |

The file has been deleted from the working tree, but **the blob is still
reachable in history**.

### Rotation is mandatory

Rotate the Atlas database user's password before or alongside the rewrite.
The credential was publicly readable for the entire period the repository has
existed; assume it is compromised. Deleting the file does not undo disclosure.

In the Atlas UI: Database Access → the user → Edit → Edit Password. Also
review Network Access IP allowlist entries and the cluster's access logs for
unrecognised connections.

Note that this project does not use MongoDB at all — it runs on Postgres via
Drizzle. The URI was scaffolding-prompt text, so rotating it should not
affect the application.

### Before rewriting

1. Take a mirror backup:

   ```bash
   git clone --mirror https://github.com/DeAtHfIrE26/RideShare-Incentive-Platform \
     ../RideShare-Incentive-Platform-backup.git
   ```

2. Understand the consequences:
   - **Force-pushing rewritten history breaks every existing clone.** Anyone
     with a local checkout must re-clone; `git pull` will not reconcile it.
   - **Rewriting does not purge GitHub's cached views.** Old commits stay
     reachable by direct SHA URL and through the API until GitHub garbage
     collects them, which is not on a schedule you control. Removing them for
     certain requires contacting GitHub Support, or deleting and recreating
     the repository.
   - With 5 commits and 0 forks, **deleting and recreating the repository is
     the more reliable option** and is worth considering over a rewrite.

### Rewrite command

Using `git-filter-repo` (recommended over BFG; `pip install git-filter-repo`):

```bash
# From a fresh clone, not your working checkout
git clone https://github.com/DeAtHfIrE26/RideShare-Incentive-Platform rewrite-tmp
cd rewrite-tmp

git filter-repo --invert-paths --path attached_assets/

# Verify the credential is gone from every commit
gitleaks detect --source . --config ../RideShare-Incentive-Platform/.gitleaks.toml \
  --log-opts="--all" --redact -v

# filter-repo drops the remote by design; re-add and force-push
git remote add origin https://github.com/DeAtHfIrE26/RideShare-Incentive-Platform
git push origin --force --all
git push origin --force --tags
```

The BFG equivalent, if preferred:

```bash
bfg --delete-folders attached_assets --no-blob-protection RideShare-Incentive-Platform.git
cd RideShare-Incentive-Platform.git
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

Run these yourself after taking the backup. They are not run as part of this
cleanup.

---

## 2. Vercel readiness

### Current state

The build now succeeds and the server bundles. The remaining blocker to a
working deployment is a PostgreSQL database: `server/db.ts` raises at startup
without `DATABASE_URL`, and every authenticated route depends on it. Nothing in
this repository provisions one.

Verified locally from a clean build:

- `npm run build` emits `dist/public` (client) and `dist/index.js` (server)
- `npm start` boots and logs `serving on port 5000`
- `GET /` returns the built client with theme variables injected
- `GET /api/user` returns 401 unauthenticated
- `GET /health` reports `unhealthy` / `database: disconnected` against an
  unreachable database, which is the correct response

### Build settings

| Setting | Value | Confidence |
| --- | --- | --- |
| Install command | `npm install` | verified |
| Build command | `vite build`, pinned in `vercel.json` | verified |
| Output directory | `dist/public` | verified from `vite.config.ts` `build.outDir` |
| Node version | `engines.node >= 20`; the Vercel project is set to 22.x | verified |

`engines.node` is now set to `>=20`.

### The `start` script

Previously broken: `build` emitted only the client while `start` ran
`dist/index.js`, which nothing produced. `build` now runs the esbuild server
bundle as well, and `npm start` boots correctly on any Node host.

### Serverless compatibility

Assessed against the current `server/` code.

| Concern | Status |
| --- | --- |
| **Hardcoded `server.listen(5000)`** | **Blocking.** `server/index.ts:116` binds a port at module scope. Vercel's documented Node pattern exports the server (`export default server`) instead of calling `listen`. This must be restructured. |
| **WebSocket server on `/ws`** | **Not a blocker, but needs restructuring.** Vercel documents WebSocket support for Node functions, including an Express + `ws` example that closely matches `server/routes.ts` (see https://vercel.com/docs/functions/websockets). The example exports the HTTP server rather than calling `listen`. I have **not** verified which Vercel plan this requires, what the per-connection duration cap is, or how it is billed — confirm all three before relying on it. |
| **Sessions** | Fine. `connect-pg-simple` stores sessions in Postgres, not memory, so instances are stateless. `app.set("trust proxy", 1)` is already set, which is correct behind Vercel's proxy. |
| **In-memory state** | Fine. No module-level mutable caches found in `server/`. |
| **Filesystem writes** | Fine at request time. The only writes are `fs.mkdirSync`/`fs.writeFileSync` in `server/migrate.ts`, which is a CLI script run manually, not a request path. Do not invoke it from a function. |
| **Database connections** | Uses `@neondatabase/serverless`, which is designed for this and connects over WebSockets. If moving to Fluid Compute, consider `attachDatabasePool` from `@vercel/functions` for pool lifecycle. |
| **Background jobs** | None found. |
| **CORS / localhost** | No hardcoded localhost origins or CORS config in `server/`. The client uses relative API paths. |

### Realistic options

1. **Restructure for Vercel.** Replace `server.listen()` with a default export
   of the HTTP server, per Vercel's Node WebSocket docs, and add the missing
   server build step. Keeps one deployment target. Requires confirming the
   plan and connection limits for WebSockets.
2. **Split.** Deploy `dist/public` as a static site on Vercel and host the
   Express + WebSocket server on a platform built for long-lived processes
   (Railway, Render, Fly.io). The client would need an API base URL, which it
   does not currently have — it uses relative paths — so this is a code change.
3. **Single non-Vercel host.** Deploy the whole Express process to Railway,
   Render or Fly.io as-is, once the build is fixed. Smallest change, since the
   app is already a conventional long-running Node server.

Option 3 is the least work given the app's current shape. Option 1 is worth it
only if staying on Vercel matters more than the restructuring cost.

### Environment variables to set in the Vercel dashboard

Set for Production, Preview and Development as appropriate:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. Use a pooled Neon endpoint. |
| `SESSION_SECRET` | Random 32-byte hex, e.g. `openssl rand -hex 32`. Use a different value per environment. |
| `NODE_ENV` | Vercel sets `production` automatically on production builds; set explicitly only if you need to override. |

No other variables are read anywhere in the codebase.

### Deploy steps, in order

Do not start until the build succeeds locally.

1. Rotate the Atlas credential and complete the history rewrite (section 1).
2. Commit the missing `client/src/main.tsx`, `client/src/lib/` and
   `client/src/pages/` files.
3. Confirm `npm install && npm run build` succeeds from a clean clone.
4. Add a server build step and fix `npm start`, or pick a non-Vercel host.
5. Pin the Node version via `engines` in `package.json`.
6. Decide between the three options above.
7. Import the repository in Vercel; set build command, output directory and
   the environment variables above.
8. Apply the database schema against the production database
   (`npm run db:push`), then deploy.
9. Verify `/health`, then an authenticated flow, then a WebSocket connection
   to `/ws`.
