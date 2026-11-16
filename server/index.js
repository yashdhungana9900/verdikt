// Verdikt server. Run with `npm run dev` (starts the website, this server and the database).
import http from "node:http";
import { problems, publicProblems } from "./problems.js";
import { config, judge, enqueue, queueStats, dockerReady, removeStaleContainers, refreshImages, JudgeUnavailable, LANGUAGES } from "./judge.js";
import { query, dbReady, DbUnavailable } from "./db.js";
import { hashPassword, verifyPassword, DUMMY_HASH, startSession, endSession, currentUser, purgeExpiredSessions } from "./auth.js";

const PORT = Number(process.env.PORT) || 3001;
config.mode = process.argv.includes("--local") ? "local" : "docker";
const WITH_SOLUTIONS = process.env.DEV_SOLUTIONS !== "0"; // set DEV_SOLUTIONS=0 in production

const send = (res, status, body) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
const fail = (res, status, error, message) => send(res, status, { error, message });

function readBody(req, limit = 200_000) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > limit) { reject(new Error("too_large")); req.destroy(); } });
    req.on("end", () => { try { resolve(JSON.parse(data || "{}")); } catch { reject(new Error("bad_json")); } });
    req.on("error", reject);
  });
}

// Simple per-IP limiters.
const buckets = new Map();
function limited(name, ip, max) {
  const key = `${name}:${ip}`, now = Date.now(), recent = (buckets.get(key) ?? []).filter((t) => now - t < 60_000);
  recent.push(now); buckets.set(key, recent);
  return recent.length > max;
}
const SUBMIT_RATE = Number(process.env.RATE_LIMIT) || 30;
const AUTH_RATE = Number(process.env.AUTH_RATE_LIMIT) || 10;

const publicUser = (u) => ({ id: u.id, username: u.username, email: u.email });

