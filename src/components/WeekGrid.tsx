import type { Block, ConflictResult, DayWindows, MsoEvent } from "../engine/types";
import type { DayAnalysis } from "../engine/schedule";
import { dayOfWeek, fmtTime } from "../engine/time";
import { layoutLanes } from "../lib/lanes";

export const GRID_START = 6 * 60;
export const GRID_END = 23 * 60;
export const HOUR_PX = 48;
const HOURS = (GRID_END - GRID_START) / 60;
const px = (min: number) => ((min - GRID_START) / 60) * HOUR_PX;

export interface GridProps {
  dates: string[];
  today: string;
  nowMin: number;
  analyses: Record<string, DayAnalysis>;
  windows: Record<string, DayWindows | undefined>;
  events: MsoEvent[]; // events in this week
  interested: Set<string>;
  interestedClash: Record<string, string[]>; // interested event id -> what it collides with
  showPrayers: boolean;
  onOpenBlock: (b: Block) => void;
  onOpenEvent: (e: MsoEvent) => void;
  onEmail: (classId: string, date: string) => void;
}

function Ribbon({ day }: { day: DayWindows }) {
  return (
    <>
      {day.windows.map((w) => {
        const s = Math.max(w.start, GRID_START);
        const e = Math.min(w.end, GRID_END);
        if (e <= s) return null;
        const solidEnd = Math.min(w.start + 20, GRID_END);
        return (
          <div key={w.name} aria-hidden>
            <div className="absolute inset-x-0 bg-prayer/[0.07]" style={{ top: px(s), height: px(e) - px(s) }} title={`${w.name} ${fmtTime(w.start)} – ${fmtTime(w.end)}`} />
            {w.start >= GRID_START && (
              <div className="absolute inset-x-0 border-t-2 border-prayer bg-prayer/30" style={{ top: px(w.start), height: px(solidEnd) - px(w.start) }}>
                <span className="block truncate px-1 font-mono text-[9px] leading-[14px] text-prayer sm:text-[10px]">
                  {w.name} <span className="hidden sm:inline">{fmtTime(w.start).replace(" ", "")}</span>
                </span>
              </div>
            )}
          </div>
        );
      })}
      {day.jummah.map((j) => (
        <div key={j.name} aria-hidden className="absolute inset-x-0 border-t-2 border-prayer bg-prayer/35" style={{ top: px(j.start), height: px(j.end) - px(j.start) }}>
          <span className="block truncate px-1 font-mono text-[9px] leading-[14px] text-prayer sm:text-[10px]">{j.name}</span>
        </div>
      ))}
    </>
  );
}

const badgeStyle = { tight: "bg-amber-400 text-navy", conflict: "bg-clash text-snow" } as const;

function Badge({ r }: { r?: ConflictResult }) {
  if (!r || r.level === "none") return null;
  return (
    <span title={r.reason} className={`absolute bottom-0.5 right-0.5 grid h-3.5 w-3.5 place-items-center rounded-full text-[9px] font-bold sm:bottom-auto sm:top-0.5 sm:h-4 sm:w-4 sm:text-[10px] ${badgeStyle[r.level]}`} aria-label={`${r.level}: ${r.reason}`}>
      {r.level === "conflict" ? "!" : "~"}
    </span>
  );
}

