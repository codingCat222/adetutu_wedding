// Empty in local dev (Vite proxies /api). In production set VITE_API_URL to the API origin,
// e.g. https://adetutu-wedding-1.onrender.com (no trailing slash, no /api).
const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/+$/, "");
export const apiUrl = (path: string) => `${API_BASE}/api${path}`;

const ADMIN_TOKEN_KEY = "av27_admin_token";
const INVITE_TOKEN_KEY = "av27_invitation_token";

export function setAdminToken(token: string | null) {
  try {
    if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
    else localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setInvitationToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(INVITE_TOKEN_KEY, token);
    else sessionStorage.removeItem(INVITE_TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function getInvitationToken(): string | null {
  try {
    return sessionStorage.getItem(INVITE_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const adminToken = getAdminToken();
  const inviteToken = getInvitationToken();
  if (adminToken) headers["Authorization"] = `Bearer ${adminToken}`;
  if (inviteToken) headers["X-Invitation-Token"] = inviteToken;
  return headers;
}

export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;
  constructor(status: number, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export async function api<T = unknown>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  const headers: Record<string, string> = {
    ...authHeaders(),
    ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
  };
  try {
    res = await fetch(apiUrl(path), {
      method: options.method ?? "GET",
      credentials: "include",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Please check your connection and try again.");
  }
  if (!res.ok) {
    let data: { message?: string; fieldErrors?: Record<string, string> } = {};
    try {
      data = await res.json();
    } catch {
      /* non-JSON error */
    }
    if (res.status === 401 && path.startsWith("/admin") && path !== "/admin/login") {
      setAdminToken(null);
    }
    if (res.status === 401 && (path === "/invitations/session" || path === "/guests/rsvp")) {
      setInvitationToken(null);
    }
    throw new ApiError(res.status, data.message ?? "Something went wrong. Please try again.", data.fieldErrors);
  }
  if ((res.headers.get("content-type") ?? "").includes("application/json")) {
    const json = (await res.json()) as Record<string, unknown>;
    if (path === "/admin/login" && typeof json.token === "string") {
      setAdminToken(json.token);
    } else if (path === "/admin/logout") {
      setAdminToken(null);
    } else if (path === "/invitations/verify" && typeof json.sessionToken === "string") {
      setInvitationToken(json.sessionToken);
    } else if (path === "/guests/rsvp") {
      setInvitationToken(null);
    }
    return json as T;
  }
  return undefined as T;
}
