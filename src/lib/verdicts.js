import { Check, X, Clock, AlertTriangle, Braces, Loader2 } from "lucide-react";

// Verdict codes match what the backend judge should return.
export const VERDICTS = {
  AC: { label: "Accepted", color: "ok", Icon: Check },
  WA: { label: "Wrong Answer", color: "bad", Icon: X },
  TLE: { label: "Time Limit Exceeded", color: "warn", Icon: Clock },
  RE: { label: "Runtime Error", color: "err", Icon: AlertTriangle },
  CE: { label: "Compilation Error", color: "ce", Icon: Braces },
  PD: { label: "Judging", color: "pend", Icon: Loader2 },
};

export const DIFFICULTY = { Easy: "ok", Medium: "warn", Hard: "bad" };

// Soft tinted background for a token color, e.g. tint("ok", 13)
export const tint = (color, pct = 13) =>
  `color-mix(in srgb, var(--color-${color}) ${pct}%, transparent)`;
