import { describe, it, expect } from "vitest";
import {
  JUMMAH,
  getPrayerWindows,
  detectConflicts,
  isDaylightTime,
  type DayPrayerTimes,
} from "./conflicts";
import { toMin, dayOfWeek, weekIndexFor, weekLabel, addDays } from "./time";
import type { Block } from "./types";

// Realistic ISNA-ish times for UCSD (minutes since local midnight)
const NOV_TIMES: DayPrayerTimes = {
  fajr: toMin("05:05"), sunrise: toMin("06:15"), dhuhr: toMin("11:42"),
  asr: toMin("14:38"), maghrib: toMin("16:53"), isha: toMin("18:12"),
};
const OCT_TIMES: DayPrayerTimes = {
  fajr: toMin("05:20"), sunrise: toMin("06:40"), dhuhr: toMin("12:35"),
  asr: toMin("15:55"), maghrib: toMin("18:35"), isha: toMin("19:50"),
};

const blk = (id: string, date: string, start: string, end: string, kind: Block["kind"] = "class"): Block => ({
  id, kind, title: id, date, start: toMin(start), end: toMin(end),
});

describe("time helpers", () => {
  it("parses HH:MM and strips API suffix", () => {
    expect(toMin("17:02 (PST)")).toBe(17 * 60 + 2);
  });
  it("day of week is timezone independent", () => {
    expect(dayOfWeek("2026-11-06")).toBe("Fri");
    expect(dayOfWeek("2026-11-02")).toBe("Mon");
  });
  it("week labels", () => {
    expect(weekIndexFor("2026-11-06")).toBe(6);
    expect(weekLabel(0)).toBe("Week 0 (Welcome Week)");
    expect(weekLabel(6)).toBe("Week 6");
    expect(weekIndexFor("2026-12-08")).toBe(11);
    expect(weekLabel(11)).toBe("Finals Week");
    expect(addDays("2026-10-31", 2)).toBe("2026-11-02");
  });
});

describe("Jummah season", () => {
  it("uses real LA offset, not hardcoded dates", () => {
    expect(isDaylightTime("2026-11-06")).toBe(false); // PST after Nov 1 2026
    expect(isDaylightTime("2026-10-02")).toBe(true); // PDT
  });
  it("standard-time Friday has 12:15 and 1:15", () => {
    const w = getPrayerWindows("2026-11-06", NOV_TIMES, JUMMAH);
    expect(w.jummah.map((j) => j.start)).toEqual([toMin("12:15"), toMin("13:15")]);
    expect(w.jummah.map((j) => j.name)).toEqual(["Jummah 1", "Jummah 2"]);
  });
  it("daylight Friday has 1:15 and 2:15", () => {
    const w = getPrayerWindows("2026-10-02", OCT_TIMES, JUMMAH);
    expect(w.jummah.map((j) => j.start)).toEqual([toMin("13:15"), toMin("14:15")]);
  });
  it("no Jummah on non-Fridays", () => {
    expect(getPrayerWindows("2026-11-04", NOV_TIMES, JUMMAH).jummah).toEqual([]);
  });
});

describe("detectConflicts", () => {
  it("CAT 125R on Wednesday covers Maghrib -> conflict", () => {
    const cat = blk("CAT 125R", "2026-11-04", "15:30", "18:20");
    const day = [blk("CSE 100", "2026-11-04", "10:00", "10:50"), blk("CSE 120", "2026-11-04", "13:00", "13:50"), cat];
    const r = detectConflicts(cat, day, getPrayerWindows("2026-11-04", NOV_TIMES, JUMMAH));
    expect(r.level).toBe("conflict");
    expect(r.prayer).toBe("Maghrib");
  });
  it("ECON 1 on standard-time Friday overlaps both Jummah -> conflict", () => {
    const econ = blk("ECON 1", "2026-11-06", "12:00", "13:50");
    const r = detectConflicts(econ, [econ], getPrayerWindows("2026-11-06", NOV_TIMES, JUMMAH));
    expect(r.level).toBe("conflict");
    expect(r.prayer).toBe("Jummah");
  });
  it("class overlapping only one Jummah session -> tight", () => {
    const econ = blk("ECON 1", "2026-10-02", "12:00", "13:50");
    const r = detectConflicts(econ, [econ], getPrayerWindows("2026-10-02", OCT_TIMES, JUMMAH));
    expect(r.level).toBe("tight");
    expect(r.reason).toContain("Can attend the other session");
  });
  it("CSE 100 and ANTH 10 are not flagged", () => {
    const cse = blk("CSE 100", "2026-11-04", "10:00", "10:50");
    expect(detectConflicts(cse, [cse], getPrayerWindows("2026-11-04", NOV_TIMES, JUMMAH)).level).toBe("none");
    const anth = blk("ANTH 10", "2026-11-03", "11:00", "12:20");
    const cse101 = blk("CSE 101", "2026-11-03", "14:00", "15:20");
    expect(detectConflicts(anth, [anth, cse101], getPrayerWindows("2026-11-03", NOV_TIMES, JUMMAH)).level).toBe("none");
  });
  it("class inside a long Dhuhr window with plenty of free time is not flagged", () => {
    const c = blk("X", "2026-11-03", "12:30", "13:30");
    expect(detectConflicts(c, [c], getPrayerWindows("2026-11-03", NOV_TIMES, JUMMAH)).level).toBe("none");
  });
  it("other busy blocks count: window fully booked by two blocks -> conflict", () => {
    const a = blk("A", "2026-11-03", "16:00", "17:30");
    const b = blk("B", "2026-11-03", "17:30", "19:00");
    const r = detectConflicts(a, [a, b], getPrayerWindows("2026-11-03", NOV_TIMES, JUMMAH));
    expect(r.level).toBe("conflict");
    expect(r.prayer).toBe("Maghrib");
  });
  it("less than 15 min free -> tight", () => {
    const a = blk("A", "2026-11-03", "16:00", "17:00");
    const b = blk("B", "2026-11-03", "17:10", "19:00");
    expect(detectConflicts(a, [a, b], getPrayerWindows("2026-11-03", NOV_TIMES, JUMMAH)).level).toBe("tight");
  });
  it("starting within 15 min of window end -> tight", () => {
    const a = blk("A", "2026-11-03", "18:05", "18:50"); // Maghrib ends 18:12
    const r = detectConflicts(a, [a], getPrayerWindows("2026-11-03", NOV_TIMES, JUMMAH));
    expect(r.level).toBe("tight");
  });
});
