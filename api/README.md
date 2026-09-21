# Generated serverless bundle

`api/index.js` is **generated output**, not source. It is produced by
`npm run build` from `server/serverless.ts` via esbuild.

It is committed because Vercel enumerates the `api/` directory from the git
clone to discover Serverless Functions, and does so *before* `buildCommand`
runs. A bundle generated only at build time is never detected: doing that
produced a 404 on every `/api` route.

The committed copy therefore exists so the function is discovered. Its contents
are overwritten by `npm run build`, which Vercel runs on every deployment, so
the deployed bundle is always rebuilt from current source and the committed
copy cannot go stale in a way that reaches production.

Do not edit `api/index.js` by hand. Edit `server/serverless.ts` and rebuild.
