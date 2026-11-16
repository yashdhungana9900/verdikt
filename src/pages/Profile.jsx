import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import VerdictBadge from "@/components/VerdictBadge";
import { logout, openAuth, useAuth } from "@/lib/auth";
import { useProblems } from "@/lib/problems";
import { DIFFICULTY } from "@/lib/verdicts";
import { timeAgo } from "@/lib/utils";

const LANG = { js: "JavaScript", python: "Python", cpp: "C++" };

export default function Profile() {
  const { user, loading, solved, submissions } = useAuth();
  const { problems } = useProblems();
  const nav = useNavigate();
  useEffect(() => { document.title = "Your profile · Verdikt"; }, []);

  if (loading) return <div className="mx-auto max-w-[1040px] space-y-4 px-5 pt-12"><Skeleton className="h-16 w-72" /><Skeleton className="h-32 w-full rounded-xl" /></div>;
  if (!user) return (
    <div className="mx-auto max-w-md px-5 pt-32 text-center">
      <h1 className="mb-2 text-xl font-semibold">Log in to see your profile</h1>
      <p className="mb-6 text-fg2">Your solved problems, submissions and stats live here.</p>
      <Button variant="primary" onClick={() => openAuth("login")}>Log in</Button>
    </div>
  );

  const all = problems ?? [];
  const accepted = submissions.filter((s) => s.verdict === "AC").length;
  const stats = [
    ["Solved", `${solved.length}/${all.length || "-"}`],
    ["Submissions", submissions.length],
    ["Accepted", submissions.length ? `${Math.round((accepted / submissions.length) * 100)}%` : "-"],
  ];

  return (
    <div className="mx-auto max-w-[1040px] px-5 pb-20 pt-10">
      <div className="flex items-center gap-4">
        <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-accent2 to-accent text-xl font-semibold text-white shadow-[0_0_30px_rgb(124_92_255/.35)]">{user.username[0].toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.03em]">{user.username}</h1>
          <p className="text-sm text-fg2">{user.email}</p>
        </div>
        <Button onClick={() => { logout(); nav("/"); }}>Log out</Button>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line bg-panel p-5">
            <div className="text-gradient text-3xl font-semibold tracking-[-0.03em]">{value}</div>
            <div className="mt-1 text-sm text-fg2">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-line bg-panel p-5">
        <div className="mb-4 text-sm font-medium">By difficulty</div>
        <div className="space-y-3">
          {Object.keys(DIFFICULTY).map((d) => {
            const pool = all.filter((p) => p.difficulty === d), done = pool.filter((p) => solved.includes(p.id)).length;
            return (
              <div key={d} className="flex items-center gap-3 text-sm">
                <span className="w-16 text-fg2">{d}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel2">
                  <motion.div className="h-full rounded-full" style={{ background: `var(--color-${DIFFICULTY[d]})` }} initial={{ width: 0 }} animate={{ width: pool.length ? `${(done / pool.length) * 100}%` : 0 }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
                </div>
                <span className="w-10 text-right font-mono text-xs text-fg3">{done}/{pool.length}</span>
              </div>
            );
          })}
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-sm font-medium text-fg2">Recent submissions</h2>
      <div className="overflow-hidden rounded-xl border border-line bg-panel">
        {submissions.length ? submissions.slice(0, 15).map((s) => (
          <Link key={s.id} to={`/problems/${s.problemId}`} className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 transition last:border-0 hover:bg-panel2">
            <span className="min-w-[140px] font-medium">{all.find((p) => p.id === s.problemId)?.title ?? s.problemId}</span>
            <VerdictBadge verdict={s.verdict} />
            <span className="font-mono text-xs text-fg3">{LANG[s.language] ?? s.language} · {s.runtimeMs} ms</span>
            <span className="ml-auto text-xs text-fg3">{timeAgo(s.at)}</span>
          </Link>
        )) : (
          <div className="px-5 py-12 text-center text-fg2">
            <b className="mb-1 block font-semibold text-fg">No submissions yet</b>
            Solve your first problem and it will show up here.
            <div className="mt-4"><Link to="/problems"><Button variant="primary">Browse problems</Button></Link></div>
          </div>
        )}
      </div>
    </div>
  );
}
