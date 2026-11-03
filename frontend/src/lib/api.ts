// Empty in local dev (Vite proxies /api). In production set VITE_API_URL to the API origin,
// e.g. https://wedding-api.onrender.com (no trailing slash, no /api).
const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/+$/, "");
export const apiUrl = (path: string) => `${API_BASE}/api${path}`;

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
  try {
    res = await fetch(apiUrl(path), {
      method: options.method ?? "GET",
      credentials: "include",
      headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
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
    throw new ApiError(res.status, data.message ?? "Something went wrong. Please try again.", data.fieldErrors);
  }
  if ((res.headers.get("content-type") ?? "").includes("application/json")) return (await res.json()) as T;
  return undefined as T;
}
