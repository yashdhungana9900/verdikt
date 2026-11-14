import { motion } from "framer-motion";
import { VERDICTS, tint } from "@/lib/verdicts";
import { cn } from "@/lib/utils";

export default function VerdictBadge({ verdict, size = "md" }) {
  const v = VERDICTS[verdict];
  const c = `var(--color-${v.color})`;
  const pending = verdict === "PD";
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: pending ? [1, 0.45, 1] : 1, scale: 1 }}
      transition={pending ? { repeat: Infinity, duration: 1.1 } : { duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
      style={{
        color: c,
        background: tint(v.color),
        boxShadow: `0 0 18px ${tint(v.color, 22)}, inset 0 0 0 1px ${tint(v.color, 28)}`,
      }}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium",
        size === "lg" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs"
      )}
    >
      <v.Icon size={size === "lg" ? 15 : 13} strokeWidth={2.2} className={pending ? "animate-spin" : ""} />
      {v.label}
    </motion.span>
  );
}
