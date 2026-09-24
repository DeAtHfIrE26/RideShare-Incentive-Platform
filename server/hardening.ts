import express, { type Express, type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";

/** Largest accepted request body. Well above any legitimate payload here. */
const BODY_LIMIT = "100kb";

/**
 * Security headers and body parsing, shared by the long-running entrypoint
 * (server/index.ts) and the Vercel function (server/serverless.ts) so the two
 * cannot drift apart.
 *
 * On Vercel only /api/* reaches this app; the client HTML and assets are served
 * by Vercel's static layer, so the document-level headers are also declared in
 * vercel.json. Under `npm start` Express serves everything and these apply
 * throughout.
 */
export function applyHardening(app: Express) {
  // Do not advertise the framework.
  app.disable("x-powered-by");

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // The shadcn theme plugin injects a <style> block into index.html,
          // and Tailwind sets inline styles at runtime.
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "blob:"],
          fontSrc: ["'self'", "data:"],
          // Same-origin API plus the /ws channel used by chat and tracking.
          connectSrc: ["'self'", "ws:", "wss:"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      // Vercel terminates TLS and sets HSTS at the edge; leaving helmet's
      // default on is harmless and correct for other hosts.
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(express.json({ limit: BODY_LIMIT }));
  app.use(express.urlencoded({ extended: false, limit: BODY_LIMIT }));

  // express.json throws on malformed JSON and on payloads over the limit.
  // Without this both surfaced as 500s; they are client errors.
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err && typeof err === "object" && "type" in err) {
      const type = (err as { type?: string }).type;

      if (type === "entity.parse.failed") {
        return res.status(400).json({ error: "Malformed JSON in request body" });
      }

      if (type === "entity.too.large") {
        return res
          .status(413)
          .json({ error: `Request body exceeds the ${BODY_LIMIT} limit` });
      }
    }

    return next(err);
  });
}
