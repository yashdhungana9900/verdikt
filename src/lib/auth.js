import { useSyncExternalStore } from "react";
import { api } from "./api";

function createStore(initial) {
  let state = initial;
  const subs = new Set();
  return {
    get: () => state,
    set(patch) { state = { ...state, ...patch }; subs.forEach((fn) => fn()); },
    subscribe: (fn) => (subs.add(fn), () => subs.delete(fn)),
  };
}

// Who is logged in, what they've solved, and their submission history.
const auth = createStore({ user: null, solved: [], submissions: [], loading: true });
// The login / signup dialog.
const dialog = createStore({ open: false, mode: "login", reason: null });

export const useAuth = () => useSyncExternalStore(auth.subscribe, auth.get);
export const useAuthDialog = () => useSyncExternalStore(dialog.subscribe, dialog.get);
export const openAuth = (mode = "login", reason = null) => dialog.set({ open: true, mode, reason });
export const closeAuth = () => dialog.set({ open: false });

export async function refreshMe() {
  try {
    const me = await api.me();
    if (!me.user) return auth.set({ user: null, solved: [], submissions: [], loading: false });
    const submissions = await api.mySubmissions();
    auth.set({ user: me.user, solved: me.solved, submissions, loading: false });
  } catch {
    auth.set({ loading: false }); // server down: stay logged out quietly
  }
}
export async function login(body) { await api.login(body); await refreshMe(); }
export async function signup(body) { await api.signup(body); await refreshMe(); }
export async function logout() { await api.logout().catch(() => {}); auth.set({ user: null, solved: [], submissions: [] }); }
