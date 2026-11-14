import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Draggable two-pane layout on desktop, stacked on mobile.
export default function SplitPane({ left, right }) {
  const ref = useRef(null);
  const [pct, setPct] = useState(46);
  const [drag, setDrag] = useState(false);
  const move = (e) => {
    const r = ref.current.getBoundingClientRect();
    setPct(Math.min(70, Math.max(25, ((e.clientX - r.left) / r.width) * 100)));
  };
  return (
    <div ref={ref} className="flex flex-col md:h-[calc(100dvh-3.5rem)] md:flex-row">
      <div style={{ "--w": `${pct}%` }} className="overflow-auto md:w-[var(--w)] md:shrink-0">{left}</div>
      <div
        role="separator"
        aria-orientation="vertical"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDrag(true); }}
        onPointerMove={(e) => drag && move(e)}
        onPointerUp={() => setDrag(false)}
        className={cn("hidden w-1.5 cursor-col-resize bg-line transition-colors hover:bg-accent md:block", drag && "bg-accent")}
      />
      <div className="h-[80dvh] min-w-0 flex-1 md:h-auto">{right}</div>
    </div>
  );
}
