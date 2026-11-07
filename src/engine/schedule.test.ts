import { describe, it, expect } from "vitest";
import { expandDay, doubleBookings, analyzeDay } from "./schedule";
import { getPrayerWindows, JUMMAH } from "./conflicts";
import { SAMPLE_CLASSES, SAMPLE_COMMITMENTS, SAMPLE_EVENTS } from "../data/sample";
import { computeOfflineMonth } from "../lib/prayerTimes";

const nov = computeOfflineMonth(2026, 11).days;

describe("schedule expansion", () => {
  it("classes recur only in weeks 1-10", () => {
    expect(expandDay("2026-11-04", SAMPLE_CLASSES, SAMPLE_COMMITMENTS).map((b) => b.title)).toContain("CAT 125R");
    expect(expandDay("2026-09-23", SAMPLE_CLASSES, SAMPLE_COMMITMENTS)).toEqual([]); // Week 0
    expect(expandDay("2026-12-09", SAMPLE_CLASSES, SAMPLE_COMMITMENTS)).toEqual([]); // Finals
  });
  it("finds the Nov 10 double-booking both ways", () => {
    const db = doubleBookings(SAMPLE_EVENTS);
    expect(db.e32).toContain("Qamar Society x BMP");
    expect(db.e33).toContain("APD Event");
  });
  it("unknown and all-day events are excluded from double-booking", () => {
    const db = doubleBookings(SAMPLE_EVENTS);
    expect(db.e36).toBeUndefined();
    expect(db.e35).toBeUndefined();
  });
  it("Qamar Faith Discussion overlaps CSE 101 on Nov 3", () => {
    const r = analyzeDay("2026-11-03", SAMPLE_CLASSES, SAMPLE_COMMITMENTS, SAMPLE_EVENTS, new Set(), getPrayerWindows("2026-11-03", nov["2026-11-03"], JUMMAH));
    expect(r.eventOverlaps.e28).toContain("CSE 101");
  });
  it("MTC Event on Nov 12 overlaps the work shift", () => {
    const r = analyzeDay("2026-11-12", SAMPLE_CLASSES, SAMPLE_COMMITMENTS, SAMPLE_EVENTS, new Set(), getPrayerWindows("2026-11-12", nov["2026-11-12"], JUMMAH));
    expect(r.eventOverlaps.e35).toContain("Work shift");
  });
  it("real times: CAT 125R conflict, ECON 1 conflict, CSE 100 none", () => {
    const wed = analyzeDay("2026-11-04", SAMPLE_CLASSES, SAMPLE_COMMITMENTS, SAMPLE_EVENTS, new Set(), getPrayerWindows("2026-11-04", nov["2026-11-04"], JUMMAH));
    expect(wed.results["c5@2026-11-04"].level).toBe("conflict");
    expect(wed.results["c1@2026-11-04"].level).toBe("none");
    const fri = analyzeDay("2026-11-06", SAMPLE_CLASSES, SAMPLE_COMMITMENTS, SAMPLE_EVENTS, new Set(), getPrayerWindows("2026-11-06", nov["2026-11-06"], JUMMAH));
    expect(fri.results["c6@2026-11-06"].level).toBe("conflict");
  });
  it("MSO events are never prayer-flagged and don't eat prayer time for classes", () => {
    const interested = new Set(["e31"]); // hackathon covers Asr on Nov 6
    const fri = analyzeDay("2026-11-06", SAMPLE_CLASSES, SAMPLE_COMMITMENTS, SAMPLE_EVENTS, interested, getPrayerWindows("2026-11-06", nov["2026-11-06"], JUMMAH));
    expect(fri.results["e31"]).toBeUndefined();
    expect(fri.interestedBlocks.map((b) => b.id)).toContain("e31");
  });
});