// ---- weekly contest: Monday 00:00 UTC to the next Monday ----
function contestWindow(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  const end = new Date(start.getTime() + 7 * 86_400_000);
  const number = Math.floor((start - Date.UTC(2026, 0, 5)) / (7 * 86_400_000)) + 1;
  return { start, end, number };
}
// ICPC style: rank by problems solved, then penalty = minutes from the start to each first
// Accepted + 20 minutes for every wrong attempt before it.
const STANDINGS_SQL = `
WITH s AS (SELECT user_id, problem_id, verdict, created_at FROM submissions WHERE created_at >= $1 AND created_at < $2),
ac AS (SELECT user_id, problem_id, MIN(created_at) AS t FROM s WHERE verdict = 'AC' GROUP BY user_id, problem_id),
pen AS (
  SELECT ac.user_id, ac.problem_id,
         ROUND(EXTRACT(EPOCH FROM (ac.t - $1::timestamptz)) / 60)::int
         + 20 * (SELECT COUNT(*) FROM s WHERE s.user_id = ac.user_id AND s.problem_id = ac.problem_id AND s.verdict <> 'AC' AND s.created_at < ac.t)::int AS minutes
  FROM ac)
SELECT u.username, COUNT(pen.problem_id)::int AS solved, COALESCE(SUM(pen.minutes), 0)::int AS penalty
FROM (SELECT DISTINCT user_id FROM s) a
JOIN users u ON u.id = a.user_id
LEFT JOIN pen ON pen.user_id = u.id
GROUP BY u.id, u.username
ORDER BY solved DESC, penalty ASC, u.username ASC
LIMIT 100`;

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://x");
  const ip = req.socket.remoteAddress;
  try {
    if (req.method === "GET" && pathname === "/api/health") return send(res, 200, { ok: true, mode: config.mode, db: await dbReady(), queue: queueStats() });
    if (req.method === "GET" && pathname === "/api/problems") return send(res, 200, publicProblems({ withSolutions: WITH_SOLUTIONS }));

    // ---------- accounts ----------
    if (req.method === "POST" && pathname === "/api/auth/signup") {
      if (limited("auth", ip, AUTH_RATE)) return fail(res, 429, "slow_down", "Too many attempts. Wait a minute and try again.");
      const body = await readBody(req);
      const username = String(body.username ?? "").trim().toLowerCase(), email = String(body.email ?? "").trim().toLowerCase(), password = body.password;
      if (!/^[a-z0-9_]{3,20}$/.test(username)) return fail(res, 400, "bad_username", "Usernames are 3 to 20 characters: letters, numbers and underscores.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return fail(res, 400, "bad_email", "That email address doesn't look right.");
      if (typeof password !== "string" || password.length < 8 || password.length > 200) return fail(res, 400, "bad_password", "Passwords need at least 8 characters.");
      try {
        const r = await query("INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email", [username, email, await hashPassword(password)]);
        await startSession(res, r.rows[0].id);
        return send(res, 201, { user: publicUser(r.rows[0]) });
      } catch (e) {
        if (e.code === "23505") return e.constraint?.includes("email") ? fail(res, 409, "email_taken", "An account with that email already exists. Try logging in.") : fail(res, 409, "username_taken", "That username is taken. Try another one.");
        throw e;
      }
    }
    if (req.method === "POST" && pathname === "/api/auth/login") {
      if (limited("auth", ip, AUTH_RATE)) return fail(res, 429, "slow_down", "Too many attempts. Wait a minute and try again.");
      const body = await readBody(req);
      const id = String(body.identifier ?? "").trim().toLowerCase(), password = typeof body.password === "string" ? body.password.slice(0, 200) : "";
      const r = await query("SELECT id, username, email, password_hash FROM users WHERE email = $1 OR username = $1", [id]);
      const user = r.rows[0];
      const ok = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
      if (!user || !ok) return fail(res, 401, "bad_login", "Wrong email, username or password.");
      await startSession(res, user.id);
      return send(res, 200, { user: publicUser(user) });
    }
    if (req.method === "POST" && pathname === "/api/auth/logout") { await endSession(req, res); return send(res, 200, { ok: true }); }

    if (req.method === "GET" && pathname === "/api/me") {
      let user = null;
      try { user = await currentUser(req); } catch (e) { if (e instanceof DbUnavailable) return send(res, 200, { user: null, dbDown: true }); throw e; }
      if (!user) return send(res, 200, { user: null });
      const solved = await query("SELECT DISTINCT problem_id FROM submissions WHERE user_id = $1 AND verdict = 'AC'", [user.id]);
      return send(res, 200, { user: publicUser(user), solved: solved.rows.map((r) => r.problem_id) });
    }
    if (req.method === "GET" && pathname === "/api/me/submissions") {
      const user = await currentUser(req);
      if (!user) return fail(res, 401, "login_required", "Log in to see your submissions.");
      const r = await query("SELECT id, problem_id, language, verdict, passed, total, runtime_ms, memory_mb, created_at FROM submissions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100", [user.id]);
      return send(res, 200, r.rows.map((x) => ({ id: x.id, problemId: x.problem_id, language: x.language, verdict: x.verdict, passed: x.passed, total: x.total, runtimeMs: x.runtime_ms, memoryMb: x.memory_mb, at: x.created_at })));
    }
    const code = /^\/api\/me\/submissions\/(\d+)$/.exec(pathname);
    if (req.method === "GET" && code) {
      const user = await currentUser(req);
      if (!user) return fail(res, 401, "login_required", "Log in to see your submissions.");
      const r = await query("SELECT language, code FROM submissions WHERE id = $1 AND user_id = $2", [Number(code[1]), user.id]);
      return r.rows[0] ? send(res, 200, r.rows[0]) : fail(res, 404, "not_found", "We couldn't find that submission.");
    }

    // ---------- weekly contest ----------
    if (req.method === "GET" && pathname === "/api/contest") {
      const w = contestWindow();
      const me = await currentUser(req).catch(() => null);
      let standings = [];
      try { standings = (await query(STANDINGS_SQL, [w.start, w.end])).rows; } catch (e) { if (!(e instanceof DbUnavailable)) throw e; }
      return send(res, 200, { name: `Weekly Contest ${w.number}`, startsAt: w.start, endsAt: w.end, now: new Date(), totalProblems: problems.length, you: me?.username ?? null, standings });
    }

    // ---------- judging ----------
    if (req.method === "POST" && pathname === "/api/submissions") {
      if (limited("submit", ip, SUBMIT_RATE)) return fail(res, 429, "slow_down", "You're submitting too fast. Wait a few seconds and try again.");
      const { problemId, language, code: source, mode } = await readBody(req);
      const problem = problems.find((p) => p.id === problemId);
      if (!problem) return fail(res, 404, "no_problem", "We couldn't find that problem.");
      if (!LANGUAGES.includes(language)) return fail(res, 400, "bad_language", "That language isn't supported yet.");
      if (typeof source !== "string" || !source.trim()) return fail(res, 400, "empty_code", "Write some code first, then submit.");
      if (source.length > 64_000) return fail(res, 413, "too_large", "That solution is too long to judge (64 KB max).");
      const submit = mode !== "run"; // "Run" is free for everyone; "Submit" needs an account
      let user = null;
      if (submit) {
        user = await currentUser(req);
        if (!user) return fail(res, 401, "login_required", "Log in to submit solutions and track your progress.");
      }
      const result = await enqueue(() => judge({ problem, language, code: source, mode: submit ? "submit" : "run" }));
      if (submit) {
        try {
          const r = await query(
            "INSERT INTO submissions (user_id, problem_id, language, verdict, passed, total, runtime_ms, memory_mb, code) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id",
            [user.id, problem.id, language, result.verdict, result.cases.filter((c) => c.status === "AC").length, result.total, result.runtimeMs, result.memoryMb, source]);
          result.submissionId = r.rows[0].id;
        } catch (e) { console.error("Couldn't save submission:", e.message); } // never lose the verdict
      }
      return send(res, 200, result);
    }
    fail(res, 404, "not_found", "Nothing here.");
  } catch (e) {
    if (e instanceof JudgeUnavailable) return fail(res, 503, "judge_unavailable", e.message);
    if (e instanceof DbUnavailable) return fail(res, 503, "db_unavailable", e.message);
    if (e.message === "too_large") return fail(res, 413, "too_large", "That request is too large.");
    if (e.message === "bad_json") return fail(res, 400, "bad_json", "That request couldn't be read.");
    console.error(e);
    fail(res, 500, "server_error", "Something went wrong on our side. Please try again.");
  }
});

server.listen(PORT, async () => {
  console.log(`Verdikt server on http://localhost:${PORT}  (judge: ${config.mode})`);
  if (await dbReady()) { console.log("  Database is ready."); purgeExpiredSessions(); setInterval(purgeExpiredSessions, 3_600_000).unref(); }
  else console.log("  Database isn't running yet. Start it with `npm run db:up` (Docker Desktop must be running).");
  if (config.mode === "local") return console.log("  Local judge mode runs code on this machine WITHOUT isolation. Development only.");
  if (await dockerReady()) { await removeStaleContainers(); await refreshImages(); console.log("  Docker is ready."); }
  else console.log("  Docker isn't running yet. Start Docker Desktop, or use `npm run dev:local`.");
});
