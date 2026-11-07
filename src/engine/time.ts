import type { DayName } from "./types";

export const TZ = "America/Los_Angeles";
/** Monday of Week 0 (Welcome Week). Single source of truth for week numbering. */
export const TERM_START = "2026-09-21";
export const FIRST_WEEK = 0;
export const LAST_WEEK = 11; // Finals Week (Dec 7 - Dec 13)
export const CLASS_WEEKS = { from: 1, to: 10 };

const DAY_NAMES: DayName[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEK_DAYS: DayName[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "HH:MM" (optionally with a suffix like " (PST)") -> minutes since midnight. */
export function toMin(hhmm: string): number {
  const clean = hhmm.trim().split(" ")[0];
  const [h, m] = clean.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function toHHMM(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = Math.round(min % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** minutes -> "3:30 PM" */
export function fmtTime(min: number): string {
  if (min >= 1440) return "12:00 AM";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function parts(date: string): [number, number, number] {
  const [y, m, d] = date.split("-").map(Number);
  return [y, m, d];
}
function utcMs(date: string): number {
  const [y, m, d] = parts(date);
  return Date.UTC(y, m - 1, d);
}
function fromUtcMs(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function addDays(date: string, n: number): string {
  return fromUtcMs(utcMs(date) + n * 86400000);
}
export function daysBetween(a: string, b: string): number {
  return Math.round((utcMs(b) - utcMs(a)) / 86400000);
}
export function dayOfWeek(date: string): DayName {
  return DAY_NAMES[new Date(utcMs(date)).getUTCDay()];
}
export function fmtDate(date: string): string {
  const [, m, d] = parts(date);
  return `${MONTHS[m - 1]} ${d}`;
}

/** Today's date in LA as YYYY-MM-DD. */
export function todayLA(now = new Date()): string {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  return f.format(now);
}

export function weekIndexFor(date: string): number {
  return Math.floor(daysBetween(TERM_START, date) / 7);
}
export function clampWeek(i: number): number {
  return Math.max(FIRST_WEEK, Math.min(LAST_WEEK, i));
}
export function mondayOf(weekIndex: number): string {
  return addDays(TERM_START, weekIndex * 7);
}
export function weekDates(weekIndex: number): string[] {
  const mon = mondayOf(weekIndex);
  return WEEK_DAYS.map((_, i) => addDays(mon, i));
}
export function weekLabel(i: number): string {
  if (i === 0) return "Week 0 (Welcome Week)";
  if (i === LAST_WEEK) return "Finals Week";
  return `Week ${i}`;
}
export function weekRangeLabel(i: number): string {
  const d = weekDates(i);
  return `${fmtDate(d[0])} - ${fmtDate(d[6])}`;
}
