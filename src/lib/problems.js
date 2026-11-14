import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

// Problems come from the server. One shared request, cached for the session.
let cache = null;
let inflight = null;
function load() {
  inflight ??= api.problems().then((p) => (cache = p)).finally(() => { inflight = null; });
  return inflight;
}

export function useProblems() {
  const [state, setState] = useState({ problems: cache, loading: !cache, error: null });
  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    load().then((problems) => setState({ problems, loading: false, error: null }))
      .catch((e) => setState({ problems: cache, loading: false, error: e.message }));
  }, []);
  useEffect(() => { if (!cache) reload(); }, [reload]);
  return { ...state, reload };
}
