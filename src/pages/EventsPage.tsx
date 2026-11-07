import { useMemo, useState } from "react";
import { SAMPLE_EVENTS } from "../data/sample";
import { analyzeDay, doubleBookings } from "../engine/schedule";
import { LAST_WEEK, weekIndexFor, weekLabel, weekRangeLabel } from "../engine/time";
import { useStore } from "../lib/store";
import type { MsoEvent } from "../engine/types";
import { useNow } from "../lib/useWeek";
import { downloadIcs } from "../lib/calendar";
import { EventCard } from "../components/EventsPanel";
import { EventSheet } from "../components/Sheets";
import { PageHeader, pageWash } from "./PageHeader";

const sortKey = (e: MsoEvent) => e.date + (e.time === "unknown" || !e.start ? "99:99" : e.time === "all-day" ? "00:00" : e.start);

export default function EventsPage() {
  const { state, toggleInterested } = useStore();
  const now = useNow();
  const [filter, setFilter] = useState("");
  const [upcomingOnly, setUpcomingOnly] = useState(true);
  const [onlyMine, setOnlyMine] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const interested = useMemo(() => new Set(state.interested), [state.interested]);
  const db = useMemo(() => doubleBookings(SAMPLE_EVENTS), []);
  const msoOptions = useMemo(() => Array.from(new Set(SAMPLE_EVENTS.map((e) => e.mso))).sort(), []);
  const overlaps = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const d of new Set(SAMPLE_EVENTS.map((e) => e.date))) Object.assign(out, analyzeDay(d, state.classes, state.commitments, SAMPLE_EVENTS, interested, null).eventOverlaps);
    return out;
  }, [state.classes, state.commitments, interested]);

  const list = SAMPLE_EVENTS.filter((e) => (!filter || e.mso === filter) && (!upcomingOnly || e.date >= now.date) && (!onlyMine || interested.has(e.id)))
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const byWeek = new Map<number, typeof list>();
  for (const e of list) {
    const w = Math.min(LAST_WEEK, weekIndexFor(e.date));
    byWeek.set(w, [...(byWeek.get(w) || []), e]);
  }
  const openEvent = SAMPLE_EVENTS.find((e) => e.id === open);

  return (
    <div style={pageWash("events")}>
      <PageHeader section="events" sub={`${SAMPLE_EVENTS.length} events from every Muslim student org this quarter. Star the ones you're interested in.`}>
        <button onClick={() => downloadIcs(SAMPLE_EVENTS.filter((e) => interested.has(e.id)))} disabled={!interested.size}
          className="rounded-full border border-white/25 px-4 py-2 text-sm font-semibold hover:bg-white/5 disabled:opacity-40">
          Download interested (.ics)
        </button>
      </PageHeader>
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by MSO" className="rounded-xl border border-white/10 bg-surface px-3 py-2">
            <option value="">All MSOs</option>
            {msoOptions.map((m) => <option key={m}>{m}</option>)}
          </select>
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-[#FFCD00]" checked={upcomingOnly} onChange={(e) => setUpcomingOnly(e.target.checked)} /> Upcoming only</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-[#FFCD00]" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} /> Interested only</label>
        </div>
        {list.length === 0 && <p className="mt-6 rounded-2xl border border-dashed border-white/15 p-4 text-center text-sm text-muted">No events match. Try clearing a filter.</p>}
        {[...byWeek.entries()].map(([w, evs]) => (
          <section key={w} className="mt-6">
            <h2 className="flex items-baseline gap-2">
              <span className="font-display text-xl font-semibold">{weekLabel(w)}</span>
              <span className="font-mono text-xs text-muted">{weekRangeLabel(w)}</span>
            </h2>
            <ul className="mt-2 space-y-2">
              {evs.map((e) => (
                <EventCard key={e.id} e={e} showDate on={interested.has(e.id)} toggle={() => toggleInterested(e.id)} db={db[e.id]} ov={overlaps[e.id]} onOpen={() => setOpen(e.id)} />
              ))}
            </ul>
          </section>
        ))}
      </div>
      {openEvent && <EventSheet e={openEvent} on={interested.has(openEvent.id)} toggle={() => toggleInterested(openEvent.id)} db={db[openEvent.id]} ov={overlaps[openEvent.id]} onClose={() => setOpen(null)} />}
    </div>
  );
}
