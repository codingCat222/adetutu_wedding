import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { config } from "../config.js";

/**
 * CSRF defence for cookie-authenticated, state-changing requests:
 *  1. Cookies are SameSite (Lax/Strict) and HttpOnly.
 *  2. The Origin (or Referer) must match an allowed client origin.
 *  3. Bodies must be JSON, which cross-site forms cannot send without a CORS preflight.
 */
export function csrfGuard(req: Request, res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin") ?? (req.get("referer") ? new URL(req.get("referer")!).origin : undefined);
  if (!origin || !config.clientOrigins.includes(origin)) {
    return res.status(403).json({ message: "Request blocked." });
  }
  const hasBody = req.get("content-length") && req.get("content-length") !== "0";
  if (hasBody && !req.is("application/json")) return res.status(415).json({ message: "Unsupported content type." });
  next();
}

export const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many attempts. Please wait a few minutes and try again." },
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: "Too many attempts. Please wait a few minutes and try again." },
});

export const rsvpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again shortly." },
});
