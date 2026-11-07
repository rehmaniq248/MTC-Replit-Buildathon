import { CalculationMethod, Coordinates, Madhab, PrayerTimes } from "adhan";
import type { DayPrayerTimes } from "../engine/conflicts";
import { TZ, toMin } from "../engine/time";

const LAT = 32.8801;
const LNG = -117.234;
const CACHE_PREFIX = "msoweek-prayer:";
const TIMEOUT_MS = 3000;

export type PrayerSource = "api" | "offline" | "approx";
export interface MonthTimes {
  source: PrayerSource;
  days: Record<string, DayPrayerTimes>; // keyed by YYYY-MM-DD
}

const pad = (n: number) => String(n).padStart(2, "0");
const monthKey = (y: number, m: number) => `${y}-${pad(m)}`;
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

function readCache(key: string): MonthTimes | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? (JSON.parse(raw) as MonthTimes) : null;
  } catch {
    return null;
  }
}
function writeCache(key: string, v: MonthTimes) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(v));
  } catch {
    /* storage full or blocked: ignore */
  }
}

async function fetchApiMonth(y: number, m: number): Promise<MonthTimes> {
  const url = `https://api.aladhan.com/v1/calendar/${y}/${m}?latitude=${LAT}&longitude=${LNG}&method=2&timezonestring=${encodeURIComponent(TZ)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const days: Record<string, DayPrayerTimes> = {};
    for (const d of json.data as any[]) {
      const [dd, mm, yyyy] = String(d.date.gregorian.date).split("-");
      const t = d.timings;
      days[`${yyyy}-${mm}-${dd}`] = {
        fajr: toMin(t.Fajr), sunrise: toMin(t.Sunrise), dhuhr: toMin(t.Dhuhr),
        asr: toMin(t.Asr), maghrib: toMin(t.Maghrib), isha: toMin(t.Isha),
      };
    }
    if (Object.keys(days).length < 28) throw new Error("incomplete month");
    return { source: "api", days };
  } finally {
    clearTimeout(timer);
  }
}

const laClock = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const laMin = (d: Date) => toMin(laClock.format(d));

/** Offline calculation with adhan (ISNA / North America, Shafi). */
export function computeOfflineMonth(y: number, m: number): MonthTimes {
  try {
    const coords = new Coordinates(LAT, LNG);
    const params = CalculationMethod.NorthAmerica();
    params.madhab = Madhab.Shafi;
    const days: Record<string, DayPrayerTimes> = {};
    for (let d = 1; d <= daysInMonth(y, m); d++) {
      // adhan reads the calendar date from the local Y/M/D of this Date
      const pt = new PrayerTimes(coords, new Date(y, m - 1, d, 12), params);
      days[`${y}-${pad(m)}-${pad(d)}`] = {
        fajr: laMin(pt.fajr), sunrise: laMin(pt.sunrise), dhuhr: laMin(pt.dhuhr),
        asr: laMin(pt.asr), maghrib: laMin(pt.maghrib), isha: laMin(pt.isha),
      };
    }
    return { source: "offline", days };
  } catch {
    return approxMonth(y, m);
  }
}

/** Last-resort, clearly approximate fixed times. */
function approxMonth(y: number, m: number): MonthTimes {
  const days: Record<string, DayPrayerTimes> = {};
  for (let d = 1; d <= daysInMonth(y, m); d++) {
    days[`${y}-${pad(m)}-${pad(d)}`] = {
      fajr: toMin("05:15"), sunrise: toMin("06:30"), dhuhr: toMin("12:00"),
      asr: toMin("15:00"), maghrib: toMin("17:30"), isha: toMin("18:50"),
    };
  }
  return { source: "approx", days };
}

/** Get a month's prayer times: cache, then API (3s timeout), then offline calculation. Never throws. */
export async function getMonthTimes(y: number, m: number): Promise<MonthTimes> {
  const key = monthKey(y, m);
  const cached = readCache(key);
  if (cached) return cached;
  try {
    const api = await fetchApiMonth(y, m);
    writeCache(key, api);
    return api;
  } catch {
    return computeOfflineMonth(y, m); // not cached, so we retry the API next time
  }
}

/** Times for a set of dates (fetches each month the dates touch). */
export async function getTimesForDates(dates: string[]): Promise<{ days: Record<string, DayPrayerTimes>; source: PrayerSource }> {
  const months = Array.from(new Set(dates.map((d) => d.slice(0, 7))));
  const results = await Promise.all(months.map((k) => getMonthTimes(Number(k.slice(0, 4)), Number(k.slice(5, 7)))));
  const days: Record<string, DayPrayerTimes> = {};
  let source: PrayerSource = "api";
  for (const r of results) {
    Object.assign(days, r.days);
    if (r.source === "approx") source = "approx";
    else if (r.source === "offline" && source === "api") source = "offline";
  }
  return { days, source };
}
