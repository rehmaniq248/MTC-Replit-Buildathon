import type { ClassItem, ConflictResult, DayName, JummahSession } from "../engine/types";
import { fmtTime, toMin } from "../engine/time";

const FULL: Record<DayName, string> = { Mon: "Mondays", Tue: "Tuesdays", Wed: "Wednesdays", Thu: "Thursdays", Fri: "Fridays", Sat: "Saturdays", Sun: "Sundays" };

export function listDays(days: DayName[]): string {
  const f = days.map((d) => FULL[d]);
  if (f.length <= 1) return f[0] || "";
  return `${f.slice(0, -1).join(", ")} and ${f[f.length - 1]}`;
}

export function profLastName(profName: string): string {
  const cleaned = profName.replace(/^(dr|prof|professor|mr|mrs|ms)\.?\s+/i, "").trim();
  if (!cleaned) return "";
  const parts = cleaned.split(/\s+/);
  return parts[parts.length - 1];
}

export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
}

export function buildAccommodationEmail(c: ClassItem, r: ConflictResult, yourName: string, jummah: JummahSession[]): EmailDraft {
  const name = yourName.trim() || "[Your name]";
  const last = profLastName(c.profName);
  const greeting = last ? `Professor ${last}` : "Professor";
  const meets = `${c.course} meets ${listDays(c.days)} from ${fmtTime(toMin(c.start))} to ${fmtTime(toMin(c.end))}.`;

  let prayerLine: string;
  if (r.prayer === "Jummah") {
    const times = jummah.map((j) => fmtTime(j.start));
    const which = (r.jummahOverlaps ?? 0) >= 2 ? "both sessions" : "one of the sessions";
    prayerLine = `On Fridays, the congregational prayer (Jummah) is held at ${times.join(" and ")}, and class overlaps ${which}.`;
  } else {
    const coverage = r.coversWhole ? "covers the whole window" : "overlaps part of the window";
    prayerLine = `On those days, ${r.prayer} begins around ${fmtTime(r.windowStart ?? 0)} and its window closes around ${fmtTime(r.windowEnd ?? 0)}, so class ${coverage}.`;
  }

  const body = `Hi ${greeting},

My name is ${name} and I'm in your ${c.course} class. I'm a Muslim student and I wanted to reach out early about a scheduling overlap with one of my daily prayers.

${meets} ${prayerLine} These times shift slightly through the quarter.

Would it be possible to step out for about 10-15 minutes during class to pray, or would you prefer a different arrangement? I'm happy to make up any material I miss and will do my best to be unobtrusive.

Thank you for your time and understanding.

Best,
${name}`;

  return { to: c.profEmail || "", subject: `Prayer accommodation request - ${c.course}`, body };
}

export const mailtoUrl = (d: EmailDraft) =>
  `mailto:${encodeURIComponent(d.to)}?subject=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(d.body)}`;

export const gmailUrl = (d: EmailDraft) =>
  `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(d.to)}&su=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(d.body)}`;
