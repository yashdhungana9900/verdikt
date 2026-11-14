import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const variants = {
  primary:
    "text-white bg-gradient-to-b from-accent2 to-accent shadow-[inset_0_1px_0_rgb(255_255_255/.25),0_4px_14px_rgb(124_92_255/.3)] hover:shadow-[inset_0_1px_0_rgb(255_255_255/.25),0_6px_28px_rgb(124_92_255/.6)]",
  secondary: "border border-line text-fg hover:border-line2 hover:bg-panel2",
  ghost: "text-fg2 hover:text-fg hover:bg-panel2",
};

export function Button({ variant = "secondary", size = "md", loading, className, children, ...props }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition active:scale-[.97] disabled:pointer-events-none disabled:opacity-50",
        size === "lg" ? "h-12 rounded-xl px-6 text-[15px]" : "h-9 rounded-lg px-3.5 text-sm",
        variants[variant],
        className
      )}
    >
      {loading && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
}

export const Kbd = ({ children }) => (
  <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[11px] leading-none">{children}</kbd>
);
