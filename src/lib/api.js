export class ApiError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

const OFFLINE = "Can't reach the Verdikt server. Make sure it's running (npm run dev), then try again.";

async function request(path, options) {
  let res;
  try { res = await fetch(path, options); } catch { throw new ApiError("offline", OFFLINE); }
  let body = null;
  try { body = await res.json(); } catch { /* not JSON */ }
  if (!res.ok) throw new ApiError(body?.error ?? "error", body?.message ?? (res.status >= 500 ? OFFLINE : `Something went wrong (${res.status}).`));
  return body;
}

const post = (body) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });

export const api = {
  problems: () => request("/api/problems"),
  submit: (payload) => request("/api/submissions", post(payload)),
  me: () => request("/api/me"),
  mySubmissions: () => request("/api/me/submissions"),
  submissionCode: (id) => request(`/api/me/submissions/${id}`),
  signup: (body) => request("/api/auth/signup", post(body)),
  login: (body) => request("/api/auth/login", post(body)),
  logout: () => request("/api/auth/logout", post()),
  contest: () => request("/api/contest"),
};
