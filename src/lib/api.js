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

export const api = {
  problems: () => request("/api/problems"),
  submit: (payload) => request("/api/submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
};
