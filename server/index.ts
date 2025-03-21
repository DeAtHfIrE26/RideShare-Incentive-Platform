import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import dotenv from 'dotenv';
import { db } from "./db";
import { sql } from "drizzle-orm";

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Health check endpoint
  app.get("/health", (req, res) => {
    try {
      // Check database connection
      db.execute(sql`SELECT 1`).then(() => {
        res.status(200).json({
          status: "healthy",
          database: "connected",
          version: process.env.npm_package_version || "unknown",
          environment: process.env.NODE_ENV || "development"
        });
      }).catch(err => {
        console.error("Health check database error:", err);
        res.status(500).json({
          status: "unhealthy",
          database: "disconnected",
          error: "Database connection failed"
        });
      });
    } catch (err) {
      console.error("Health check error:", err);
      res.status(500).json({ 
        status: "unhealthy",
        error: "Internal server error" 
      });
    }
  });

  // Global error handler
  app.use((err: Error, req: any, res: any, next: any) => {
    console.error("Unhandled error:", err);
    res.status(500).json({
      error: "Server error",
      message: process.env.NODE_ENV === "production" 
        ? "An unexpected error occurred" 
        : err.message
    });
  });
  
  // Handle uncaught exceptions and unhandled rejections
  process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err);
    // In production, you might want to attempt a graceful shutdown
    if (process.env.NODE_ENV === "production") {
      console.error("Uncaught exception, shutting down gracefully");
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    }
  });
  
  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen(port, () => {
    log(`serving on port ${port}`);
  });
})();
