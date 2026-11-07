import { useMemo, useState } from "react";
import { CampusMap, usePlaces } from "../components/CampusMap";
import { KIND_STYLE, type PlaceKind } from "../data/places";
import { weekLabel } from "../engine/time";
import { todayWeekIndex } from "../lib/useWeek";
import { PageHeader, pageWash } from "./PageHeader";

const KINDS: PlaceKind[] = ["class", "prayer", "halal", "event"];

export default function MapPage() {
  const all = usePlaces();
  const [show, setShow] = useState<Record<PlaceKind, boolean>>({ class: true, prayer: true, halal: true, event: true });
  const [focus, setFocus] = useState<string | null>(null);
  const places = useMemo(() => all.filter((p) => show[p.kind]), [all, show]);

  return (
    <div style={pageWash("map")}>
      <PageHeader section="map" sub={`Your classes, prayer spaces, halal food and ${weekLabel(todayWeekIndex())} MSO events.`} />
      <div className="mx-auto grid max-w-[1400px] gap-4 px-2 py-4 sm:px-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-3xl border border-white/10 shadow-lg">
          <CampusMap places={places} focus={focus} className="h-[62vh] min-h-[380px] lg:h-[72vh]" />
        </div>
        <aside className="space-y-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Show on map">
            {KINDS.map((k) => (
              <button
                key={k}
                aria-pressed={show[k]}
                onClick={() => setShow((s) => ({ ...s, [k]: !s[k] }))}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${show[k] ? "border-white/20 bg-card" : "border-white/10 opacity-50"}`}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: KIND_STYLE[k].color }} />
                {KIND_STYLE[k].label}
              </button>
            ))}
          </div>
          {KINDS.filter((k) => show[k]).map((k) => {
            const list = all.filter((p) => p.kind === k);
            return (
              <section key={k} className="rounded-3xl border border-white/10 bg-card p-4">
                <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: KIND_STYLE[k].color }} />
                  {KIND_STYLE[k].label}
                </h2>
                {list.length === 0 && <p className="mt-2 text-sm text-muted">Nothing to show.</p>}
                <ul className="mt-2 space-y-1">
                  {list.map((p) => (
                    <li key={p.id}>
                      <button onClick={() => setFocus(`${p.id}#${Date.now()}`)} className="w-full rounded-xl px-2 py-1.5 text-left hover:bg-white/[0.06]">
                        <div className="text-sm font-semibold">{p.name}</div>
                        <div className="text-xs text-muted">{p.where}{p.detail ? ` · ${p.detail}` : ""}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          <p className="px-1 text-xs text-muted">Locations are approximate. Event venues this week are demo placements.</p>
        </aside>
      </div>
    </div>
  );
}