export function WeekGrid(p: GridProps) {
  return (
    <div className="grid grid-cols-[30px_repeat(7,minmax(0,1fr))] sm:grid-cols-[48px_repeat(7,minmax(0,1fr))]">
      {/* header row */}
      <div />
      {p.dates.map((d) => {
        const dayEvents = p.events.filter((e) => e.date === d);
        const allDay = dayEvents.filter((e) => e.time === "all-day");
        const tbd = dayEvents.filter((e) => e.time === "unknown");
        const isToday = d === p.today;
        return (
          <div key={d} className="min-w-0 border-l border-white/5 px-0.5 pb-1.5 sm:px-1">
            <div className={`mb-1 text-center ${isToday ? "text-gold" : "text-muted"}`}>
              <div className="text-[10px] font-semibold uppercase tracking-wider sm:text-xs">{dayOfWeek(d)}</div>
              <div className={`mx-auto grid h-7 w-7 place-items-center rounded-full font-display text-base font-semibold sm:text-lg ${isToday ? "bg-gold text-navy" : "text-ink"}`}>
                {Number(d.slice(8))}
              </div>
            </div>
            {allDay.map((e) => (
              <button key={e.id} onClick={() => p.onOpenEvent(e)} title={`All day: ${e.title}`}
                className={`mb-0.5 block w-full truncate rounded-md px-1 py-0.5 text-left text-[9px] font-semibold sm:text-[11px] ${p.interested.has(e.id) ? "bg-gold text-navy" : "border border-gold/50 text-gold"}`}>
                {e.title}
              </button>
            ))}
            {tbd.map((e) => (
              <button key={e.id} onClick={() => p.onOpenEvent(e)} title={`Time not announced: ${e.title}`}
                className={`mb-0.5 block w-full truncate rounded-md border border-dashed px-1 py-0.5 text-left text-[9px] sm:text-[11px] ${p.interested.has(e.id) ? "border-gold bg-gold/20 text-gold" : "border-white/25 text-muted"}`}>
                <span className="font-semibold">TBD</span> {e.title}
              </button>
            ))}
          </div>
        );
      })}

      {/* time gutter */}
      <div className="relative" style={{ height: HOURS * HOUR_PX }}>
        {Array.from({ length: HOURS }, (_, i) => {
          const h = 6 + i;
          return (
            <div key={h} className="absolute right-1 -translate-y-1/2 font-mono text-[9px] text-muted sm:text-[11px]" style={{ top: i * HOUR_PX }}>
              {i === 0 ? "" : `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "a" : "p"}`}
            </div>
          );
        })}
      </div>

      {/* day columns */}
      {p.dates.map((d) => {
        const a = p.analyses[d];
        const day = p.windows[d];
        const blocks: Block[] = a ? [...a.schedule, ...a.interestedBlocks] : [];
        const lanes = layoutLanes(blocks);
        return (
          <div
            key={d}
            className={`relative min-w-0 border-l border-white/5 ${d === p.today ? "bg-white/[0.025]" : ""}`}
            style={{ height: HOURS * HOUR_PX, backgroundImage: "linear-gradient(to bottom, rgb(var(--c-hi) / 0.08) 1px, transparent 1px)", backgroundSize: `100% ${HOUR_PX}px` }}
          >
            {p.showPrayers && day && <Ribbon day={day} />}
            {d === p.today && p.nowMin > GRID_START && p.nowMin < GRID_END && (
              <div className="pointer-events-none absolute inset-x-0 z-20 h-0.5 bg-gold" style={{ top: px(p.nowMin) }} aria-hidden>
                <div className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-gold" />
              </div>
            )}
            {blocks.map((b) => {
              const s = Math.max(b.start, GRID_START);
              const e = Math.min(b.end, GRID_END);
              if (e <= s) return null;
              const L = lanes[b.id] || { lane: 0, lanes: 1 };
              const r = a?.results[b.id];
              const h = px(e) - px(s);
              const ev = b.kind === "event" ? p.events.find((x) => x.id === b.id) : undefined;
              const clash = b.kind === "event" ? p.interestedClash[b.id] : undefined;
              const tone =
                b.kind === "class"
                  ? "bg-[#1E4A6E] border-sky text-[#F2F0E9]"
                  : b.kind === "commitment"
                    ? "bg-[#3A3466] border-shift text-[#F2F0E9]"
                    : clash
                      ? "bg-clash/90 border-clash text-snow"
                      : "bg-gold border-gold text-navy";
              const showEmail = b.kind === "class" && r && r.level !== "none";
              return (
                <div
                  key={b.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => (ev ? p.onOpenEvent(ev) : p.onOpenBlock(b))}
                  onKeyDown={(k) => (k.key === "Enter" || k.key === " ") && (k.preventDefault(), ev ? p.onOpenEvent(ev) : p.onOpenBlock(b))}
                  className={`absolute z-10 cursor-pointer overflow-hidden rounded-lg border-l-[3px] px-1 py-0.5 shadow-md shadow-black/30 transition hover:brightness-110 sm:px-1.5 ${tone} ${r?.level === "conflict" ? "ring-1 ring-clash" : ""}`}
                  style={{ top: px(s) + 1, height: Math.max(h - 2, 14), left: `calc(${(L.lane / L.lanes) * 100}% + 1px)`, width: `calc(${100 / L.lanes}% - 2px)` }}
                  title={`${b.title} · ${fmtTime(b.start)} – ${fmtTime(b.end)}${r && r.level !== "none" ? ` · ${r.reason}` : ""}${clash ? ` · Overlaps ${clash.join(", ")}` : ""}`}
                >
                  <Badge r={r} />
                  <div className="text-[9px] font-semibold leading-tight [overflow-wrap:break-word] sm:truncate sm:pr-3 sm:text-xs">{b.title}</div>
                  {h > 34 && (
                    <div className="hidden truncate font-mono text-[10px] opacity-80 sm:block">
                      {fmtTime(b.start)}–{ev?.time === "end-assumed" ? "~" : ""}{fmtTime(b.end)}
                    </div>
                  )}
                  {clash && h > 30 && <div className="hidden truncate sm:block text-[9px] font-semibold sm:text-[10px]">Overlaps {clash.join(", ")}</div>}
                  {showEmail && h > 44 && (
                    <div className="mt-0.5">
                      <div className={`hidden truncate text-[9px] font-semibold sm:block sm:text-[10px] ${r!.level === "conflict" ? "text-[#FFB3B3]" : "text-amber-300"}`}>
                        {r!.level === "conflict" ? "Prayer conflict" : "Tight"}: {r!.prayer}
                      </div>
                      <button
                        onClick={(k) => {
                          k.stopPropagation();
                          p.onEmail(b.sourceId!, b.date);
                        }}
                        className={`mt-0.5 hidden max-w-full truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold sm:block ${
                          r!.level === "conflict" ? "bg-gold text-navy" : "border border-snow/30 text-[#F2F0E9]"
                        }`}
                      >
                        {r!.level === "conflict" ? "Email for prayer accommodation" : "Email anyway"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
