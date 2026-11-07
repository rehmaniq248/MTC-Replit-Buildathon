// Pure conflict engine. No UI imports.
import type { Block, ConflictResult, DayWindows, JummahSession, PrayerWindow } from "./types";
import { TZ, dayOfWeek, toMin } from "./time";

// CONFIRM WITH MSA
export const JUMMAH = {
  standard: ["12:15", "13:15"], // Standard time (PST), about November to mid-March
  daylight: ["13:15", "14:15"], // Daylight time (PDT), about mid-March to early November
  durationMinutes: 45,
};
export type JummahConfig = typeof JUMMAH;

export const TIGHT_MINUTES = 15;
const MIDNIGHT = 24 * 60;

export interface DayPrayerTimes {
  fajr: number;
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

/** True if the date is on daylight time in Los Angeles (checked at local noon; never hardcodes DST dates). */
export function isDaylightTime(date: string): boolean {
  const [y, m, d] = date.split("-").map(Number);
  // 20:00 UTC is noon PST / 1 PM PDT, safely mid-day either way
  const probe = new Date(Date.UTC(y, m - 1, d, 20, 0, 0));
  const name = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "short" })
    .formatToParts(probe)
    .find((p) => p.type === "timeZoneName")?.value;
  return name === "PDT";
}

export function getJummahSessions(date: string, cfg: JummahConfig = JUMMAH): JummahSession[] {
  if (dayOfWeek(date) !== "Fri") return [];
  const starts = isDaylightTime(date) ? cfg.daylight : cfg.standard;
  return starts.map((s, i) => ({ name: `Jummah ${i + 1}`, start: toMin(s), end: toMin(s) + cfg.durationMinutes }));
}

/** Prayer windows for a day. On Fridays, Jummah replaces the Dhuhr window. */
export function getPrayerWindows(date: string, t: DayPrayerTimes, cfg: JummahConfig = JUMMAH): DayWindows {
  const jummah = getJummahSessions(date, cfg);
  const all: PrayerWindow[] = [
    { name: "Fajr", start: t.fajr, end: t.sunrise },
    { name: "Dhuhr", start: t.dhuhr, end: t.asr },
    { name: "Asr", start: t.asr, end: t.maghrib },
    { name: "Maghrib", start: t.maghrib, end: t.isha },
    { name: "Isha", start: t.isha, end: MIDNIGHT },
  ];
  const windows = jummah.length ? all.filter((w) => w.name !== "Dhuhr") : all;
  return { date, windows, jummah };
}

const overlaps = (aS: number, aE: number, bS: number, bE: number) => aS < bE && bS < aE;

/** Longest continuous free gap (minutes) inside [start,end] after removing busy intervals. */
export function longestFreeGap(start: number, end: number, busy: { start: number; end: number }[]): number {
  const cut = busy
    .filter((b) => overlaps(b.start, b.end, start, end))
    .map((b) => [Math.max(b.start, start), Math.min(b.end, end)] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  let cursor = start;
  let best = 0;
  for (const [s, e] of cut) {
    if (s > cursor) best = Math.max(best, s - cursor);
    cursor = Math.max(cursor, e);
  }
  best = Math.max(best, end - cursor);
  return best;
}

const RANK = { none: 0, tight: 1, conflict: 2 } as const;

/**
 * Check one block against the day's prayer windows, taking ALL of the day's busy blocks into account.
 * Only windows the block actually overlaps are considered.
 */
export function detectConflicts(block: Block, dayBlocks: Block[], day: DayWindows): ConflictResult {
  const busy = dayBlocks.some((b) => b.id === block.id) ? dayBlocks : [...dayBlocks, block];
  let worst: ConflictResult = { level: "none", reason: "No prayer conflicts" };
  const consider = (r: ConflictResult) => {
    if (RANK[r.level] > RANK[worst.level]) worst = r;
  };

  // Jummah (Fridays)
  if (day.jummah.length) {
    const hit = day.jummah.filter((j) => overlaps(block.start, block.end, j.start, j.end));
    const base = { prayer: "Jummah", jummahOverlaps: hit.length, windowStart: day.jummah[0].start, windowEnd: day.jummah[day.jummah.length - 1].end };
    if (hit.length >= 2 && hit.length === day.jummah.length) {
      consider({ ...base, level: "conflict", reason: "Overlaps both Jummah sessions" });
    } else if (hit.length >= 1) {
      consider({ ...base, level: "tight", reason: `Overlaps ${hit[0].name}. Can attend the other session` });
    }
  }

  for (const w of day.windows) {
    if (w.end <= w.start || !overlaps(block.start, block.end, w.start, w.end)) continue;
    const coversWhole = block.start <= w.start && block.end >= w.end;
    const gap = longestFreeGap(w.start, w.end, busy);
    const base = { prayer: w.name, windowStart: w.start, windowEnd: w.end, coversWhole };
    if (gap <= 0) {
      consider({
        ...base,
        level: "conflict",
        reason: coversWhole ? `Covers the whole ${w.name} window` : `No free time left in the ${w.name} window`,
      });
    } else if (gap < TIGHT_MINUTES) {
      consider({ ...base, level: "tight", reason: `Only ${gap} min free in the ${w.name} window` });
    } else {
      const nearEdge = [block.start, block.end].some((t) =>
        [w.start, w.end].some((edge) => Math.abs(t - edge) < TIGHT_MINUTES),
      );
      if (nearEdge) consider({ ...base, level: "tight", reason: `Close to the edge of the ${w.name} window` });
    }
  }
  return worst;
}
