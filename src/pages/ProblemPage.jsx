import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import Editor from "@monaco-editor/react";
import confetti from "canvas-confetti";
import { CloudOff, Lightbulb, Play, RotateCcw } from "lucide-react";
import { Button, Kbd } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import SplitPane from "@/components/SplitPane";
import ResultSheet from "@/components/ResultSheet";
import VerdictBadge from "@/components/VerdictBadge";
import { DifficultyChip } from "@/pages/Problems";
import NotFound from "@/pages/NotFound";
import { useProblems } from "@/lib/problems";
import { submitSolution } from "@/lib/judge";
import { useSubmissions } from "@/lib/store";
import { openAuth, refreshMe, useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import { cn, timeAgo } from "@/lib/utils";

const LANGS = [["js", "JavaScript", "javascript"], ["python", "Python", "python"], ["cpp", "C++", "cpp"]];
const LABEL = Object.fromEntries(LANGS.map(([id, label]) => [id, label]));
const draftKey = (id, lang) => `verdikt:draft:${id}:${lang}`;

function defineThemes(monaco) {
  monaco.editor.defineTheme("verdikt-dark", {
    base: "vs-dark", inherit: true, rules: [],
    colors: {
      "editor.background": "#111114", "editorGutter.background": "#111114", "editor.lineHighlightBackground": "#ffffff08",
      "editorLineNumber.foreground": "#4a4a54", "editorLineNumber.activeForeground": "#9c9ca6",
      "editor.selectionBackground": "#7c5cff40", "editorCursor.foreground": "#9b7bff",
    },
  });
  monaco.editor.defineTheme("verdikt-light", {
    base: "vs", inherit: true, rules: [],
    colors: {
      "editor.background": "#ffffff", "editorGutter.background": "#ffffff", "editor.lineHighlightBackground": "#00000006",
      "editorLineNumber.foreground": "#a0a0aa", "editor.selectionBackground": "#6a48f030", "editorCursor.foreground": "#6a48f0",
    },
  });
}

// Renders `code` spans from backticks in problem text.
const Inline = ({ text }) => text.split("`").map((part, i) =>
  i % 2 ? <code key={i} className="rounded bg-panel2 px-1.5 py-0.5 font-mono text-[13px] text-fg">{part}</code> : part);

const Label = ({ children }) => <h3 className="mb-2 mt-6 text-xs font-medium uppercase tracking-wider text-fg3">{children}</h3>;
const Pre = ({ children }) => <pre className="whitespace-pre-wrap rounded-lg border border-line bg-panel p-3 font-mono text-[13px] leading-relaxed">{children}</pre>;

function Statement({ problem, subs, user, onLoad }) {
  const [tab, setTab] = useState("desc");
  const tabs = [["desc", "Description"], ["subs", subs.length ? `Submissions (${subs.length})` : "Submissions"]];
  return (
    <section className="p-7">
      <Link to="/problems" className="mb-4 inline-block text-sm text-fg3 transition hover:text-fg">← Problems</Link>
      <h1 className="mb-3 text-[22px] font-semibold tracking-[-0.03em]">{problem.title}</h1>
      <div className="flex items-center gap-3"><DifficultyChip level={problem.difficulty} /><span className="text-xs text-fg3">Time limit {problem.timeLimitMs / 1000}s</span></div>
      <div className="mb-5 mt-6 flex gap-1 border-b border-line">
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={cn("relative px-3 pb-2.5 pt-1 text-sm transition-colors", tab === k ? "text-fg" : "text-fg3 hover:text-fg2")}>
            {label}
            {tab === k && <motion.span layoutId="tab-underline" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent" />}
          </button>
        ))}
      </div>
      {tab === "desc" ? (
        <>
          <p className="leading-relaxed text-fg2"><Inline text={problem.description} /></p>
          <Label>Input</Label><p className="text-fg2"><Inline text={problem.inputFormat} /></p>
          <Label>Output</Label><p className="text-fg2"><Inline text={problem.outputFormat} /></p>
          <Label>Examples</Label>
          <div className="space-y-3">
            {problem.examples.map((e, i) => (
              <div key={i} className="grid gap-3 sm:grid-cols-2">
                <div><div className="mb-1 text-xs text-fg3">Input</div><Pre>{e.input}</Pre></div>
                <div><div className="mb-1 text-xs text-fg3">Output</div><Pre>{e.output}</Pre></div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-1.5">{problem.tags.map((t) => <span key={t} className="rounded-md border border-line px-2 text-xs text-fg2">{t}</span>)}</div>
        </>
      ) : subs.length ? (
        <div className="overflow-hidden rounded-xl border border-line bg-panel">
          {subs.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-0">
              <VerdictBadge verdict={s.verdict} />
              <span className="font-mono text-xs text-fg2">{s.passed}/{s.total} · {s.runtimeMs} ms{s.memoryMb ? ` · ${s.memoryMb} MB` : ""}</span>
              <span className="text-xs text-fg3">{LABEL[s.language] ?? ""}</span>
              <span className="ml-auto text-xs text-fg3">{timeAgo(s.at)}</span>
              <button onClick={() => onLoad(s)} className="rounded-md border border-line px-2 py-0.5 text-xs text-fg2 transition hover:border-line2 hover:text-fg">Load code</button>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-line px-5 py-12 text-center text-fg2">
          <b className="mb-1 block font-semibold text-fg">No submissions yet</b>
          {user ? "Your first verdict will show up here." : <>Log in to save your submissions. <button onClick={() => openAuth("login")} className="text-accent2 hover:underline">Log in</button></>}
        </div>
      )}
    </section>
  );
}

function Workspace({ problem }) {
  const theme = useTheme();
  const { user } = useAuth();
  const subs = useSubmissions().filter((s) => s.problemId === problem.id);
  const [lang, setLang] = useState(() => localStorage.getItem("verdikt:lang") || "js");
  const [code, setCode] = useState(() => localStorage.getItem(draftKey(problem.id, lang)) ?? problem.starters[lang]);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(null); // "run" | "submit" | null
  const [pos, setPos] = useState({ line: 1, col: 1 });
  const submitRef = useRef();

  const save = (v) => { try { localStorage.setItem(draftKey(problem.id, lang), v); } catch { /* ignore */ } };
  const changeLang = (l) => {
    setLang(l);
    try { localStorage.setItem("verdikt:lang", l); } catch { /* ignore */ }
    setCode(localStorage.getItem(draftKey(problem.id, l)) ?? problem.starters[l]);
    setResult(null);
  };

  const go = async (mode) => {
    if (busy) return;
    if (mode === "submit" && !user) { openAuth("login", "Log in to submit solutions and track your progress."); return; }
    setBusy(mode);
    setResult({ pending: true, verdict: "PD", cases: [] });
    try {
      const res = await submitSolution({ problemId: problem.id, language: lang, code, mode });
      setResult(res);
      if (mode === "submit") {
        refreshMe(); // the server saved it; reload solved problems and history
        if (res.verdict === "AC") confetti({ particleCount: 120, spread: 75, origin: { y: 0.7 }, colors: ["#3DD68C", "#7C5CFF", "#F5B544", "#9B7BFF"] });
      }
    } catch (e) {
      if (e.code === "login_required") { setResult(null); openAuth("login", e.message); }
      else setResult({ system: true, message: e.message });
    } finally {
      setBusy(null);
    }
  };
  submitRef.current = () => go("submit"); // latest closure for the Monaco shortcut

  const loadSubmission = async (s) => {
    try {
      const { language, code: src } = await api.submissionCode(s.id);
      try { localStorage.setItem("verdikt:lang", language); localStorage.setItem(draftKey(problem.id, language), src); } catch { /* ignore */ }
      setLang(language); setCode(src); setResult(null);
    } catch (e) { setResult({ system: true, title: "Couldn't load that submission", message: e.message }); }
  };
  const onChange = (v) => { setCode(v ?? ""); save(v ?? ""); };
  const setAll = (v) => { setCode(v); save(v); setResult(null); };
  const solution = problem.solutions?.[lang];

  const editor = (
    <section className="relative flex h-full flex-col overflow-hidden bg-panel">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-2.5">
        <select value={lang} onChange={(e) => changeLang(e.target.value)} aria-label="Language" className="h-9 rounded-lg border border-line bg-panel2 px-2.5 text-sm outline-none">
          {LANGS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        {solution && <Button variant="ghost" onClick={() => setAll(solution)}><Lightbulb size={15} />Solution</Button>}
        <span className="flex-1" />
        <Button onClick={() => setAll(problem.starters[lang])} title="Reset code" aria-label="Reset code" className="px-2.5"><RotateCcw size={15} /></Button>
        <Button loading={busy === "run"} disabled={!!busy} onClick={() => go("run")}>{busy !== "run" && <Play size={14} />}Run</Button>
        <Button variant="primary" loading={busy === "submit"} disabled={!!busy} onClick={() => go("submit")}>
          {busy === "submit" ? "Judging" : <>Submit <Kbd>Ctrl ↵</Kbd></>}
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        <Editor
          language={LANGS.find(([id]) => id === lang)[2]} theme={theme === "dark" ? "verdikt-dark" : "verdikt-light"} value={code} onChange={onChange} beforeMount={defineThemes}
          onMount={(ed, monaco) => {
            ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => submitRef.current());
            ed.onDidChangeCursorPosition((e) => setPos({ line: e.position.lineNumber, col: e.position.column }));
          }}
          loading={<span className="text-sm text-fg3">Loading editor…</span>}
          options={{ fontFamily: "'JetBrains Mono Variable', monospace", fontSize: 13.5, lineHeight: 22, minimap: { enabled: false },
            padding: { top: 14 }, scrollBeyondLastLine: false, smoothScrolling: true, cursorSmoothCaretAnimation: "on", automaticLayout: true }}
        />
      </div>
      <div className="flex items-center gap-4 border-t border-line px-3 py-1.5 font-mono text-[11px] text-fg3">
        <span>{LABEL[lang]}</span><span>Ln {pos.line}, Col {pos.col}</span><span className="ml-auto">Draft saved</span>
      </div>
      <ResultSheet result={result} onClose={() => setResult(null)} />
    </section>
  );

  return <SplitPane left={<Statement problem={problem} subs={subs} user={user} onLoad={loadSubmission} />} right={editor} />;
}

export default function ProblemPage() {
  const { id } = useParams();
  const { problems, loading, error, reload } = useProblems();
  const problem = problems?.find((p) => p.id === id);
  useEffect(() => { document.title = problem ? `${problem.title} · Verdikt` : "Verdikt"; }, [problem]);

  if (!problems && loading) return <div className="mx-auto max-w-[1040px] space-y-4 px-5 pt-12"><Skeleton className="h-7 w-48" /><Skeleton className="h-4 w-80" /><Skeleton className="h-64 w-full rounded-xl" /></div>;
  if (!problems) return (
    <div className="mx-auto max-w-md px-5 pt-32 text-center text-fg2">
      <CloudOff className="mx-auto mb-3 text-fg3" />
      <b className="mb-1 block font-semibold text-fg">We can't reach the server</b>{error}
      <div className="mt-4"><Button onClick={reload}>Try again</Button></div>
    </div>
  );
  return problem ? <Workspace key={id} problem={problem} /> : <NotFound message="We couldn't find that problem. It may have been renamed." />;
}
