import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const TOTAL = 6;
const START = [["maya", 5], ["jonas", 4], ["priya", 4], ["leo", 3], ["sana", 3], ["omar", 2], ["kai", 1]]
  .map(([name, solved], i) => ({ name, solved, penalty: 40 + i * 9 }));
const rank = (a, b) => b.solved - a.solved || a.penalty - b.penalty;
const pad = (n) => String(n).padStart(2, "0");
const hue = (s) => [...s].reduce((a, c) => a + c.charCodeAt(0) * 17, 0) % 360;
const MEDAL = ["text-warn", "text-fg2", "text-err"];

function useCountdown(seconds) {
  const [end] = useState(() => Date.now() + seconds * 1000);
  const [left, setLeft] = useState(seconds);
  useEffect(() => { const t = setInterval(() => setLeft(Math.max(0, Math.round((end - Date.now()) / 1000))), 1000); return () => clearInterval(t); }, [end]);
  return [["Hours", (left / 3600) | 0], ["Minutes", ((left / 60) | 0) % 60], ["Seconds", left % 60]];
}

export default function Contest() {
  const [users, setUsers] = useState(START);
  const [moved, setMoved] = useState(null);
  const clock = useCountdown(84 * 60 + 10);
  useEffect(() => { document.title = "Contest · Verdikt"; }, []);

  // Simulated live updates. Replace with a WebSocket or SSE feed.
  useEffect(() => {
    const t = setInterval(() => {
      setUsers((prev) => {
        const pick = prev[Math.floor(Math.random() * prev.length)];
        if (pick.solved >= TOTAL) return prev;
        setMoved(pick.name);
        return prev.map((u) => (u.name === pick.name ? { ...u, solved: u.solved + 1, penalty: u.penalty + 7 } : u));
      });
    }, 3200);
    return () => clearInterval(t);
  }, []);

  const sorted = [...users].sort(rank);
  return (
    <div className="mx-auto max-w-[1040px] px-5 pb-20 pt-10">
      <div className="mb-1 flex items-center gap-3">
        <h1 className="text-[26px] font-semibold tracking-[-0.03em]">Weekly Contest 42</h1>
        <span className="flex items-center gap-1.5 rounded-full bg-ok/15 px-2.5 py-0.5 text-xs font-medium text-ok"><span className="size-1.5 animate-pulse rounded-full bg-ok" />Live</span>
      </div>
      <p className="text-fg2">{TOTAL} problems · ranked by solved, then penalty</p>
      <div className="mb-7 mt-6 flex gap-3">
        {clock.map(([label, v]) => (
          <div key={label} className="min-w-[88px] rounded-xl border border-line bg-panel px-4 py-3 text-center">
            <div className="text-gradient font-mono text-[34px] font-medium leading-none tracking-[-0.03em]">{pad(v)}</div>
            <div className="mt-1.5 text-[11px] uppercase tracking-wider text-fg3">{label}</div>
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-panel">
        <div className="grid grid-cols-[40px_1fr_auto] gap-3 px-4 py-2.5 text-xs text-fg3"><span>#</span><span>User</span><span className="pr-1">Progress</span></div>
        {sorted.map((u, i) => (
          <motion.div layout key={u.name} transition={{ type: "spring", stiffness: 500, damping: 42 }}
            className={cn("grid grid-cols-[40px_1fr_auto] items-center gap-3 border-t border-line px-4 py-3.5 transition-colors duration-700", moved === u.name && "bg-ok/10")}>
            <b className={cn("font-mono text-sm font-semibold", MEDAL[i] ?? "text-fg3")}>{i + 1}</b>
            <span className="flex items-center gap-2.5 font-medium">
              <span className="grid size-7 place-items-center rounded-full text-[11px] font-semibold text-white" style={{ background: `linear-gradient(135deg,hsl(${hue(u.name)} 70% 58%),hsl(${(hue(u.name) + 50) % 360} 70% 42%))` }}>{u.name[0].toUpperCase()}</span>
              {u.name}
            </span>
            <span className="flex items-center gap-4">
              <span className="hidden gap-1 sm:flex" aria-hidden>
                {Array.from({ length: TOTAL }, (_, k) => <span key={k} className={cn("h-1.5 w-4 rounded-full transition-colors duration-500", k < u.solved ? "bg-ok" : "bg-panel2")} />)}
              </span>
              <span className="w-24 text-right text-sm"><b className="font-semibold">{u.solved}</b><span className="text-fg3"> / {TOTAL}</span> <span className="ml-1 font-mono text-xs text-fg3">{u.penalty}m</span></span>
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
