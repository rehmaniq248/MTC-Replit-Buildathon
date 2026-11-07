import type { MsoEvent } from "../engine/types";
import { addDays } from "../engine/time";

const compactDate = (d: string) => d.replace(/-/g, "");
const compactTime = (t: string) => t.replace(":", "") + "00";
const timed = (e: MsoEvent) => (e.time === "exact" || e.time === "end-assumed") && e.start && e.end;

export function googleCalendarUrl(e: MsoEvent): string {
  const dates = timed(e)
    ? `${compactDate(e.date)}T${compactTime(e.start!)}/${compactDate(e.date)}T${compactTime(e.end!)}`
    : `${compactDate(e.date)}/${compactDate(addDays(e.date, 1))}`;
  const p = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates, ctz: "America/Los_Angeles", details: `${e.mso} event (from MSA ILM+)` });
  if (e.location) p.set("location", e.location);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\;");

export function buildIcs(events: MsoEvent[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MSA ILM+//EN", "CALSCALE:GREGORIAN"];
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${e.id}-${e.date}@msoweek`, `DTSTAMP:${stamp}`, `SUMMARY:${esc(e.title)}`);
    if (timed(e)) {
      lines.push(`DTSTART;TZID=America/Los_Angeles:${compactDate(e.date)}T${compactTime(e.start!)}`);
      lines.push(`DTEND;TZID=America/Los_Angeles:${compactDate(e.date)}T${compactTime(e.end!)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compactDate(e.date)}`, `DTEND;VALUE=DATE:${compactDate(addDays(e.date, 1))}`);
    }
    if (e.location) lines.push(`LOCATION:${esc(e.location)}`);
    lines.push(`DESCRIPTION:${esc(e.mso + (e.time === "unknown" ? " · Time not announced" : ""))}`, "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(events: MsoEvent[]) {
  const blob = new Blob([buildIcs(events)], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mso-week-interested.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
