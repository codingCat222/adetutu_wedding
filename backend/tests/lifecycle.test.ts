import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { config } from "../src/config.js";

const origin = config.clientOrigins[0]!;
const app = createApp();
const email = `test-${Date.now()}@example.com`;
const password = "Test-Password-12345";

const rsvp = { fullName: "Ada Lovelace", phoneNumber: "+2348012345678", numberOfGuests: 2, attendanceStatus: "ATTENDING" };

async function newGuestSession(code: string) {
  const res = await request(app).post("/api/invitations/verify").set("Origin", origin).send({ code });
  return { res, cookie: res.headers["set-cookie"] as unknown as string[] | undefined };
}

describe("invitation lifecycle", () => {
  const admin = request.agent(app);

  beforeAll(async () => {
    await prisma.admin.create({ data: { email, passwordHash: await bcrypt.hash(password, 4) } });
    await admin.post("/api/admin/login").set("Origin", origin).send({ email, password }).expect(200);
  });
  afterAll(async () => {
    await prisma.admin.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it("rejects unauthenticated admin access", async () => {
    await request(app).get("/api/admin/guests").expect(401);
  });

  it("blocks cross-origin state changes", async () => {
    await request(app).post("/api/invitations/verify").set("Origin", "https://evil.example").send({ code: "x" }).expect(403);
  });

  it("runs the full lifecycle and prevents reuse", async () => {
    const gen = await admin.post("/api/admin/invitation-codes").set("Origin", origin).send({ count: 1 }).expect(201);
    const { id, code } = gen.body.codes[0];

    const { res, cookie } = await newGuestSession(code.toLowerCase());
    expect(res.status).toBe(200);
    expect((await prisma.invitationCode.findUnique({ where: { id } }))?.status).toBe("UNUSED"); // not consumed by verify

    await request(app).get("/api/invitations/session").set("Cookie", cookie!).expect(200);
    await request(app).post("/api/guests/rsvp").set("Origin", origin).set("Cookie", cookie!).send(rsvp).expect(201);
    expect((await prisma.invitationCode.findUnique({ where: { id } }))?.status).toBe("USED");

    // reuse: same session, and fresh verify, both fail with the generic message
    await request(app).post("/api/guests/rsvp").set("Origin", origin).set("Cookie", cookie!).send(rsvp).expect(401);
    const again = await newGuestSession(code);
    expect(again.res.status).toBe(400);

    const list = await admin.get("/api/admin/guests?search=Ada").expect(200);
    const guest = list.body.items.find((g: { phoneNumber: string; id: string }) => g.phoneNumber === rsvp.phoneNumber);
    expect(guest).toBeTruthy();
    const detail = await admin.get(`/api/admin/guests/${guest.id}`).expect(200);
    expect(detail.body.guest.invitationCode).toBe(code);
    await admin.get("/api/admin/guests/export").expect(200).expect("Content-Type", /csv/);
  });

  it("gives identical errors for unknown and revoked codes", async () => {
    const gen = await admin.post("/api/admin/invitation-codes").set("Origin", origin).send({ count: 1 }).expect(201);
    const { id, code } = gen.body.codes[0];
    await admin.patch(`/api/admin/invitation-codes/${id}/revoke`).set("Origin", origin).expect(200);
    const revoked = await newGuestSession(code);
    const unknown = await newGuestSession("AV27-ZZZZ-ZZZZ");
    expect(revoked.res.status).toBe(400);
    expect(revoked.res.body).toEqual(unknown.res.body);
  });

  it("allows only one winner among concurrent submissions", async () => {
    const gen = await admin.post("/api/admin/invitation-codes").set("Origin", origin).send({ count: 1 }).expect(201);
    const { id, code } = gen.body.codes[0];
    const { cookie } = await newGuestSession(code);
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        request(app).post("/api/guests/rsvp").set("Origin", origin).set("Cookie", cookie!).send({ ...rsvp, fullName: `Racer ${i}` }),
      ),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(await prisma.guest.count({ where: { invitationCodeId: id } })).toBe(1);
  });
});
