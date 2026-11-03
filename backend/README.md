# Adetutu & Victor – Wedding API (Node + Express + Prisma + SQL Server)

## Setup
```bash
cd backend
npm install
cp .env.example .env        # fill in DATABASE_URL and the two secrets
npx prisma migrate deploy   # applies prisma/migrations to SQL Server
npm run seed                # creates the admin from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
npm run dev                 # http://localhost:4000
```
Local SQL Server via Docker:
`docker run -e ACCEPT_EULA=Y -e MSSQL_SA_PASSWORD='Your_Strong!Pass1' -p 1433:1433 -d mcr.microsoft.com/mssql/server:2022-latest`
then create an empty `wedding` database.

Point the frontend at the API (Vite dev proxy `/api` → `http://localhost:4000`, or same-origin behind a reverse proxy) and always send `credentials: "include"`.

## Security design
- Codes: `crypto.randomInt`, format `AV27-XXXX-XXXX`, unique index; inputs normalised; one generic error for invalid/used/revoked/malformed; 10 attempts / 15 min / IP.
- Verify creates a short-lived session (random token, only a keyed HMAC hash stored). The code is **not** consumed until RSVP succeeds.
- RSVP runs in one transaction: conditional `UPDATE` of the session (unconsumed + unexpired), conditional `UPDATE` of the code (`UNUSED`→`USED`), then `INSERT Guest`. `Guest.invitationCodeId` is UNIQUE as a final backstop. Any failure rolls everything back.
- Admin: bcrypt (cost 12), JWT in HttpOnly cookie (Secure + SameSite=Strict in production), login rate-limited, admin re-checked in DB per request.
- CSRF: SameSite cookies + strict Origin allow-list + JSON-only bodies. Set `CLIENT_ORIGINS` to your real frontend origin(s).
- Helmet, body size limits, zod validation, CSV formula-injection escaping, no internal errors leaked.

## Deployment
Set `NODE_ENV=production`, `TRUST_PROXY=1` behind a proxy, HTTPS, strong secrets, `CLIENT_ORIGINS`. `npm run build && npm run migrate:deploy && npm start`.
Admin cookies are scoped to `/api/admin`; the frontend and API should share a site (e.g. `example.com` and `api.example.com`) for SameSite to work.

## Endpoints
Public: `POST /api/invitations/verify`, `GET /api/invitations/session`, `POST /api/guests/rsvp`.
Admin: `POST /api/admin/login|logout`, `GET /api/admin/me`, `POST|GET /api/admin/invitation-codes`, `PATCH /api/admin/invitation-codes/:id/revoke`, `GET /api/admin/guests[?search&status&sort&page&pageSize]`, `GET /api/admin/guests/export`, `GET /api/admin/guests/:id`.

## Tests
`npm test` runs the lifecycle + concurrency test against the database in `DATABASE_URL` (use a throwaway database).

## Deploying on Render
`render.yaml` (repo root) defines a Node web service for the API and a static site for the frontend.
The frontend calls the API directly using `VITE_API_URL`, and the API uses `COOKIE_SAMESITE=none` for cross-site cookies.
1. Push the repo to GitHub/GitLab, then in Render: **New → Blueprint** and select it.
2. If your API service ends up with a different URL than `https://wedding-api.onrender.com`, edit the `/api/*` rewrite in `render.yaml` (or in the static site's *Redirects/Rewrites* settings).
3. On `wedding-api` set `DATABASE_URL` and `CLIENT_ORIGINS` (the static site's `https://...onrender.com` URL). Your SQL Server must accept connections from Render.
4. Migrations run automatically on each start (`prisma migrate deploy`). Seed the admin once from your machine with `npm run seed`, pointed at the same database.
