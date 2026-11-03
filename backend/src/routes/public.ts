import { Router, type Request } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db.js";
import { config } from "../config.js";
import { AttendanceStatus, CapGeleInterest, CodeStatus, INVITATION_COOKIE, MAX_ATTENDEES } from "../lib/constants.js";
import { normalizeCode } from "../lib/codes.js";
import { hashToken, newSessionToken } from "../lib/tokens.js";
import { HttpError, strip } from "../lib/http.js";
import { rsvpLimiter, verifyLimiter } from "../middleware/security.js";

export const publicRouter = Router();

const INVALID = "That invitation code could not be verified. Please check it and try again.";
const SESSION_INVALID = "Your invitation session has expired. Please enter your access code again.";

function invitationCookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProd || config.COOKIE_SAMESITE === "none",
    sameSite: (config.COOKIE_SAMESITE === "auto" ? "lax" : config.COOKIE_SAMESITE === "strict" ? "lax" : config.COOKIE_SAMESITE) as "lax" | "none",
    path: "/api",
    maxAge: config.INVITATION_SESSION_MINUTES * 60 * 1000,
  };
}

/** Looks up a live (unconsumed, unexpired) session for the request's cookie, or null. */
async function findLiveSession(req: Request) {
  const token = req.cookies?.[INVITATION_COOKIE];
  if (typeof token !== "string" || token.length < 20 || token.length > 100) return null;
  const session = await prisma.invitationSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { invitationCode: { select: { status: true } } },
  });
  if (!session || session.consumedAt || session.expiresAt <= new Date()) return null;
  if (session.invitationCode.status !== CodeStatus.UNUSED) return null;
  return session;
}

// POST /api/invitations/verify
publicRouter.post("/invitations/verify", verifyLimiter, async (req, res) => {
  const body = z.object({ code: z.string().max(64) }).safeParse(req.body);
  const candidates = body.success ? normalizeCode(body.data.code) : null;
  // Same status + message for malformed / unknown / used / revoked codes (no enumeration).
  if (!candidates) throw new HttpError(400, INVALID);

  const code = await prisma.invitationCode.findFirst({ where: { code: { in: candidates } } });
  if (!code || code.status !== CodeStatus.UNUSED) throw new HttpError(400, INVALID);

  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + config.INVITATION_SESSION_MINUTES * 60 * 1000);
  await prisma.$transaction([
    // Only one live session per code: drop earlier unconsumed ones.
    prisma.invitationSession.deleteMany({ where: { invitationCodeId: code.id, consumedAt: null } }),
    prisma.invitationSession.create({ data: { tokenHash: hashToken(token), invitationCodeId: code.id, expiresAt } }),
  ]);

  res.cookie(INVITATION_COOKIE, token, invitationCookieOptions());
  res.json({ ok: true, expiresAt });
});

// GET /api/invitations/session
publicRouter.get("/invitations/session", async (req, res) => {
  const session = await findLiveSession(req);
  if (!session) {
    res.clearCookie(INVITATION_COOKIE, { ...invitationCookieOptions(), maxAge: undefined });
    throw new HttpError(401, SESSION_INVALID);
  }
  res.json({ ok: true, expiresAt: session.expiresAt });
});

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((v) => (v ? strip(v) : ""))
    .transform((v) => (v === "" ? null : v));

const rsvpSchema = z
  .object({
    fullName: z.string().transform(strip).pipe(z.string().min(2, "Please enter your full name.").max(120)),
    phoneNumber: z
      .string()
      .transform(strip)
      .pipe(z.string().regex(/^\+?[0-9 ()\-]{7,20}$/, "Please enter a valid phone number.")),
    email: z
      .string()
      .max(255)
      .optional()
      .transform((v) => (v ? strip(v) : ""))
      .pipe(z.union([z.literal(""), z.string().email("Please enter a valid email.")]))
      .transform((v) => (v === "" ? null : v)),
    numberOfGuests: z.coerce.number().int().min(1).max(MAX_ATTENDEES).optional(),
    numberOfAttendees: z.coerce.number().int().min(1).max(MAX_ATTENDEES).optional(),
    attendanceStatus: z.enum([AttendanceStatus.ATTENDING, AttendanceStatus.NOT_ATTENDING]),
    capGeleInterest: z.enum([CapGeleInterest.NONE, CapGeleInterest.CAP, CapGeleInterest.GELE]).default(CapGeleInterest.NONE),
    dietaryRequirements: optionalText(500),
    specialMessage: optionalText(2000),
  })
  .strict();

// POST /api/guests/rsvp
publicRouter.post("/guests/rsvp", rsvpLimiter, async (req, res) => {
  const parsed = rsvpSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = Object.fromEntries(parsed.error.issues.map((i) => [i.path.join("."), i.message]));
    throw new HttpError(400, "Please check the highlighted fields.", JSON.stringify(errors));
  }
  const d = parsed.data;
  const attending = d.attendanceStatus === AttendanceStatus.ATTENDING;
  // Each invitation is for exactly one guest; ignore any client-supplied count.
  const attendees = attending ? 1 : 0;

  const session = await findLiveSession(req);
  if (!session) throw new HttpError(401, SESSION_INVALID);

  try {
    await prisma.$transaction(async (tx) => {
      const now = new Date();
      // Conditional updates are atomic: if two requests race, only one sees count === 1.
      const sess = await tx.invitationSession.updateMany({
        where: { id: session.id, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (sess.count !== 1) throw new HttpError(401, SESSION_INVALID);

      const code = await tx.invitationCode.updateMany({
        where: { id: session.invitationCodeId, status: CodeStatus.UNUSED },
        data: { status: CodeStatus.USED, redeemedAt: now },
      });
      if (code.count !== 1) throw new HttpError(409, "This invitation has already been used or is no longer valid.");

      await tx.guest.create({
        data: {
          fullName: d.fullName,
          phoneNumber: d.phoneNumber,
          email: d.email,
          numberOfAttendees: attendees,
          attendanceStatus: d.attendanceStatus,
          capGeleInterest: attending ? d.capGeleInterest : CapGeleInterest.NONE,
          dietaryRequirements: attending ? d.dietaryRequirements : null,
          specialMessage: d.specialMessage,
          invitationCodeId: session.invitationCodeId,
        },
      });
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError(409, "This invitation has already been used or is no longer valid.");
    }
    throw e;
  }

  res.clearCookie(INVITATION_COOKIE, { ...invitationCookieOptions(), maxAge: undefined });
  res.status(201).json({ ok: true, attendanceStatus: d.attendanceStatus });
});
