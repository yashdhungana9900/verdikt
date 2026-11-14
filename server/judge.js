// The judge: compiles and runs a submission against a problem's tests.
//   docker mode (default): every run is inside a locked-down container (no network,
//                          memory/CPU/process limits, read-only filesystem).
//   local mode (--local):  runs on this machine with NO isolation. Development only.
//
// Docker speed: one container per submission, started while the code compiles, and ONE
// `docker exec` that runs every test (each `docker exec` costs ~0.2-0.5s on Windows).
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { SAMPLE_COUNT } from "./problems.js";

export const config = { mode: "docker", images: { cpp: "gcc:13" } };
export class JudgeUnavailable extends Error {}
export const LANGUAGES = ["js", "python", "cpp"];

const WIN = process.platform === "win32";
const OUT_CAP = 1_000_000; // bytes of stdout kept per test
const ERR_CAP = 4_000;     // bytes of stderr kept per test
const DOCKER_DOWN = "Docker isn't running. Start Docker Desktop and try again.";

// Time limit = problem limit x multiplier (interpreted languages start slower).
function language(id) {
  const local = config.mode === "local";
  const py = local && WIN ? "python" : "python3";
  return {
    js: { file: "main.js", image: "node:20-slim", mult: 2, check: "node --check main.js", localCompile: ["node", "--check", "main.js"], run: () => ["node", "main.js"] },
    python: { file: "main.py", image: "python:3.12-slim", mult: 3, check: `python3 -c "import ast;ast.parse(open('main.py').read())"`, localCompile: [py, "-m", "py_compile", "main.py"], run: () => [py, "main.py"] },
    cpp: { file: "main.cpp", image: config.images.cpp, mult: 1, compile: ["g++", "-O2", "-std=c++17", "-pipe", "-o", "main", "main.cpp"], run: (dir) => [local ? join(dir, WIN ? "main.exe" : "main") : "./main"] },
  }[id];
}

// ---------- process helper ----------
function sh(cmd, args, { input = "", timeoutMs = 60_000, cwd, raw = false, cap = OUT_CAP } = {}) {
  return new Promise((resolve, reject) => {
    const t0 = performance.now();
    const chunks = []; let size = 0, stderr = "", timedOut = false, overflow = false, done = false;
    const child = spawn(cmd, args, { cwd, stdio: ["pipe", "pipe", "pipe"] });
    const finish = (code) => {
      if (done) return; done = true; clearTimeout(timer);
      const buf = Buffer.concat(chunks);
      resolve({ code, ms: performance.now() - t0, stdout: raw ? buf : buf.toString("utf8"), stderr, timedOut, overflow });
    };
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, timeoutMs);
    child.stdout.on("data", (d) => { if (size < cap) { chunks.push(d); size += d.length; } else { overflow = true; child.kill("SIGKILL"); } });
    child.stderr.on("data", (d) => { if (stderr.length < 1_000_000) stderr += d; });
    child.on("error", (e) => { clearTimeout(timer); done = true; reject(e.code === "ENOENT" ? new JudgeUnavailable(cmd === "docker" ? DOCKER_DOWN : `${cmd} isn't installed on this machine.`) : e); });
    child.on("close", (code) => finish(code ?? 137));
    child.stdin.on("error", () => {});
    child.stdin.end(input);
  });
}

