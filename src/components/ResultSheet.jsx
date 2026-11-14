import { AnimatePresence, motion } from "framer-motion";
import { CloudOff, X } from "lucide-react";
import VerdictBadge from "./VerdictBadge";
import { VERDICTS } from "@/lib/verdicts";

const HIDDEN = {
  WA: "Your output didn't match on a hidden test.",
  TLE: "Your program took too long on this test.",
  RE: "Your program crashed on this test.",
};

function CaseDetail({ c }) {
  if (c.status === "AC") return <>{c.ms} ms</>;
  if (c.error) return <span className="whitespace-pre-wrap">{c.error}</span>;
  if (c.status === "TLE") return <>Exceeded the time limit{c.sample ? ` on this sample` : ""}.</>;
  if (!c.sample) return <>{HIDDEN[c.status]}</>;
  return (
    <div className="space-y-1.5">
      {[["input", c.input], ["expected", c.expected], ["got", c.output || "(no output)"]].map(([label, v]) => (
        <div key={label}><span className="text-fg3">{label}</span><pre className="whitespace-pre-wrap break-words text-fg2">{v}</pre></div>
      ))}
    </div>
  );
}

// Slides up from the bottom of the editor pane.
export default function ResultSheet({ result, onClose }) {
  const passed = result?.cases?.filter((c) => c.status === "AC").length ?? 0;
  return (
    <AnimatePresence>
      {result && (
        <motion.div
          initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 380, damping: 38 }}
          className="absolute inset-x-0 bottom-0 z-10 max-h-[62%] overflow-auto rounded-t-2xl border-t border-line2 bg-panel2 shadow-[0_-20px_50px_rgb(0_0_0/.35)]"
        >
          <div className="sticky top-0 flex items-center gap-3.5 border-b border-line bg-panel2 px-4 py-3.5">
            {result.system ? (
              <span className="flex items-center gap-2 text-sm font-medium text-err"><CloudOff size={16} />Judge unavailable</span>
            ) : (
              <VerdictBadge key={result.verdict} verdict={result.pending ? "PD" : result.verdict} size="lg" />
            )}
            {!result.pending && !result.system && (
              <span className="font-mono text-[12.5px] text-fg2">
                {passed}/{result.total ?? result.cases.length} passed · {result.runtimeMs} ms{result.memoryMb ? ` · ${result.memoryMb} MB` : ""}
              </span>
            )}
            {!result.pending && !result.system && result.cases.length > 0 && (
              <div className="ml-auto hidden gap-1 sm:flex" aria-hidden>
                {result.cases.map((c, i) => <span key={i} className="h-1.5 w-5 rounded-full" style={{ background: `var(--color-${VERDICTS[c.status].color})` }} />)}
              </div>
            )}
            <button onClick={onClose} aria-label="Close results" className={result.cases?.length && !result.system ? "text-fg3 hover:text-fg" : "ml-auto text-fg3 hover:text-fg"}><X size={16} /></button>
          </div>
          {result.system && <p className="px-4 py-4 text-sm text-fg2">{result.message}</p>}
          {result.error && <pre className="whitespace-pre-wrap border-b border-line px-4 py-3 font-mono text-[12.5px] leading-relaxed text-fg2">{result.error}</pre>}
          {result.cases?.map((c, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="grid grid-cols-[84px_auto_1fr] items-start gap-3 border-b border-line px-4 py-2.5 last:border-0">
              <span className="pt-0.5 text-sm text-fg3">{c.sample ? `Sample ${i + 1}` : `Test ${i + 1}`}</span>
              <VerdictBadge verdict={c.status} />
              <div className="min-w-0 break-words font-mono text-xs leading-relaxed text-fg2"><CaseDetail c={c} /></div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
