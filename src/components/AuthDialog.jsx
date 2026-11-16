import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { closeAuth, login, openAuth, signup, useAuthDialog } from "@/lib/auth";
import { cn } from "@/lib/utils";

const EMPTY = { identifier: "", username: "", email: "", password: "" };
const INPUT = "h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm outline-none transition placeholder:text-fg3 focus:border-accent focus:ring-4 focus:ring-accent/20";

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-fg2">{label}</span>
      <input {...props} className={INPUT} />
    </label>
  );
}

export default function AuthDialog() {
  const { open, mode, reason } = useAuthDialog();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const first = useRef(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => { setError(""); if (open) setTimeout(() => first.current?.focus(), 50); }, [open, mode]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && closeAuth();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      if (mode === "login") await login({ identifier: form.identifier, password: form.password });
      else await signup({ username: form.username, email: form.email, password: form.password });
      closeAuth(); setForm(EMPTY);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const isLogin = mode === "login";
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
          onMouseDown={closeAuth} className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 px-3 pt-[12vh] backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.97, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.2, 0.7, 0.2, 1] }} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true"
            aria-label={isLogin ? "Log in" : "Sign up"} className="w-full max-w-[400px] rounded-2xl border border-line2 bg-panel p-6 shadow-[0_30px_80px_rgb(0_0_0/.5)]">
            <div className="mb-1 flex items-start">
              <h2 className="text-lg font-semibold tracking-[-0.02em]">{isLogin ? "Welcome back" : "Create your account"}</h2>
              <button onClick={closeAuth} aria-label="Close" className="ml-auto text-fg3 transition hover:text-fg"><X size={16} /></button>
            </div>
            <p className="mb-5 text-sm text-fg2">{reason ?? (isLogin ? "Log in to keep your progress and join contests." : "Save your solutions, track your progress and join the leaderboard.")}</p>
            <form onSubmit={submit} className="space-y-3.5">
              {isLogin ? (
                <Field ref={first} label="Email or username" value={form.identifier} onChange={set("identifier")} autoComplete="username" required />
              ) : (
                <>
                  <Field ref={first} label="Username" value={form.username} onChange={set("username")} autoComplete="username" placeholder="maya_codes" required />
                  <Field label="Email" type="email" value={form.email} onChange={set("email")} autoComplete="email" required />
                </>
              )}
              <Field label="Password" type="password" value={form.password} onChange={set("password")} autoComplete={isLogin ? "current-password" : "new-password"} placeholder={isLogin ? "" : "At least 8 characters"} required />
              {error && <p role="alert" className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>}
              <Button type="submit" variant="primary" loading={busy} className="h-10 w-full">{isLogin ? "Log in" : "Create account"}</Button>
            </form>
            <p className={cn("mt-4 text-center text-sm text-fg2")}>
              {isLogin ? "New to Verdikt? " : "Already have an account? "}
              <button onClick={() => openAuth(isLogin ? "signup" : "login")} className="font-medium text-accent2 transition hover:underline">{isLogin ? "Sign up" : "Log in"}</button>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
