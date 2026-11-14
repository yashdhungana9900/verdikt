import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Code, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import VerdictBadge from "@/components/VerdictBadge";
import { VERDICTS } from "@/lib/verdicts";

const SEQ = [
  { v: "PD", note: "Running 3 tests", dots: ["pend", "pend", "pend"] },
  { v: "WA", note: "Failed on case 2", dots: ["ok", "bad", "pend"] },
  { v: "PD", note: "Running 3 tests", dots: ["pend", "pend", "pend"] },
  { v: "TLE", note: "Case 3 took 1,204 ms", dots: ["ok", "ok", "warn"] },
  { v: "PD", note: "Running 3 tests", dots: ["pend", "pend", "pend"] },
  { v: "AC", note: "3/3 passed · 4 ms", dots: ["ok", "ok", "ok"] },
];

const K = ({ children }) => <span className="text-accent2">{children}</span>;
const C = ({ children }) => <span className="text-fg3">{children}</span>;
const CODE = [
  [0, <><K>function</K> twoSum(nums, target) {"{"}</>],
  [1, <><K>const</K> seen = <K>new</K> Map();</>],
  [1, <><K>for</K> (<K>let</K> i = 0; i &lt; nums.length; i++) {"{"}</>],
  [2, <C>// look up the complement</C>],
  [2, <><K>const</K> j = seen.get(target - nums[i]);</>],
  [2, <><K>if</K> (j !== <K>undefined</K>) <K>return</K> [j, i];</>],
  [1, <>{"}"}</>],
  [0, <>{"}"}</>],
];

function Demo() {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((n) => (n + 1) % SEQ.length), 1500); return () => clearInterval(t); }, []);
  const s = SEQ[i];
  return (
    <div className="mx-auto mt-14 max-w-[600px] overflow-hidden rounded-2xl border border-line2 bg-panel text-left shadow-[0_40px_100px_rgb(0_0_0/.4),0_0_80px_rgb(124_92_255/.12)]">
      <div className="flex items-center gap-1.5 border-b border-line px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-bad/70" /><span className="size-2.5 rounded-full bg-warn/70" /><span className="size-2.5 rounded-full bg-ok/70" />
        <span className="ml-3 font-mono text-xs text-fg3">two-sum.js</span>
      </div>
      <div className="p-4 font-mono text-[13px] leading-7 text-fg2">
        {CODE.map(([n, line], k) => <div key={k} style={{ paddingLeft: n * 18 }}>{line}</div>)}
      </div>
      <div className="flex items-center gap-3 border-t border-line bg-panel2/50 px-4 py-3">
        <VerdictBadge key={i} verdict={s.v} />
        <div className="flex gap-1.5">
          {s.dots.map((d, k) => <span key={k} className="size-2 rounded-full transition-colors duration-300" style={{ background: `var(--color-${d})` }} />)}
        </div>
        <span className="ml-auto font-mono text-xs text-fg3">{s.note}</span>
      </div>
    </div>
  );
}

const FEATURES = [
  { Icon: Zap, title: "Instant verdicts", text: "Submit and see Accepted, Wrong Answer or Time Limit Exceeded in seconds, with runtime and memory." },
  { Icon: Code, title: "A real editor", text: "Monaco, the engine behind VS Code, with a custom theme, shortcuts and drafts that save as you type." },
  { Icon: Trophy, title: "Live contests", text: "Race the clock and watch the leaderboard reshuffle the moment someone lands a solve." },
];

const rise = { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" }, transition: { duration: 0.5, ease: [0.2, 0.7, 0.2, 1] } };

export default function Landing() {
  return (
    <>
      <section className="relative overflow-hidden px-5 pb-20 pt-20 text-center">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgb(124_92_255/.28),transparent)]" />
        <div className="relative">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Link to="/contest" className="mb-7 inline-flex items-center gap-2 rounded-full border border-line bg-panel/60 px-3 py-1 text-xs text-fg2 backdrop-blur transition hover:border-line2 hover:text-fg">
              <span className="size-1.5 animate-pulse rounded-full bg-ok" />Weekly Contest 42 is live<ArrowRight size={12} />
            </Link>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}
            className="text-gradient mx-auto mb-5 max-w-3xl text-[clamp(2.4rem,6.5vw,4.25rem)] font-semibold leading-[1.04] tracking-[-0.045em]">
            Write code. Get a verdict.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.12 }} className="mx-auto mb-8 max-w-[520px] text-base text-fg2">
            Solve problems in your browser and see exactly how your solution performs, test case by test case.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.18 }} className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/problems"><Button variant="primary" size="lg">Start solving <ArrowRight size={16} /></Button></Link>
            <Link to="/contest"><Button size="lg">Join the contest</Button></Link>
          </motion.div>
          <p className="mt-5 text-xs text-fg3">Press <kbd className="rounded border border-line bg-panel2 px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</kbd> anywhere to jump to a problem</p>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}><Demo /></motion.div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1040px] gap-4 px-5 pb-16 md:grid-cols-3">
        {FEATURES.map(({ Icon, title, text }, i) => (
          <motion.div key={title} {...rise} transition={{ ...rise.transition, delay: i * 0.08 }}
            className="group rounded-2xl border border-line bg-panel p-6 transition-colors hover:border-line2">
            <span className="mb-4 grid size-9 place-items-center rounded-lg bg-accent/15 text-accent2 transition group-hover:shadow-[0_0_20px_rgb(124_92_255/.35)]"><Icon size={17} /></span>
            <h3 className="mb-1.5 font-semibold tracking-[-0.01em]">{title}</h3>
            <p className="text-sm leading-relaxed text-fg2">{text}</p>
          </motion.div>
        ))}
      </section>

      <motion.section {...rise} className="mx-auto max-w-[1040px] px-5 pb-20 text-center">
        <h2 className="mb-2 text-xl font-semibold tracking-[-0.03em]">Every verdict, at a glance</h2>
        <p className="mb-6 text-sm text-fg2">Clear colors and icons so you always know exactly what happened.</p>
        <div className="flex flex-wrap justify-center gap-3">{Object.keys(VERDICTS).map((k) => <VerdictBadge key={k} verdict={k} size="lg" />)}</div>
      </motion.section>

      <motion.section {...rise} className="mx-auto mb-20 max-w-[1040px] px-5">
        <div className="relative overflow-hidden rounded-3xl border border-line bg-panel px-6 py-14 text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(500px_200px_at_50%_100%,rgb(124_92_255/.22),transparent)]" />
          <h2 className="relative mb-5 text-2xl font-semibold tracking-[-0.03em]">Ready for your first Accepted?</h2>
          <Link to="/problems" className="relative"><Button variant="primary" size="lg">Start solving</Button></Link>
        </div>
      </motion.section>
    </>
  );
}
