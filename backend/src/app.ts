import express, { type NextFunction, type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config.js";
import { HttpError } from "./lib/http.js";
import { csrfGuard } from "./middleware/security.js";
import { publicRouter } from "./routes/public.js";
import { adminRouter } from "./routes/admin.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  if (config.TRUST_PROXY) app.set("trust proxy", config.TRUST_PROXY);

  app.use(helmet());
  app.use(cors({ origin: config.clientOrigins, credentials: true }));
  app.use(express.json({ limit: "6mb" }));
  app.use(cookieParser());
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use("/api", csrfGuard);

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/admin", adminRouter);
  app.use("/api", publicRouter);

  app.use("/api", (_req, res) => res.status(404).json({ message: "Not found." }));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      let fieldErrors: unknown;
      if (err.code) try { fieldErrors = JSON.parse(err.code); } catch { /* not field errors */ }
      return res.status(err.status).json({ message: err.message, ...(fieldErrors ? { fieldErrors } : {}) });
    }
    if (typeof err === "object" && err && "type" in err && (err as { type: string }).type === "entity.parse.failed") {
      return res.status(400).json({ message: "Malformed request." });
    }
    console.error(err); // never leak internals to the client
    res.status(500).json({ message: "Something went wrong. Please try again." });
  });

  return app;
}
