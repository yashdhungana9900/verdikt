import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CloudOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const pad = (n) => String(n).padStart(2, "0");
const hue = (s) => [...s].reduce((a, c) => a + c.charCodeAt(0) * 17, 0) % 360;
const MEDAL = ["text-warn", "text-fg2", "text-err"];
const penalty = (m) => (m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`);

function Countdown({ endsAt, now }) {
  const offset = new Date(now) - Date.now(); // trust the server's clock, not the visitor's
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  const left = Math.max(0, Math.round((new Date(endsAt) - (Date.now() + offset)) / 1000));
  const parts = [["Days", (left / 86400) | 0], ["Hours", ((left / 3600) | 0) % 24], ["Minutes", ((left / 60) | 0) % 60], ["Seconds", left % 60]];
  return (
    <div className="mb-7 mt-6 flex flex-wrap gap-3">
      {parts.map(([label, v]) => (
        <div key={label} className="min-w-[80px] rounded-xl border border-line bg-panel px-4 py-3 text-center">
          <div className="text-gradient font-mono text-[32px] font-medium leading-none tracking-[-0.03em]">{pad(v)}</div>
          <div className="mt-1.5 text-[11px] uppercase tracking-wider text-fg3">{label}</div>
        </div>
      ))}
    </div>
  );
}

export default function Contest() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [moved, setMoved] = useState(null);
  const prev = useRef({});
  useEffect(() => { document.title = "Contest · Verdikt"; }, []);

  // Real standings from the database, refreshed every few seconds.
  const load = useCallback(async () => {
    try {
      const d = await api.contest();
      const gained = d.standings.find((u) => prev.current[u.username] !== undefined && u.solved > prev.current[u.username]);
      prev.current = Object.fromEntries(d.standings.map((u) => [u.username, u.solved]));
      setData(d); setError(null);
      if (gained) { setMoved(gained.username); setTimeout(() => setMoved(null), 1500); }
    } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);

  if (!data && error) return (
    <div className="mx-auto max-w-md px-5 pt-32 text-center text-fg2">
      <CloudOff className="mx-auto mb-3 text-fg3" />
      <b className="mb-1 block font-semibold text-fg">We can't load the contest</b>{error}
      <div className="mt-4"><Button onClick={load}>Try again</Button></div>
    </div>
  );
  if (!data) return <div className="mx-auto max-w-[1040px] space-y-4 px-5 pt-12"><Skeleton className="h-7 w-64" /><Skeleton className="h-20 w-80" /><Skeleton className="h-64 w-full rounded-xl" /></div>;

  return (
    <div className="mx-auto max-w-[1040px] px-5 pb-20 pt-10">
      <div className="mb-1 flex items-center gap-3">
        <h1 className="text-[26px] font-semibold tracking-[-0.03em]">{data.name}</h1>
        <span className="flex items-center gap-1.5 rounded-full bg-ok/15 px-2.5 py-0.5 text-xs font-medium text-ok"><span className="size-1.5 animate-pulse rounded-full bg-ok" />Live</span>
      </div>
      <p className="text-fg2">{data.totalProblems} problems · ranked by solved, then penalty · resets every Monday</p>
      <Countdown endsAt={data.endsAt} now={data.now} />
      <div className="overflow-hidden rounded-xl border border-line bg-panel">
        <div className="grid grid-cols-[40px_1fr_auto] gap-3 px-4 py-2.5 text-xs text-fg3"><span>#</span><span>User</span><span className="pr-1">Progress</span></div>
        {data.standings.length ? data.standings.map((u, i) => (
          <motion.div layout key={u.username} transition={{ type: "spring", stiffness: 500, damping: 42 }}
            className={cn("grid grid-cols-[40px_1fr_auto] items-center gap-3 border-t border-line px-4 py-3.5 transition-colors duration-700", moved === u.username && "bg-ok/10", u.username === data.you && "bg-accent/5")}>
            <b className={cn("font-mono text-sm font-semibold", MEDAL[i] ?? "text-fg3")}>{i + 1}</b>
            <span className="flex items-center gap-2.5 font-medium">
              <span className="grid size-7 place-items-center rounded-full text-[11px] font-semibold text-white" style={{ background: `linear-gradient(135deg,hsl(${hue(u.username)} 70% 58%),hsl(${(hue(u.username) + 50) % 360} 70% 42%))` }}>{u.username[0].toUpperCase()}</span>
              {u.username}{u.username === data.you && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent2">You</span>}
            </span>
            <span className="flex items-center gap-4">
              <span className="hidden gap-1 sm:flex" aria-hidden>
                {Array.from({ length: data.totalProblems }, (_, k) => <span key={k} className={cn("h-1.5 w-4 rounded-full transition-colors duration-500", k < u.solved ? "bg-ok" : "bg-panel2")} />)}
              </span>
              <span className="w-28 text-right text-sm"><b className="font-semibold">{u.solved}</b><span className="text-fg3"> / {data.totalProblems}</span> <span className="ml-1 font-mono text-xs text-fg3">{penalty(u.penalty)}</span></span>
            </span>
          </motion.div>
        )) : (
          <div className="border-t border-line px-5 py-14 text-center text-fg2">
            <b className="mb-1 block font-semibold text-fg">No one is on the board yet</b>
            Submit a solution this week and you'll be first.
            <div className="mt-4"><Link to="/problems"><Button variant="primary">Start solving</Button></Link></div>
          </div>
        )}
      </div>
    </div>
  );
}
