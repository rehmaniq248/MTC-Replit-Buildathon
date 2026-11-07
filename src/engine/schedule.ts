// Pure: expand the recurring schedule into dated blocks and analyze a day.
import type { Block, ClassItem, Commitment, ConflictResult, DayWindows, MsoEvent } from "./types";
import { detectConflicts } from "./conflicts";
import { CLASS_WEEKS, dayOfWeek, toMin, weekIndexFor } from "./time";

const inClassWeeks = (date: string) => {
  const w = weekIndexFor(date);
  return w >= CLASS_WEEKS.from && w <= CLASS_WEEKS.to;
};
const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) => a.start < b.end && b.start < a.end;

/** Classes and commitments happening on a date. */
export function expandDay(date: string, classes: ClassItem[], commitments: Commitment[]): Block[] {
  const dow = dayOfWeek(date);
  const out: Block[] = [];
  if (inClassWeeks(date)) {
    for (const c of classes) {
      if (c.days.includes(dow)) out.push({ id: `${c.id}@${date}`, sourceId: c.id, kind: "class", title: c.course, date, start: toMin(c.start), end: toMin(c.end) });
    }
  }
  for (const c of commitments) {
    const on = c.repeatsWeekly ? inClassWeeks(date) && c.days.includes(dow) : c.date === date;
    if (on) out.push({ id: `${c.id}@${date}`, sourceId: c.id, kind: "commitment", title: c.title, date, start: toMin(c.start), end: toMin(c.end) });
  }
  return out;
}

export const isTimed = (e: MsoEvent) => (e.time === "exact" || e.time === "end-assumed") && !!e.start && !!e.end;

export function eventBlock(e: MsoEvent): Block | null {
  if (!isTimed(e)) return null;
  return { id: e.id, sourceId: e.id, kind: "event", title: e.title, date: e.date, start: toMin(e.start!), end: toMin(e.end!) };
}

/** event id -> titles of other events overlapping it in time (any MSO). Timed events only. */
export function doubleBookings(events: MsoEvent[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const timed = events.map((e) => ({ e, b: eventBlock(e) })).filter((x) => x.b) as { e: MsoEvent; b: Block }[];
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      const a = timed[i], b = timed[j];
      if (a.e.date === b.e.date && overlaps(a.b, b.b)) {
        (out[a.e.id] ||= []).push(b.e.title);
        (out[b.e.id] ||= []).push(a.e.title);
      }
    }
  }
  return out;
}

export interface DayAnalysis {
  date: string;
  schedule: Block[]; // classes + commitments
  interestedBlocks: Block[]; // interested, timed events
  results: Record<string, ConflictResult>; // class/commitment block id -> prayer conflict result
  eventOverlaps: Record<string, string[]>; // event id -> class/commitment titles it overlaps
}

export function analyzeDay(
  date: string,
  classes: ClassItem[],
  commitments: Commitment[],
  events: MsoEvent[],
  interested: Set<string>,
  windows: DayWindows | null,
): DayAnalysis {
  const schedule = expandDay(date, classes, commitments);
  const dayEvents = events.filter((e) => e.date === date);
  const interestedBlocks = dayEvents.filter((e) => interested.has(e.id)).map(eventBlock).filter(Boolean) as Block[];
  // MSO events include prayer, so they are never prayer-flagged and don't use up prayer time.
  const busy = schedule;
  const results: Record<string, ConflictResult> = {};
  if (windows) {
    for (const b of busy) {
      try {
        results[b.id] = detectConflicts(b, busy, windows);
      } catch {
        results[b.id] = { level: "none", reason: "Could not check this block" };
      }
    }
  }
  const eventOverlaps: Record<string, string[]> = {};
  for (const e of dayEvents) {
    const eb = eventBlock(e);
    if (!eb) continue;
    const hits = schedule.filter((s) => overlaps(s, eb)).map((s) => s.title);
    if (hits.length) eventOverlaps[e.id] = hits;
  }
  return { date, schedule, interestedBlocks, results, eventOverlaps };
}