const LIMITS = ["--network", "none", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--pids-limit", "128"];
const mount = (dir, ro) => ["--mount", `type=bind,source=${dir},target=/work${ro ? ",readonly" : ""}`, "-w", "/work"];

function dockerFailure(r) {
  const msg = (r.stderr || "").trim();
  if (/daemon|pipe|connect|Is the docker/i.test(msg)) return new JudgeUnavailable(DOCKER_DOWN);
  return new JudgeUnavailable(`The sandbox couldn't start. ${msg.split("\n")[0] || ""}`.trim());
}

// ---------- docker: all tests in one exec ----------
// The script prints, per test: "<token> <i> <exitcode> <ms> <stdout bytes> <stderr bytes>\n"
// followed by the raw stdout and stderr bytes. Length-prefixed, so program output can never
// be confused with our markers. A failed syntax check prints "<token> CE <n>\n" + n bytes.
export function buildBatchScript({ work, tmp, token, count, limitS, cmd, check }) {
  const ids = Array.from({ length: count }, (_, i) => i).join(" ");
  return [
    check ? `${check} 2>${tmp}/ce || { n=$(wc -c < ${tmp}/ce); [ "$n" -gt ${ERR_CAP} ] && n=${ERR_CAP}; echo "${token} CE $n"; head -c $n ${tmp}/ce; exit 0; }` : "",
    `for i in ${ids}; do`,
    `  s=$(date +%s%N)`,
    `  timeout -k 1 ${limitS} ${cmd} < ${work}/in/$i > ${tmp}/o$i 2> ${tmp}/e$i`,
    `  c=$?`,
    `  e=$(date +%s%N)`,
    `  o=$(wc -c < ${tmp}/o$i); r=$(wc -c < ${tmp}/e$i)`,
    `  echo "${token} $i $c $(( (e - s) / 1000000 )) $o $r"`,
    `  [ "$o" -gt ${OUT_CAP} ] && o=${OUT_CAP}; head -c $o ${tmp}/o$i`,
    `  [ "$r" -gt ${ERR_CAP} ] && r=${ERR_CAP}; head -c $r ${tmp}/e$i`,
    `  [ $c -eq 124 ] || [ $c -eq 137 ] && break`,
    `done`,
    `echo "${token} MEM $(cat /sys/fs/cgroup/memory.peak 2>/dev/null || cat /sys/fs/cgroup/memory/memory.max_usage_in_bytes 2>/dev/null || echo 0)"`,
  ].filter(Boolean).join("\n");
}

export function parseBatch(buf, token) {
  const results = []; let ce = null, mem = null, pos = 0;
  while (pos < buf.length) {
    const nl = buf.indexOf(10, pos);
    if (nl < 0) break;
    const parts = buf.toString("utf8", pos, nl).split(" ");
    if (parts[0] !== token) break;
    pos = nl + 1;
    if (parts[1] === "MEM") { mem = Number(parts[2]); break; }
    if (parts[1] === "CE") { ce = buf.toString("utf8", pos, pos + Number(parts[2])); break; }
    const [code, ms, osz, esz] = parts.slice(2).map(Number);
    const n = Math.min(osz, OUT_CAP), m = Math.min(esz, ERR_CAP);
    const stdout = buf.toString("utf8", pos, pos + n); pos += n;
    const stderr = buf.toString("utf8", pos, pos + m); pos += m;
    results.push({ code, ms, stdout, stderr, timedOut: code === 124, overflow: osz > OUT_CAP });
  }
  return { results, ce, mem: mem > 0 ? Math.round((mem / 1048576) * 10) / 10 : null };
}

async function runDocker(ctx, L, dir, tests, limit) {
  await mkdir(join(dir, "in"));
  await Promise.all(tests.map((t, i) => writeFile(join(dir, "in", String(i)), t.input + "\n")));

  // Start the run container now; it boots while the code compiles.
  const name = `verdikt-run-${randomUUID().slice(0, 8)}`;
  const started = sh("docker", ["run", "-d", "--rm", "--name", name, ...LIMITS, "--memory", "256m", "--memory-swap", "256m", "--cpus", "1",
    "--read-only", "--tmpfs", "/tmp:size=64m", ...mount(dir, true), L.image, "sleep", "600"], { timeoutMs: 600_000 });
  started.catch(() => {}); // handled when awaited below
  ctx.closers.push(async () => { await started.catch(() => {}); await sh("docker", ["rm", "-f", name], { timeoutMs: 15_000 }).catch(() => {}); });

  if (L.compile) { // C++ is compiled in its own throwaway container (more memory, writable /work)
    const c = await sh("docker", ["run", "--rm", ...LIMITS, "--memory", "1g", "--cpus", "2", ...mount(dir, false), L.image, "timeout", "30", ...L.compile], { timeoutMs: 120_000 });
    if ([125, 126, 127].includes(c.code)) throw dockerFailure(c);
    if (c.code !== 0) return { ce: c.stderr || c.stdout || "Compilation timed out." };
  }
  const s = await started;
  if (s.code !== 0) throw dockerFailure(s);

  const token = "VK" + randomUUID().replaceAll("-", "").slice(0, 12);
  const script = buildBatchScript({ work: "/work", tmp: "/tmp", token, count: tests.length, limitS: (limit / 1000).toFixed(2), cmd: L.run(dir).join(" "), check: L.check });
  const r = await sh("docker", ["exec", "-i", name, "sh", "-c", script], { raw: true, cap: tests.length * (OUT_CAP + ERR_CAP + 200) + 4096, timeoutMs: limit * tests.length + 20_000 });
  const parsed = parseBatch(r.stdout, token);
  if (!parsed.ce && parsed.mem === null && !parsed.results.length) throw new JudgeUnavailable("The sandbox stopped unexpectedly. Please try again.");
  return { results: parsed.results, ce: parsed.ce, mem: parsed.mem };
}

// ---------- local (development only) ----------
async function runLocal(L, dir, tests, limit) {
  const compile = L.compile ?? L.localCompile;
  const c = await sh(compile[0], compile.slice(1), { cwd: dir, timeoutMs: 30_000 });
  if (c.code !== 0 || c.timedOut) return { ce: c.stderr || c.stdout || "Compilation timed out." };
  const [cmd, ...args] = L.run(dir);
  const results = [];
  for (const t of tests) {
    const r = await sh(cmd, args, { cwd: dir, input: t.input + "\n", timeoutMs: limit });
    results.push(r);
    if (r.timedOut) break;
  }
  return { results, ce: null, mem: null };
}

// ---------- verdicts ----------
const norm = (s) => s.replace(/\r/g, "").split("\n").map((l) => l.trimEnd()).join("\n").trimEnd();
const clip = (s, n = 500) => (s.length > n ? s.slice(0, n) + "…" : s);
const tidy = (s, dir) => s.split(dir).join(".").split("/work/").join("").split("\n").slice(0, 12).join("\n").trim();

export async function judge({ problem, language: langId, code, mode }) {
  if (langId === "cpp") await refreshImages();
  const L = language(langId);
  const dir = await mkdtemp(join(tmpdir(), "verdikt-"));
  const ctx = { closers: [] };
  try {
    await writeFile(join(dir, L.file), code);
    const tests = mode === "run" ? problem.tests.slice(0, SAMPLE_COUNT) : problem.tests;
    const limit = problem.timeLimitMs * L.mult;
    const out = config.mode === "local" ? await runLocal(L, dir, tests, limit) : await runDocker(ctx, L, dir, tests, limit);
    if (out.ce) return { verdict: "CE", error: clip(tidy(out.ce, dir), 1500), cases: [], total: tests.length, runtimeMs: 0, memoryMb: null };

    const cases = out.results.map((r, i) => {
      const t = tests[i], sample = i < SAMPLE_COUNT;
      let status = "AC", error;
      if (r.timedOut || (r.code === 137 && r.ms >= limit - 50)) status = "TLE";
      else if (r.overflow) { status = "RE"; error = "Output limit exceeded."; }
      else if (r.code !== 0) { status = "RE"; error = r.code === 137 ? "The program was killed (likely out of memory)." : clip(tidy(r.stderr, dir), 600) || `Exited with code ${r.code}.`; }
      else if (norm(r.stdout) !== norm(t.output)) status = "WA";
      const c = { status, ms: Math.round(r.ms), sample, ...(error ? { error } : {}) };
      if (sample) Object.assign(c, { input: t.input, expected: t.output, output: clip(r.stdout) });
      return c;
    });
    const first = cases.find((c) => c.status !== "AC");
    return { verdict: first ? first.status : "AC", cases, total: tests.length, runtimeMs: Math.max(0, ...cases.map((c) => c.ms)), memoryMb: out.mem };
  } finally {
    // Clean up after replying, so the user isn't kept waiting for `docker rm`.
    (async () => {
      for (const close of ctx.closers) await close().catch(() => {});
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    })();
  }
}

// ---------- housekeeping ----------
export async function dockerReady() {
  try { return (await sh("docker", ["info"], { timeoutMs: 8000 })).code === 0; } catch { return false; }
}
// Use the precompiled-header C++ image when it has been built (`npm run judge:pull`).
let lastCheck = 0;
export async function refreshImages() {
  if (config.mode === "local" || Date.now() - lastCheck < 30_000) return;
  lastCheck = Date.now();
  try {
    const r = await sh("docker", ["image", "inspect", "verdikt-cpp"], { timeoutMs: 8000 });
    config.images.cpp = r.code === 0 ? "verdikt-cpp" : "gcc:13";
  } catch { /* docker unavailable; judge() will report it */ }
}
export async function removeStaleContainers() {
  try {
    const r = await sh("docker", ["ps", "-aq", "--filter", "name=verdikt-run-"], { timeoutMs: 8000 });
    const ids = r.stdout.split(/\s+/).filter(Boolean);
    if (ids.length) await sh("docker", ["rm", "-f", ...ids], { timeoutMs: 15_000 });
  } catch { /* docker not available */ }
}

// Only a few submissions run at once so the machine isn't overwhelmed.
const MAX_PARALLEL = 2;
let active = 0;
const waiting = [];
export const queueStats = () => ({ active, waiting: waiting.length });
export function enqueue(job) {
  return new Promise((resolve, reject) => {
    const run = async () => {
      active++;
      try { resolve(await job()); } catch (e) { reject(e); } finally { active--; waiting.shift()?.(); }
    };
    active < MAX_PARALLEL ? run() : waiting.push(run);
  });
}
