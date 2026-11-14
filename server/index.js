// Verdikt judge server. Run with `npm run dev` (starts the website and this together).
import http from "node:http";
import { problems, publicProblems } from "./problems.js";
import { config, judge, enqueue, queueStats, dockerReady, removeStaleContainers, refreshImages, JudgeUnavailable, LANGUAGES } from "./judge.js";

const PORT = Number(process.env.PORT) || 3001;
config.mode = process.argv.includes("--local") ? "local" : "docker";
const WITH_SOLUTIONS = process.env.DEV_SOLUTIONS !== "0"; // set DEV_SOLUTIONS=0 in production

const send = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};
const fail = (res, status, error, message) => send(res, status, { error, message });

function readBody(req, limit = 200_000) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > limit) { reject(new Error("too_large")); req.destroy(); } });
    req.on("end", () => { try { resolve(JSON.parse(data || "{}")); } catch { reject(new Error("bad_json")); } });
    req.on("error", reject);
  });
}

// Simple per-IP rate limit (default 30 submissions per minute).
const RATE = Number(process.env.RATE_LIMIT) || 30;
const hits = new Map();
function limited(ip) {
  const now = Date.now(), recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now); hits.set(ip, recent);
  return recent.length > RATE;
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://x");
  try {
    if (req.method === "GET" && pathname === "/api/health") return send(res, 200, { ok: true, mode: config.mode, queue: queueStats() });
    if (req.method === "GET" && pathname === "/api/problems") return send(res, 200, publicProblems({ withSolutions: WITH_SOLUTIONS }));

    if (req.method === "POST" && pathname === "/api/submissions") {
      if (limited(req.socket.remoteAddress)) return fail(res, 429, "slow_down", "You're submitting too fast. Wait a few seconds and try again.");
      const { problemId, language, code, mode } = await readBody(req);
      const problem = problems.find((p) => p.id === problemId);
      if (!problem) return fail(res, 404, "no_problem", "We couldn't find that problem.");
      if (!LANGUAGES.includes(language)) return fail(res, 400, "bad_language", "That language isn't supported yet.");
      if (typeof code !== "string" || !code.trim()) return fail(res, 400, "empty_code", "Write some code first, then submit.");
      if (code.length > 64_000) return fail(res, 413, "too_large", "That solution is too long to judge (64 KB max).");
      const result = await enqueue(() => judge({ problem, language, code, mode: mode === "run" ? "run" : "submit" }));
      return send(res, 200, result);
    }
    fail(res, 404, "not_found", "Nothing here.");
  } catch (e) {
    if (e instanceof JudgeUnavailable) return fail(res, 503, "judge_unavailable", e.message);
    if (e.message === "too_large") return fail(res, 413, "too_large", "That request is too large.");
    if (e.message === "bad_json") return fail(res, 400, "bad_json", "That request couldn't be read.");
    console.error(e);
    fail(res, 500, "server_error", "Something went wrong on our side. Please try again.");
  }
});

server.listen(PORT, async () => {
  console.log(`Verdikt judge listening on http://localhost:${PORT}  (mode: ${config.mode})`);
  if (config.mode === "local") return console.log("  Local mode runs code on this machine WITHOUT isolation. Development only.");
  if (await dockerReady()) { await removeStaleContainers(); await refreshImages(); console.log("  Docker is ready."); }
  else console.log("  Docker isn't running yet. Start Docker Desktop, or use `npm run dev:local`.");
});
