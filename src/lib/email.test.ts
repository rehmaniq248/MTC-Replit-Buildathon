import { describe, it, expect } from "vitest";
import { buildAccommodationEmail, listDays, profLastName, mailtoUrl } from "./email";
import { SAMPLE_CLASSES } from "../data/sample";

describe("accommodation email", () => {
  it("helpers", () => {
    expect(listDays(["Mon", "Wed", "Fri"])).toBe("Mondays, Wednesdays and Fridays");
    expect(profLastName("Dr. Nguyen")).toBe("Nguyen");
    expect(profLastName("")).toBe("");
  });
  it("Maghrib draft for CAT 125R", () => {
    const c = SAMPLE_CLASSES.find((x) => x.id === "c5")!;
    const d = buildAccommodationEmail(c, { level: "conflict", reason: "", prayer: "Maghrib", windowStart: 1013, windowEnd: 1083, coversWhole: true }, "", []);
    expect(d.to).toBe("nguyen@example.edu");
    expect(d.subject).toBe("Prayer accommodation request - CAT 125R");
    expect(d.body).toContain("Hi Professor Nguyen,");
    expect(d.body).toContain("CAT 125R meets Wednesdays from 3:30 PM to 6:20 PM.");
    expect(d.body).toContain("Maghrib begins around 4:53 PM");
    expect(d.body).toContain("covers the whole window");
    expect(d.body).toContain("[Your name]");
    expect(mailtoUrl(d)).toContain("Prayer%20accommodation");
  });
  it("Jummah draft", () => {
    const c = SAMPLE_CLASSES.find((x) => x.id === "c6")!;
    const d = buildAccommodationEmail(c, { level: "conflict", reason: "", prayer: "Jummah", jummahOverlaps: 2 }, "Aisha", [
      { name: "Jummah 1", start: 735, end: 780 }, { name: "Jummah 2", start: 795, end: 840 },
    ]);
    expect(d.body).toContain("held at 12:15 PM and 1:15 PM, and class overlaps both sessions");
    expect(d.body).toContain("My name is Aisha");
  });
});

import { buildIcs, googleCalendarUrl } from "./calendar";
import { SAMPLE_EVENTS } from "../data/sample";
describe("calendar export", () => {
  it("google link uses LA timezone and event times", () => {
    const u = googleCalendarUrl(SAMPLE_EVENTS.find((e) => e.id === "e31")!);
    expect(u).toContain("dates=20261106T143000%2F20261106T203000");
    expect(u).toContain("ctz=America%2FLos_Angeles");
  });
  it("ics has timed and all-day events", () => {
    const ics = buildIcs(SAMPLE_EVENTS.filter((e) => e.id === "e31" || e.id === "e36"));
    expect(ics).toContain("DTSTART;TZID=America/Los_Angeles:20261106T143000");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261112");
  });
});
