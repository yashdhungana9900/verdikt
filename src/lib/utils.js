import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...args) => twMerge(clsx(args));

export function timeAgo(t) {
  const when = typeof t === "number" ? t : new Date(t).getTime();
  const s = Math.max(1, Math.round((Date.now() - when) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}
