import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { JUMMAH, type JummahConfig } from "../engine/conflicts";
import type { ClassItem, Commitment } from "../engine/types";
import { SAMPLE_CLASSES, SAMPLE_COMMITMENTS } from "../data/sample";

const KEY = "msoweek:state:v2";

export interface Task {
  id: string;
  text: string;
  done: boolean;
  due?: string; // YYYY-MM-DD
}

export interface Reminder {
  id: string;
  text: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
}

export interface AppState {
  interested: string[];
  classes: ClassItem[];
  commitments: Commitment[];
  name: string;
  jummah: JummahConfig;
  showPrayers: boolean;
  tasks: Task[];
  reminders: Reminder[];
}

export const SAMPLE_TASKS: Task[] = [
  { id: "t1", text: "Submit hackathon project", done: false, due: "2026-11-06" },
  { id: "t2", text: "Email Dr. Nguyen about Maghrib during CAT 125R", done: false, due: "2026-11-09" },
  { id: "t3", text: "Register for Tarbiyyah Conference", done: true, due: "2026-10-28" },
];

export const SAMPLE_REMINDERS: Reminder[] = [
  { id: "r1", text: "Read Surah Al-Kahf", date: "2026-11-06" },
  { id: "r2", text: "Hackathon check-in at Triton Arena", date: "2026-11-06", time: "14:15" },
  { id: "r3", text: "RSVP for Qamar Society x BMP", date: "2026-11-09", time: "12:00" },
  { id: "r4", text: "CSE 101 problem set due", date: "2026-11-12", time: "23:59" },
];

export const defaultState = (): AppState => ({
  interested: [],
  classes: SAMPLE_CLASSES.map((c) => ({ ...c })),
  commitments: SAMPLE_COMMITMENTS.map((c) => ({ ...c })),
  name: "",
  jummah: { standard: [...JUMMAH.standard], daylight: [...JUMMAH.daylight], durationMinutes: JUMMAH.durationMinutes },
  showPrayers: true,
  tasks: SAMPLE_TASKS.map((t) => ({ ...t })),
  reminders: SAMPLE_REMINDERS.map((r) => ({ ...r })),
});

function load(): AppState {
  const base = defaultState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const s = JSON.parse(raw) as Partial<AppState>;
    const arr = <T,>(v: unknown, fallback: T[]) => (Array.isArray(v) ? (v as T[]) : fallback);
    return {
      ...base,
      ...s,
      jummah: { ...base.jummah, ...(s.jummah || {}) },
      classes: arr(s.classes, base.classes),
      commitments: arr(s.commitments, base.commitments),
      interested: arr(s.interested, []),
      tasks: arr(s.tasks, base.tasks),
      reminders: arr(s.reminders, base.reminders),
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

const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function useAppStateInternal() {
  const [state, setState] = useState<AppState>(load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage blocked: keep working in memory */
    }
  }, [state]);

  const update = useCallback((patch: Partial<AppState>) => setState((s) => ({ ...s, ...patch })), []);
  const toggleInterested = useCallback((id: string) => {
    setState((s) => ({ ...s, interested: s.interested.includes(id) ? s.interested.filter((x) => x !== id) : [...s.interested, id] }));
  }, []);
  const updateClass = useCallback((id: string, patch: Partial<ClassItem>) => {
    setState((s) => ({ ...s, classes: s.classes.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }, []);
  const updateCommitment = useCallback((id: string, patch: Partial<Commitment>) => {
    setState((s) => ({ ...s, commitments: s.commitments.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }, []);
  const addCommitment = useCallback((c: Commitment) => setState((s) => ({ ...s, commitments: [...s.commitments, c] })), []);
  const removeCommitment = useCallback((id: string) => setState((s) => ({ ...s, commitments: s.commitments.filter((c) => c.id !== id) })), []);

  const addTask = useCallback((text: string, due?: string) => setState((s) => ({ ...s, tasks: [{ id: uid("t"), text, done: false, due: due || undefined }, ...s.tasks] })), []);
  const toggleTask = useCallback((id: string) => setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) })), []);
  const removeTask = useCallback((id: string) => setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) })), []);

  const addReminder = useCallback((text: string, date: string, time?: string) => setState((s) => ({ ...s, reminders: [...s.reminders, { id: uid("r"), text, date, time: time || undefined }] })), []);
  const removeReminder = useCallback((id: string) => setState((s) => ({ ...s, reminders: s.reminders.filter((r) => r.id !== id) })), []);

  return { state, update, toggleInterested, updateClass, updateCommitment, addCommitment, removeCommitment, addTask, toggleTask, removeTask, addReminder, removeReminder };
}

type Store = ReturnType<typeof useAppStateInternal>;
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useAppStateInternal();
  const value = useMemo(() => store, [store.state]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}

/** Sort helper: reminders by date then time */
export const reminderKey = (r: Reminder) => `${r.date}T${r.time || "00:00"}`;
