import { useSyncExternalStore } from "react";

const subs = new Set();
export const getTheme = () => document.documentElement.dataset.theme || "dark";

export function toggleTheme() {
  const next = getTheme() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem("verdikt:theme", next); } catch { /* ignore */ }
  subs.forEach((fn) => fn());
}

export const useTheme = () => useSyncExternalStore((fn) => (subs.add(fn), () => subs.delete(fn)), getTheme);
