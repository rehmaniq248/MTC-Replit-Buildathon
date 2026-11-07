import { useEffect, useMemo, useState } from "react";
import { SAMPLE_EVENTS } from "../data/sample";
import { getPrayerWindows } from "../engine/conflicts";
import { analyzeDay, type DayAnalysis } from "../engine/schedule";
import { TZ, addDays, clampWeek, todayLA, toMin, weekDates, weekIndexFor } from "../engine/time";
import type { DayWindows } from "../engine/types";
import { useStore } from "./store";
import { usePrayerTimes } from "./usePrayerTimes";

export const nowMinutesLA = () =>
  toMin(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date()));

export function useNow() {
  const [now, setNow] = useState(() => ({ date: todayLA(), min: nowMinutesLA() }));
  useEffect(() => {
    const t = setInterval(() => setNow({ date: todayLA(), min: nowMinutesLA() }), 30000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export const todayWeekIndex = () => clampWeek(weekIndexFor(todayLA()));

/** Engine output for one week: prayer windows + per-day analysis, using the shared store. */
export function useWeekAnalysis(week: number, prefetchNeighbours = false) {
  const { state } = useStore();
  const dates = useMemo(() => weekDates(week), [week]);
  const fetchDates = useMemo(
    () => (prefetchNeighbours ? [...dates, ...weekDates(clampWeek(week - 1)), ...weekDates(clampWeek(week + 1))] : dates),
    [dates, week, prefetchNeighbours],
  );
  const { days: prayerDays, source } = usePrayerTimes(fetchDates);
  const interested = useMemo(() => new Set(state.interested), [state.interested]);

  const windows = useMemo(() => {
    const out: Record<string, DayWindows | undefined> = {};
    for (const d of dates) out[d] = prayerDays[d] ? getPrayerWindows(d, prayerDays[d], state.jummah) : undefined;
    return out;
  }, [dates, prayerDays, state.jummah]);

  const analyses = useMemo(() => {
    const out: Record<string, DayAnalysis> = {};
    for (const d of dates) out[d] = analyzeDay(d, state.classes, state.commitments, SAMPLE_EVENTS, interested, windows[d] ?? null);
    return out;
  }, [dates, state.classes, state.commitments, interested, windows]);

  const prayerWarnings = useMemo(() => {
    let n = 0;
    for (const d of dates) for (const b of analyses[d].schedule) if ((analyses[d].results[b.id]?.level ?? "none") !== "none") n++;
    return n;
  }, [dates, analyses]);

  return { dates, windows, analyses, source, interested, prayerWarnings };
}

export interface PrayerSlot {
  name: string;
  start: number;
}

/** Today's prayers as a timeline (Jummah replaces Dhuhr on Fridays) and which one is next. */
export function useTodayPrayers() {
  const now = useNow();
  const { state } = useStore();
  const tomorrow = addDays(now.date, 1);
  const { days, source } = usePrayerTimes(useMemo(() => [now.date, tomorrow], [now.date, tomorrow]));
  return useMemo(() => {
    const t = days[now.date];
    if (!t) return { slots: [] as PrayerSlot[], next: null as PrayerSlot | null, nextIsTomorrow: false, source, now };
    const w = getPrayerWindows(now.date, t, state.jummah);
    const slots: PrayerSlot[] = [];
    for (const x of w.windows) {
      if (x.name === "Asr" && w.jummah.length) slots.push(...w.jummah.map((j) => ({ name: j.name, start: j.start })));
      slots.push({ name: x.name, start: x.start });
    }
    let next = slots.find((s) => s.start > now.min) ?? null;
    let nextIsTomorrow = false;
    if (!next && days[tomorrow]) {
      next = { name: "Fajr", start: days[tomorrow].fajr };
      nextIsTomorrow = true;
    }
    return { slots, next, nextIsTomorrow, source, now };
  }, [days, now, tomorrow, state.jummah, source]);
}

export function untilText(fromMin: number, toMinute: number, tomorrow = false): string {
  let diff = toMinute - fromMin + (tomorrow ? 1440 : 0);
  if (diff < 0) diff += 1440;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return h ? `${h}h ${m}m` : `${m} min`;
}
