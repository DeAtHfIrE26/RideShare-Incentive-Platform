import { insertUserSchema, type User as SchemaUser } from "@shared/schema";
import bcrypt from "bcryptjs";
import { type Express, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "./storage";

// Safer interface that doesn't strictly require the safety fields that might be missing in the DB
interface User extends Omit<SchemaUser, 'identityVerified' | 'safetyPreferences' | 'emergencyContactId'> {
  identityVerified?: boolean;
  safetyPreferences?: any;
  emergencyContactId?: number;
}

declare global {
  namespace Express {
    interface User extends SchemaUser {}
  }
}

/**
 * Strips the password hash before a user object crosses the network.
 *
 * req.user carries the full row because deserializeUser loads it from the
 * database. Returning it verbatim shipped the bcrypt hash to the client on
 * every register, login and session check.
 */
function toPublicUser<T extends { password?: string }>(user: T): Omit<T, "password"> {
  const { password: _password, ...publicUser } = user;
  return publicUser;
}

/**
 * Throttles credential endpoints. Note for serverless: the default store is
 * per-instance memory, so limits apply per warm lambda rather than globally.
 * It raises the cost of online guessing but is not a substitute for an
 * edge/WAF rule or a shared store when running on Vercel.
 */
function limitFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const credentialsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: limitFromEnv("AUTH_RATE_LIMIT", 10),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: "Too many attempts. Please try again later." },
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: limitFromEnv("REGISTRATION_RATE_LIMIT", 10),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many accounts created. Please try again later." },
});

async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function comparePasswords(supplied: string, stored: string) {
  return bcrypt.compare(supplied, stored);
}

export function setupAuth(app: Express) {
  const isProduction = process.env.NODE_ENV === "production";

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      httpOnly: true,
      // Only force Secure in production; local development runs over plain
      // HTTP and would otherwise never receive the cookie.
      secure: isProduction,
      // lax stops the cookie riding along on cross-site form posts, which is
      // the CSRF vector that matters for these endpoints.
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        console.error("Authentication error:", error);
        return done(error as Error);
      }
    }),
  );

  passport.serializeUser((user: Express.User, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      console.error("Deserialize user error:", error);
      done(error as Error, null);
    }
  });

  app.post("/api/register", registrationLimiter, async (req, res, next) => {
    // insertUserSchema was defined but never applied here, so email format and
    // field types went unchecked and req.body was spread straight into the
    // insert. Parsing first also stops unexpected columns being set.
    const parsed = insertUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid registration details",
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    try {
      const existingUser = await storage.getUserByUsername(parsed.data.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser({
        ...parsed.data,
        password: await hashPassword(parsed.data.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(toPublicUser(user));
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Server error during registration" });
    }
  });

  app.post("/api/login", credentialsLimiter, (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: Express.User | false, _info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      req.login(user, (err) => {
        if (err) return next(err);
        return res.json(toPublicUser(user));
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err: Error | null) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Error during logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req: Request, res: Response) => {
    if (req.user) {
      res.json(toPublicUser(req.user));
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });
}
