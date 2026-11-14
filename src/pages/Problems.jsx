import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, ChevronRight, CloudOff, SearchX } from "lucide-react";
import { useProblems } from "@/lib/problems";
import { DIFFICULTY, tint } from "@/lib/verdicts";
import { useSolved } from "@/lib/store";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const FILTERS = ["All", "Easy", "Medium", "Hard"];
const ROW = "grid grid-cols-[28px_1fr_80px] items-center gap-3 px-4 py-3.5 md:grid-cols-[36px_1fr_200px_90px_80px_20px]";

export const DifficultyChip = ({ level }) => (
  <span style={{ color: `var(--color-${DIFFICULTY[level]})`, background: tint(DIFFICULTY[level]) }} className="w-fit rounded-full px-2.5 py-0.5 text-xs font-medium">{level}</span>
);

function Progress({ solved, problems }) {
  const total = problems.length;
  const done = problems.filter((p) => solved.includes(p.id)).length;
  return (
    <div className="mb-5 mt-6 flex flex-col gap-4 rounded-xl border border-line bg-panel p-5 sm:flex-row sm:items-center sm:gap-8">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-baseline gap-2"><span className="text-2xl font-semibold tracking-[-0.03em]">{done}</span><span className="text-fg2">of {total} solved</span></div>
        <div className="h-1.5 overflow-hidden rounded-full bg-panel2">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-accent to-accent2" initial={{ width: 0 }} animate={{ width: `${(done / total) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
        </div>
      </div>
      <div className="flex gap-6 text-sm">
        {Object.keys(DIFFICULTY).map((d) => {
          const all = problems.filter((p) => p.difficulty === d);
          return (
            <div key={d} className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ background: `var(--color-${DIFFICULTY[d]})` }} />
              <span className="text-fg2">{d}</span>
              <span className="font-mono text-xs text-fg3">{all.filter((p) => solved.includes(p.id)).length}/{all.length}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Problems() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");
  const { problems, loading, error, reload } = useProblems();
  const solved = useSolved();
  useEffect(() => { document.title = "Problems · Verdikt"; }, []);
  const rows = useMemo(
    () => (problems ?? []).filter((p) => (filter === "All" || p.difficulty === filter) && p.title.toLowerCase().includes(q.trim().toLowerCase())),
    [problems, q, filter]
  );

  return (
    <div className="mx-auto max-w-[1040px] px-5 pb-20 pt-10">
      <h1 className="text-[26px] font-semibold tracking-[-0.03em]">Problems</h1>
      <p className="mt-1 text-fg2">Pick one and get a verdict in seconds.</p>
      {problems && <Progress solved={solved} problems={problems} />}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search problems" aria-label="Search problems"
          className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-panel px-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/20 md:max-w-xs md:flex-none" />
        <div className="ml-auto flex gap-1.5">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("h-9 rounded-lg border px-3 text-sm transition", filter === f ? "border-line2 bg-panel2 text-fg" : "border-line text-fg2 hover:border-line2 hover:text-fg")}>{f}</button>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-panel">
        <div className={cn(ROW, "py-2.5 text-xs text-fg3")}>
          <span /><span>Title</span><span className="hidden md:block">Tags</span><span>Difficulty</span><span className="hidden md:block">Acceptance</span><span className="hidden md:block" />
        </div>
        {loading ? Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={cn(ROW, "border-t border-line")}><span /><Skeleton className="h-3 w-3/5" /><Skeleton className="hidden h-3 md:block" /><Skeleton className="h-3" /><Skeleton className="hidden h-3 md:block" /><span className="hidden md:block" /></div>
        )) : error && !problems ? (
          <div className="border-t border-line px-5 py-12 text-center text-fg2">
            <CloudOff className="mx-auto mb-3 text-fg3" />
            <b className="mb-1 block font-semibold text-fg">We can't reach the server</b>
            {error}
            <div className="mt-4"><button onClick={reload} className="h-9 rounded-lg border border-line px-4 text-sm text-fg transition hover:border-line2 hover:bg-panel2">Try again</button></div>
          </div>
        ) : rows.length ? rows.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.25 }}>
            <Link to={`/problems/${p.id}`} className={cn(ROW, "group border-t border-line transition hover:bg-panel2")}>
              <span>{solved.includes(p.id) && <Check size={16} className="text-ok" strokeWidth={2.4} />}</span>
              <span className="font-medium">{p.title}</span>
              <span className="hidden gap-1 md:flex">{p.tags.map((t) => <span key={t} className="rounded-md border border-line px-2 text-xs text-fg2">{t}</span>)}</span>
              <DifficultyChip level={p.difficulty} />
              <span className="hidden text-fg2 md:block">{p.acceptance}</span>
              <ChevronRight size={15} className="hidden text-fg3 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100 md:block" />
            </Link>
          </motion.div>
        )) : (
          <div className="border-t border-line px-5 py-12 text-center text-fg2">
            <SearchX className="mx-auto mb-3 text-fg3" />
            <b className="mb-1 block font-semibold text-fg">Nothing matches "{q}"</b>
            Try a shorter search or clear the difficulty filter.
          </div>
        )}
      </div>
    </div>
  );
}
