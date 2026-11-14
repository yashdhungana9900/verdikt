import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Code, CornerDownLeft, House, Sun, Trophy, ListChecks } from "lucide-react";
import { useProblems } from "@/lib/problems";
import { toggleTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export default function CommandPalette({ open, onClose }) {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const list = useRef(null);
  const { problems } = useProblems();

  const items = useMemo(() => [
    { label: "Home", hint: "Page", Icon: House, run: () => nav("/") },
    { label: "Problems", hint: "Page", Icon: ListChecks, run: () => nav("/problems") },
    { label: "Contest", hint: "Page", Icon: Trophy, run: () => nav("/contest") },
    ...(problems ?? []).map((p) => ({ label: p.title, hint: p.difficulty, Icon: Code, run: () => nav(`/problems/${p.id}`) })),
    { label: "Toggle theme", hint: "Action", Icon: Sun, run: toggleTheme },
  ], [nav, problems]);

  const shown = items.filter((x) => x.label.toLowerCase().includes(q.trim().toLowerCase()));
  useEffect(() => { if (open) { setQ(""); setI(0); } }, [open]);
  useEffect(() => setI(0), [q]);
  useEffect(() => { list.current?.children[i]?.scrollIntoView({ block: "nearest" }); }, [i]);

  const run = (x) => { if (!x) return; onClose(); x.run(); };
  const onKey = (e) => {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") { e.preventDefault(); setI((n) => Math.min(n + 1, shown.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setI((n) => Math.max(n - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); run(shown[i]); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
          onMouseDown={onClose} className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[14vh] backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.97, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.2, 0.7, 0.2, 1] }} onMouseDown={(e) => e.stopPropagation()}
            className="w-[min(560px,calc(100%-24px))] overflow-hidden rounded-2xl border border-line2 bg-panel shadow-[0_30px_80px_rgb(0_0_0/.5)]">
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Search problems and commands…" aria-label="Command"
              className="w-full border-b border-line bg-transparent px-4 py-3.5 text-[15px] outline-none placeholder:text-fg3" />
            <div ref={list} className="max-h-80 overflow-auto p-1.5">
              {shown.length ? shown.map((x, n) => (
                <button key={x.label} onClick={() => run(x)} onMouseMove={() => setI(n)}
                  className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors", n === i ? "bg-panel2 text-fg" : "text-fg2")}>
                  <x.Icon size={15} className="text-fg3" />
                  <span>{x.label}</span>
                  <span className="ml-auto flex items-center gap-2 text-xs text-fg3">{x.hint}{n === i && <CornerDownLeft size={12} />}</span>
                </button>
              )) : <p className="px-3 py-8 text-center text-sm text-fg3">No results for "{q}"</p>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
