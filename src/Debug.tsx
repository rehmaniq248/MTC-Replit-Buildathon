import { useMemo, useState } from "react";
import { SAMPLE_CLASSES, SAMPLE_COMMITMENTS, SAMPLE_EVENTS } from "./data/sample";
import { JUMMAH, getPrayerWindows } from "./engine/conflicts";
import { analyzeDay, doubleBookings, eventBlock } from "./engine/schedule";
import { FIRST_WEEK, LAST_WEEK, clampWeek, fmtDate, fmtTime, todayLA, weekDates, weekIndexFor, weekLabel } from "./engine/time";
import type { ConflictLevel } from "./engine/types";
import { usePrayerTimes } from "./lib/usePrayerTimes";

const color: Record<ConflictLevel, string> = { none: "text-emerald-300", tight: "text-gold", conflict: "text-red-400" };

export default function Debug() {
  const [week, setWeek] = useState(clampWeek(weekIndexFor(todayLA())));
  const dates = useMemo(() => weekDates(week), [week]);
  const allEventDates = useMemo(() => Array.from(new Set(SAMPLE_EVENTS.map((e) => e.date))), []);
  const { days, source } = usePrayerTimes(useMemo(() => [...dates, ...allEventDates], [dates, allEventDates]));
  const db = useMemo(() => doubleBookings(SAMPLE_EVENTS), []);

  return (
    <div className="mx-auto max-w-5xl p-4 text-sm">
      <a href="#/" className="text-sky underline">← Back to app</a>
      <h1 className="mt-2 text-2xl font-bold text-gold">Engine debug</h1>
      <p className="text-muted">Prayer source: {source ?? "loading…"}</p>

      <div className="mt-4 flex items-center gap-2">
        <button className="rounded bg-card px-3 py-1 disabled:opacity-40" disabled={week <= FIRST_WEEK} onClick={() => setWeek(week - 1)}>‹</button>
        <span className="font-semibold">{weekLabel(week)}</span>
        <button className="rounded bg-card px-3 py-1 disabled:opacity-40" disabled={week >= LAST_WEEK} onClick={() => setWeek(week + 1)}>›</button>
      </div>

      <h2 className="mt-4 text-lg font-semibold">Prayer windows</h2>
      <table className="mt-1 w-full">
        <tbody>
          {dates.map((d) => {
            const t = days[d];
            if (!t) return <tr key={d}><td>{fmtDate(d)}</td><td>loading…</td></tr>;
            const w = getPrayerWindows(d, t, JUMMAH);
            return (
              <tr key={d} className="border-t border-card">
                <td className="py-1 pr-2">{fmtDate(d)}</td>
                <td className="py-1">
                  {w.windows.map((x) => `${x.name} ${fmtTime(x.start)}–${fmtTime(x.end)}`).join(" · ")}
                  {w.jummah.length > 0 && <span className="text-gold"> · {w.jummah.map((j) => `${j.name} ${fmtTime(j.start)}`).join(" · ")}</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2 className="mt-4 text-lg font-semibold">Classes & commitments ({weekLabel(week)})</h2>
      <table className="mt-1 w-full">
        <tbody>
          {dates.flatMap((d) => {
            const t = days[d];
            if (!t) return [];
            const a = analyzeDay(d, SAMPLE_CLASSES, SAMPLE_COMMITMENTS, SAMPLE_EVENTS, new Set(), getPrayerWindows(d, t, JUMMAH));
            return a.schedule.map((b) => {
              const r = a.results[b.id];
              return (
                <tr key={b.id} className="border-t border-card">
                  <td className="py-1 pr-2">{fmtDate(d)}</td>
                  <td className="pr-2">{b.title}</td>
                  <td className="pr-2">{fmtTime(b.start)}–{fmtTime(b.end)}</td>
                  <td className={`pr-2 font-semibold ${color[r.level]}`}>{r.level}</td>
                  <td className="text-muted">{r.reason}</td>
                </tr>
              );
            });
          })}
        </tbody>
      </table>

      <h2 className="mt-4 text-lg font-semibold">All events (prayer is included at MSO events, so no prayer check)</h2>
      <table className="mt-1 w-full">
        <tbody>
          {SAMPLE_EVENTS.map((e) => {
            const eb = eventBlock(e);
            const t = days[e.date];
            const level: ConflictLevel | "-" = "-";
            const reason = e.time === "unknown" ? "Time not announced (excluded)" : e.time === "all-day" ? "All-day (excluded)" : "Prayer included";
            const a = t ? analyzeDay(e.date, SAMPLE_CLASSES, SAMPLE_COMMITMENTS, SAMPLE_EVENTS, new Set(), getPrayerWindows(e.date, t, JUMMAH)) : null;
            return (
              <tr key={e.id} className="border-t border-card align-top">
                <td className="py-1 pr-2">{fmtDate(e.date)}</td>
                <td className="pr-2">{e.title}</td>
                <td className="pr-2 whitespace-nowrap">{eb ? `${fmtTime(eb.start)}–${e.time === "end-assumed" ? "~" : ""}${fmtTime(eb.end)}` : e.time}</td>
                <td className={`pr-2 font-semibold ${level === "-" ? "" : color[level]}`}>{level}</td>
                <td className="text-muted">
                  {reason}
                  {a?.eventOverlaps[e.id] && <span className="text-red-400"> · Overlaps {a.eventOverlaps[e.id].join(", ")}</span>}
                  {db[e.id] && <span className="text-gold"> · Double-booked with {db[e.id].join(", ")}</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
