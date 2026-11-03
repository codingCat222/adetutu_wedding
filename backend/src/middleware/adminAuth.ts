import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { ADMIN_COOKIE } from "../lib/constants.js";
import { prisma } from "../db.js";

export function signAdminToken(adminId: string): string {
  return jwt.sign({ sub: adminId, typ: "admin" }, config.ADMIN_JWT_SECRET, {
    expiresIn: `${Math.round(config.ADMIN_SESSION_HOURS * 3600)}s`,
    algorithm: "HS256",
  });
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProd,
    sameSite: (config.isProd ? "strict" : "lax") as "strict" | "lax",
    path: "/api/admin",
    maxAge: config.ADMIN_SESSION_HOURS * 3600 * 1000,
  };
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[ADMIN_COOKIE];
  if (!token) return res.status(401).json({ message: "Authentication required." });
  try {
    const payload = jwt.verify(token, config.ADMIN_JWT_SECRET, { algorithms: ["HS256"] }) as jwt.JwtPayload;
    if (payload.typ !== "admin" || !payload.sub) throw new Error("bad token");
    // Re-check the admin still exists so deleted admins lose access immediately.
    const admin = await prisma.admin.findUnique({ where: { id: payload.sub }, select: { id: true, email: true } });
    if (!admin) throw new Error("no admin");
    res.locals.admin = admin;
    next();
  } catch {
    res.status(401).json({ message: "Authentication required." });
  }
}
