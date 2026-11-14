import { useSyncExternalStore } from "react";

// Small persisted stores. Swap for server state when the backend exists.
function persisted(key, initial) {
  let snap;
  try { snap = JSON.parse(localStorage.getItem(key)) ?? initial; } catch { snap = initial; }
  const subs = new Set();
  return {
    get: () => snap,
    set(v) {
      snap = v;
      try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ }
      subs.forEach((fn) => fn());
    },
    subscribe: (fn) => (subs.add(fn), () => subs.delete(fn)),
  };
}

const solvedStore = persisted("verdikt:solved", []);
const subsStore = persisted("verdikt:submissions", []);

export const markSolved = (id) => { const s = solvedStore.get(); if (!s.includes(id)) solvedStore.set([...s, id]); };
export const addSubmission = (s) => subsStore.set([s, ...subsStore.get()].slice(0, 50));
export const useSolved = () => useSyncExternalStore(solvedStore.subscribe, solvedStore.get);
export const useSubmissions = () => useSyncExternalStore(subsStore.subscribe, subsStore.get);
