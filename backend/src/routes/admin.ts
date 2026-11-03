import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { ADMIN_COOKIE, AttendanceStatus, CodeStatus, MAX_BULK_CODES } from "../lib/constants.js";
import { generateCode } from "../lib/codes.js";
import { toCsv } from "../lib/csv.js";
import { HttpError } from "../lib/http.js";
import { adminCookieOptions, requireAdmin, signAdminToken } from "../middleware/adminAuth.js";
import { loginLimiter } from "../middleware/security.js";

export const adminRouter = Router();

// A valid bcrypt hash used to equalise timing when the email is unknown.
const DUMMY_HASH = "$2a$12$CwTycUXWue0Thq9StjUM0uJ8.9y1qU3o0yQ1q3Y5Vh7p4Qm5y9X2K";

// ---------- Auth ----------
adminRouter.post("/login", loginLimiter, async (req, res) => {
  const body = z.object({ email: z.string().email().max(255), password: z.string().min(1).max(200) }).safeParse(req.body);
  if (!body.success) throw new HttpError(400, "Invalid email or password.");
  const admin = await prisma.admin.findUnique({ where: { email: body.data.email.toLowerCase() } });
  const ok = await bcrypt.compare(body.data.password, admin?.passwordHash ?? DUMMY_HASH);
  if (!admin || !ok) throw new HttpError(401, "Invalid email or password.");
  res.cookie(ADMIN_COOKIE, signAdminToken(admin.id), adminCookieOptions());
  res.json({ admin: { id: admin.id, email: admin.email } });
});

adminRouter.post("/logout", (_req, res) => {
  res.clearCookie(ADMIN_COOKIE, { ...adminCookieOptions(), maxAge: undefined });
  res.json({ ok: true });
});

// Everything below requires an authenticated admin.
adminRouter.use(requireAdmin);

adminRouter.get("/me", (_req, res) => {
  res.json({ admin: res.locals.admin });
});

// ---------- Invitation codes ----------
adminRouter.post("/invitation-codes", async (req, res) => {
  const body = z.object({ count: z.coerce.number().int().min(1).max(MAX_BULK_CODES).default(1) }).safeParse(req.body ?? {});
  if (!body.success) throw new HttpError(400, `Count must be between 1 and ${MAX_BULK_CODES}.`);

  const created: { id: string; code: string; status: string; createdAt: Date }[] = [];
  let attempts = 0;
  while (created.length < body.data.count && attempts++ < 10) {
    const need = body.data.count - created.length;
    const candidates = [...new Set(Array.from({ length: need }, generateCode))];
    // Unique index guarantees no duplicates; skip any collisions and retry.
    for (const code of candidates) {
      try {
        created.push(await prisma.invitationCode.create({ data: { code }, select: { id: true, code: true, status: true, createdAt: true } }));
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
      }
    }
  }
  if (created.length < body.data.count) throw new HttpError(500, "Could not generate unique codes. Please try again.");
  res.status(201).json({ codes: created });
});

adminRouter.get("/invitation-codes", async (req, res) => {
  const q = z
    .object({
      status: z.enum([CodeStatus.UNUSED, CodeStatus.USED, CodeStatus.REVOKED]).optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(200).default(50),
    })
    .safeParse(req.query);
  if (!q.success) throw new HttpError(400, "Invalid query.");
  const where: Prisma.InvitationCodeWhereInput = q.data.status ? { status: q.data.status } : {};
  const [items, total] = await Promise.all([
    prisma.invitationCode.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.data.page - 1) * q.data.pageSize,
      take: q.data.pageSize,
      select: { id: true, code: true, status: true, createdAt: true, redeemedAt: true, revokedAt: true },
    }),
    prisma.invitationCode.count({ where }),
  ]);
  res.json({ items, total, page: q.data.page, pageSize: q.data.pageSize });
});

adminRouter.patch("/invitation-codes/:id/revoke", async (req, res) => {
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) throw new HttpError(404, "Invitation code not found.");
  // Conditional update: only UNUSED codes can be revoked, atomically.
  const result = await prisma.invitationCode.updateMany({
    where: { id: id.data, status: CodeStatus.UNUSED },
    data: { status: CodeStatus.REVOKED, revokedAt: new Date() },
  });
  if (result.count === 0) {
    const exists = await prisma.invitationCode.findUnique({ where: { id: id.data }, select: { id: true } });
    throw new HttpError(exists ? 409 : 404, exists ? "Only unused codes can be revoked." : "Invitation code not found.");
  }
  // Kill any live sessions for the revoked code.
  await prisma.invitationSession.deleteMany({ where: { invitationCodeId: id.data, consumedAt: null } });
  const code = await prisma.invitationCode.findUnique({ where: { id: id.data }, select: { id: true, code: true, status: true, createdAt: true, redeemedAt: true, revokedAt: true } });
  res.json({ code });
});

