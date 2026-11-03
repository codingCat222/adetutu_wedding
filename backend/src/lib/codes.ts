import { randomInt } from "node:crypto";

// No 0/O/1/I/L to avoid transcription mistakes. 31^8 ≈ 8.5e11 combinations.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const PREFIX = "AV27";
const LEGACY_PREFIX = "AV"; // codes generated before the AV27 rename still redeem

export function generateCode(): string {
  const chars = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `${PREFIX}-${chars.slice(0, 4)}-${chars.slice(4)}`;
}

const fmt = (prefix: string, body: string) => `${prefix}-${body.slice(0, 4)}-${body.slice(4)}`;

/**
 * Normalises user input (case, spaces, dashes, apostrophes) and returns the stored-format
 * candidates to look up (current AV27 format first, then the legacy AV format), or null if malformed.
 */
export function normalizeCode(input: string): string[] | null {
  const s = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const candidates: string[] = [];
  for (const prefix of [PREFIX, LEGACY_PREFIX]) {
    if (!s.startsWith(prefix)) continue;
    const body = s.slice(prefix.length);
    if (body.length === 8 && [...body].every((c) => ALPHABET.includes(c))) candidates.push(fmt(prefix, body));
  }
  return candidates.length ? candidates : null;
}
