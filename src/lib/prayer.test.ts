import { describe, it, expect } from "vitest";
import { computeOfflineMonth } from "./prayerTimes";
import { fmtTime } from "../engine/time";

describe("offline prayer calc", () => {
  it("gives plausible San Diego times for Nov 6 2026", () => {
    const t = computeOfflineMonth(2026, 11).days["2026-11-06"];
    console.log(Object.entries(t).map(([k, v]) => `${k} ${fmtTime(v)}`).join(", "));
    expect(t.maghrib).toBeGreaterThan(16 * 60 + 30);
    expect(t.maghrib).toBeLessThan(17 * 60 + 15);
    expect(t.dhuhr).toBeGreaterThan(11 * 60 + 30);
  });
});
