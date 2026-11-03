import { createHmac, randomBytes } from "node:crypto";
import { config } from "../config.js";

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** HMAC (peppered) so a leaked DB cannot be used to forge session cookies. */
export function hashToken(token: string): string {
  return createHmac("sha256", config.SESSION_TOKEN_SECRET).update(token).digest("hex");
}
