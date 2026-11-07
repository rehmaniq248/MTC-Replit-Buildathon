import type { MsoEvent } from "../engine/types";
import { dayOfWeek, fmtDate, fmtTime, toMin } from "../engine/time";
import { googleCalendarUrl } from "../lib/calendar";

export function EventTime({ e }: { e: MsoEvent }) {
  if (e.time === "unknown") return <span className="italic text-muted">Time not announced</span>;
  if (e.time === "all-day") return <span>All day</span>;
  if (!e.start || !e.end) return <span className="italic text-muted">Time not announced</span>;
  return (
    <span className="font-mono">
      {fmtTime(toMin(e.start))} – {e.time === "end-assumed" ? <abbr title="End time estimated" className="cursor-help no-underline">~{fmtTime(toMin(e.end))}</abbr> : fmtTime(toMin(e.end))}
    </span>
  );
}

export function StarButton({ on, onClick, compact }: { on: boolean; onClick: () => void; compact?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${on ? "bg-gold text-navy" : "border border-gold/60 text-gold hover:bg-gold/10"} ${compact ? "" : ""}`}
    >
      {on ? "★ Interested" : "☆ Interested"}
    </button>
  );
}

export interface PanelProps {
  dates: string[];
  events: MsoEvent[]; // this week's events, already filtered
  msoOptions: string[];
  filter: string;
  setFilter: (v: string) => void;
  interested: Set<string>;
  toggle: (id: string) => void;
  doubleBooked: Record<string, string[]>;
  overlaps: Record<string, string[]>; // event id -> classes/commitments
  onOpen: (e: MsoEvent) => void;
  onDownloadIcs: () => void;
  interestedCount: number;
}

export function EventsPanel(p: PanelProps) {
  const byDay = p.dates.map((d) => ({ d, list: p.events.filter((e) => e.date === d) })).filter((x) => x.list.length);
  return (
    <section className="rounded-3xl bg-card p-4" aria-label="MSO events this week">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">MSO events this week</h2>
        <span className="text-xs text-muted">{p.events.length} listed</span>
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs text-muted">
        Show
        <select value={p.filter} onChange={(e) => p.setFilter(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-surface px-2 py-1.5 text-sm text-ink">
          <option value="">All MSOs</option>
          {p.msoOptions.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </label>

      {byDay.length === 0 && (
        <p className="mt-6 rounded-2xl border border-dashed border-white/15 p-4 text-center text-sm text-muted">
          {p.filter ? `No ${p.filter} events this week. Try "All MSOs".` : "No events listed for this week yet."}
        </p>
      )}

      <div className="mt-3 space-y-4">
        {byDay.map(({ d, list }) => (
          <div key={d}>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
              {dayOfWeek(d)} · {fmtDate(d)}
            </h3>
            <ul className="space-y-2">
              {list.map((e) => (
                <EventCard key={e.id} e={e} on={p.interested.has(e.id)} toggle={() => p.toggle(e.id)} db={p.doubleBooked[e.id]} ov={p.overlaps[e.id]} onOpen={() => p.onOpen(e)} />
              ))}
            </ul>
          </div>
        ))}
      </div>

      <button
        onClick={p.onDownloadIcs}
        disabled={p.interestedCount === 0}
        className="mt-4 w-full rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold text-ink hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Download interested events (.ics)
      </button>
    </section>
  );
}

export function EventCard({ e, on, toggle, db, ov, onOpen, showDate }: { e: MsoEvent; on: boolean; toggle: () => void; db?: string[]; ov?: string[]; onOpen: () => void; showDate?: boolean }) {
  return (
    <li className={`rounded-2xl border p-3 transition ${on ? (ov ? "border-clash/70 bg-clash/10" : "border-gold/60 bg-gold/[0.07]") : "border-white/10 bg-surface/40"}`}>
      <div className="flex items-start justify-between gap-2">
        <button onClick={onOpen} className="min-w-0 text-left">
          <div className="font-semibold leading-snug hover:underline">{e.title}</div>
          <div className="mt-0.5 text-xs text-muted">
            <span className="text-sky">{e.mso}</span>
            {e.location && <> · {e.location}</>}
          </div>
        </button>
        <StarButton on={on} onClick={toggle} />
      </div>
      <div className="mt-1.5 text-xs">
        {showDate && <span className="mr-1.5 font-semibold">{dayOfWeek(e.date)} {fmtDate(e.date)} ·</span>}
        <EventTime e={e} />
      </div>
      {(db || ov) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {db && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">Double-booked with {db.join(", ")}</span>}
          {ov && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${on ? "bg-clash/20 text-[#FFB3B3]" : "bg-white/5 text-muted"}`}>Overlaps {ov.join(", ")}</span>}
        </div>
      )}
      {(e.flyerUrl || on) && (
        <div className="mt-2 flex flex-wrap gap-3 text-xs">
          {e.flyerUrl && <a href={e.flyerUrl} target="_blank" rel="noreferrer" className="text-sky underline">View flyer</a>}
          {on && <a href={googleCalendarUrl(e)} target="_blank" rel="noreferrer" className="text-sky underline">Add to Google Calendar</a>}
        </div>
      )}
    </li>
  );
}
