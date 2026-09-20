/**
 * Vercel serverless entrypoint for the REST API.
 *
 * server/index.ts is the long-running entrypoint: it calls server.listen() and
 * mounts Vite in development. Neither is valid in a serverless function, so
 * this module builds the same Express app and exports a handler.
 *
 * Routes are registered once per cold start, behind a memoised promise, because
 * registerRoutes is async and top-level await is not available under this
 * tsconfig target.
 *
 * Known limitation: registerRoutes() also creates a WebSocketServer bound to an
 * http.Server that is never listened on here. REST endpoints work; the /ws
 * realtime channel used by chat and live tracking does not run in a serverless
 * function and needs either Vercel's WebSocket support or a long-running host.
 */
import express from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { registerRoutes } from "../server/routes";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Required for secure session cookies behind Vercel's proxy.
app.set("trust proxy", 1);

let initialised: Promise<void> | null = null;

function ensureInitialised(): Promise<void> {
  if (!initialised) {
    initialised = registerRoutes(app).then(() => {
      app.use(
        (
          err: Error,
          _req: express.Request,
          res: express.Response,
          _next: express.NextFunction,
        ) => {
          console.error("Unhandled error:", err);
          res.status(500).json({
            error: "Server error",
            message:
              process.env.NODE_ENV === "production"
                ? "An unexpected error occurred"
                : err.message,
          });
        },
      );
    });
  }

  return initialised;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  await ensureInitialised();
  return app(req as express.Request, res as express.Response);
}
