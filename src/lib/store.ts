import { useCallback, useEffect, useState } from "react";
import { JUMMAH, type JummahConfig } from "../engine/conflicts";
import type { ClassItem, Commitment } from "../engine/types";
import { SAMPLE_CLASSES, SAMPLE_COMMITMENTS } from "../data/sample";

const KEY = "msoweek:state:v1";

export interface AppState {
  interested: string[];
  classes: ClassItem[];
  commitments: Commitment[];
  name: string;
  jummah: JummahConfig;
  showPrayers: boolean;
}

export const defaultState = (): AppState => ({
  interested: [],
  classes: SAMPLE_CLASSES.map((c) => ({ ...c })),
  commitments: SAMPLE_COMMITMENTS.map((c) => ({ ...c })),
  name: "",
  jummah: { standard: [...JUMMAH.standard], daylight: [...JUMMAH.daylight], durationMinutes: JUMMAH.durationMinutes },
  showPrayers: true,
});

function load(): AppState {
  const base = defaultState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const s = JSON.parse(raw) as Partial<AppState>;
    return {
      ...base,
      ...s,
      jummah: { ...base.jummah, ...(s.jummah || {}) },
      classes: Array.isArray(s.classes) ? s.classes : base.classes,
      commitments: Array.isArray(s.commitments) ? s.commitments : base.commitments,
      interested: Array.isArray(s.interested) ? s.interested : [],
    };
  } catch {
    return base;
  }
}

export function resetDemo() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("msoweek:"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
  window.location.reload();
}

export function useAppState() {
  const [state, setState] = useState<AppState>(load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage blocked: keep working in memory */
    }
  }, [state]);

  const update = useCallback((patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => {
    setState((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) }));
  }, []);

  const toggleInterested = useCallback((id: string) => {
    setState((s) => ({ ...s, interested: s.interested.includes(id) ? s.interested.filter((x) => x !== id) : [...s.interested, id] }));
  }, []);

  const updateClass = useCallback((id: string, patch: Partial<ClassItem>) => {
    setState((s) => ({ ...s, classes: s.classes.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }, []);

  const updateCommitment = useCallback((id: string, patch: Partial<Commitment>) => {
    setState((s) => ({ ...s, commitments: s.commitments.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }, []);

  const addCommitment = useCallback((c: Commitment) => {
    setState((s) => ({ ...s, commitments: [...s.commitments, c] }));
  }, []);

  const removeCommitment = useCallback((id: string) => {
    setState((s) => ({ ...s, commitments: s.commitments.filter((c) => c.id !== id) }));
  }, []);

  return { state, update, toggleInterested, updateClass, updateCommitment, addCommitment, removeCommitment };
}