// ---------- Guests ----------
const guestListQuery = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum([AttendanceStatus.ATTENDING, AttendanceStatus.NOT_ATTENDING]).optional(),
  sort: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

function guestWhere(q: z.infer<typeof guestListQuery>): Prisma.GuestWhereInput {
  return {
    ...(q.status ? { attendanceStatus: q.status } : {}),
    ...(q.search ? { fullName: { contains: q.search } } : {}),
  };
}

const guestSummarySelect = {
  id: true, fullName: true, phoneNumber: true, email: true,
  numberOfAttendees: true, attendanceStatus: true, capGeleInterest: true, createdAt: true,
} satisfies Prisma.GuestSelect;

adminRouter.get("/guests", async (req, res) => {
  const q = guestListQuery.safeParse(req.query);
  if (!q.success) throw new HttpError(400, "Invalid query.");
  const where = guestWhere(q.data);

  const [items, total, totalCodes, unusedCodes, confirmed, declined, attendees, capCount, geleCount] = await Promise.all([
    prisma.guest.findMany({
      where,
      orderBy: { createdAt: q.data.sort },
      skip: (q.data.page - 1) * q.data.pageSize,
      take: q.data.pageSize,
      select: guestSummarySelect,
    }),
    prisma.guest.count({ where }),
    prisma.invitationCode.count(),
    prisma.invitationCode.count({ where: { status: CodeStatus.UNUSED } }),
    prisma.guest.count({ where: { attendanceStatus: AttendanceStatus.ATTENDING } }),
    prisma.guest.count({ where: { attendanceStatus: AttendanceStatus.NOT_ATTENDING } }),
    prisma.guest.aggregate({ where: { attendanceStatus: AttendanceStatus.ATTENDING }, _sum: { numberOfAttendees: true } }),
    prisma.guest.count({ where: { capGeleInterest: "CAP" } }),
    prisma.guest.count({ where: { capGeleInterest: "GELE" } }),
  ]);

  res.json({
    items, total, page: q.data.page, pageSize: q.data.pageSize,
    summary: {
      totalInvitationsGenerated: totalCodes,
      totalConfirmedGuests: confirmed,
      totalDeclined: declined,
      totalExpectedAttendees: attendees._sum.numberOfAttendees ?? 0,
      unusedInvitationCodes: unusedCodes,
      capInterest: capCount,
      geleInterest: geleCount,
    },
  });
});

// Must be registered before "/guests/:id".
adminRouter.get("/guests/export", async (req, res) => {
  const q = guestListQuery.partial({ page: true, pageSize: true }).safeParse(req.query);
  if (!q.success) throw new HttpError(400, "Invalid query.");
  const guests = await prisma.guest.findMany({
    where: guestWhere({ page: 1, pageSize: 1, ...q.data } as z.infer<typeof guestListQuery>),
    orderBy: { createdAt: q.data.sort ?? "desc" },
    include: { invitationCode: { select: { code: true } } },
  });
  const csv = toCsv(
    ["Full Name", "Phone Number", "Email", "Attendees", "RSVP Status", "Cap/Gele Interest", "Dietary Requirements", "Special Message", "Invitation Code", "Submitted At"],
    guests.map((g) => [g.fullName, g.phoneNumber, g.email, g.numberOfAttendees, g.attendanceStatus, g.capGeleInterest, g.dietaryRequirements, g.specialMessage, g.invitationCode.code, g.createdAt.toISOString()]),
  );
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="guests.csv"');
  res.send("\uFEFF" + csv);
});

adminRouter.get("/guests/:id", async (req, res) => {
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) throw new HttpError(404, "Guest not found.");
  const guest = await prisma.guest.findUnique({
    where: { id: id.data },
    include: { invitationCode: { select: { code: true } } },
  });
  if (!guest) throw new HttpError(404, "Guest not found.");
  const { invitationCode, invitationCodeId: _ignored, ...rest } = guest;
  res.json({ guest: { ...rest, invitationCode: invitationCode.code } });
});
