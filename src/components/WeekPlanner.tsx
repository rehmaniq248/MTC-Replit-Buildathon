import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SAMPLE_EVENTS } from "../data/sample";
import { getJummahSessions } from "../engine/conflicts";
import { doubleBookings, eventBlock } from "../engine/schedule";
import { FIRST_WEEK, LAST_WEEK, clampWeek, weekLabel, weekRangeLabel } from "../engine/time";
import type { Block } from "../engine/types";
import { useStore } from "../lib/store";
import { buildAccommodationEmail } from "../lib/email";
import { downloadIcs } from "../lib/calendar";
import { todayWeekIndex, useNow, useWeekAnalysis } from "../lib/useWeek";
import { WeekGrid } from "./WeekGrid";
import { EventsPanel } from "./EventsPanel";
import { ClassSheet, CommitmentSheet, EmailModal, EventSheet } from "./Sheets";
import { ErrorBoundary } from "./ErrorBoundary";

type Selected = { kind: "block"; block: Block } | { kind: "event"; id: string } | null;
export const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;

export function WeekPlanner({ sidebarTop }: { sidebarTop?: ReactNode }) {
  const { state, update, toggleInterested, updateClass, updateCommitment, removeCommitment } = useStore();
  const now = useNow();
  const todayWeek = todayWeekIndex();
  const [[week, dir], setWeekDir] = useState<[number, number]>([todayWeek, 0]);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Selected>(null);
  const [emailFor, setEmailFor] = useState<{ classId: string; date: string } | null>(null);
  const reduce = useReducedMotion();

  const go = useCallback((target: number) => {
    setWeekDir(([w]) => {
      const next = clampWeek(target);
      return next === w ? [w, 0] : [next, next > w ? 1 : -1];
    });
  }, []);
  const prev = useCallback(() => setWeekDir(([w]) => (w > FIRST_WEEK ? [w - 1, -1] : [w, 0])), []);
  const next = useCallback(() => setWeekDir(([w]) => (w < LAST_WEEK ? [w + 1, 1] : [w, 0])), []);

  const anyModal = !!selected || !!emailFor;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (anyModal || document.querySelector('[role="dialog"]')) return;
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [anyModal, prev, next]);

  const touch = useRef<{ x: number; y: number } | null>(null);
  const { dates, windows, analyses, source, interested, prayerWarnings } = useWeekAnalysis(week, true);

  const db = useMemo(() => doubleBookings(SAMPLE_EVENTS), []);
  const weekEventsAll = useMemo(() => SAMPLE_EVENTS.filter((e) => dates.includes(e.date)), [dates]);
  const weekEvents = useMemo(() => (filter ? weekEventsAll.filter((e) => e.mso === filter) : weekEventsAll), [weekEventsAll, filter]);
  const msoOptions = useMemo(() => Array.from(new Set(SAMPLE_EVENTS.map((e) => e.mso))).sort(), []);
  const overlaps = useMemo(() => Object.assign({}, ...dates.map((d) => analyses[d].eventOverlaps)) as Record<string, string[]>, [dates, analyses]);

  const interestedClash = useMemo(() => {
    const out: Record<string, string[]> = {};
    const mine = weekEventsAll.filter((e) => interested.has(e.id));
    for (const e of mine) {
      const hits = [...(overlaps[e.id] || [])];
      const eb = eventBlock(e);
      if (eb) {
        for (const o of mine) {
          const ob = eventBlock(o);
          if (o.id !== e.id && ob && o.date === e.date && ob.start < eb.end && eb.start < ob.end) hits.push(o.title);
        }
      }
      if (hits.length) out[e.id] = hits;
    }
    return out;
  }, [weekEventsAll, interested, overlaps]);

  const selectedCount = weekEventsAll.filter((e) => interested.has(e.id)).length;
  const conflicts = Object.keys(interestedClash).length;

  const selectedEvent = selected?.kind === "event" ? SAMPLE_EVENTS.find((e) => e.id === selected.id) : undefined;
  const selBlock = selected?.kind === "block" ? selected.block : undefined;
  const selClass = selBlock?.kind === "class" ? state.classes.find((c) => c.id === selBlock.sourceId) : undefined;
  const selCommit = selBlock?.kind === "commitment" ? state.commitments.find((c) => c.id === selBlock.sourceId) : undefined;
  const selResult = selBlock ? analyses[selBlock.date]?.results[selBlock.id] : undefined;

  const emailDraft = useMemo(() => {
    if (!emailFor) return null;
    const c = state.classes.find((x) => x.id === emailFor.classId);
    const r = analyses[emailFor.date]?.results[`${emailFor.classId}@${emailFor.date}`];
    if (!c || !r) return null;
    return buildAccommodationEmail(c, r, state.name, getJummahSessions(emailFor.date, state.jummah));
  }, [emailFor, state.classes, state.name, state.jummah, analyses]);

  const variants = {
    enter: (d: number) => ({ x: reduce || d === 0 ? 0 : d > 0 ? "100%" : "-100%", opacity: reduce ? 1 : 0.4 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: reduce || d === 0 ? 0 : d > 0 ? "-100%" : "100%", opacity: reduce ? 1 : 0.4 }),
  };

  return (
    <div>
      {/* Week nav */}
      <nav className="sticky top-0 z-30 rounded-2xl border border-white/10 bg-surface/85 backdrop-blur-xl" aria-label="Week navigation">
        <div className="flex items-center gap-2 px-2 py-2 sm:px-3">
          <button onClick={prev} disabled={week <= FIRST_WEEK} className="rounded-full bg-card px-3 py-1.5 text-sm font-semibold hover:bg-card2 disabled:cursor-not-allowed disabled:opacity-35">
            ‹ <span className="hidden sm:inline">Prev week</span>
          </button>
          <div className="min-w-0 flex-1 text-center">
            <div className="week-label truncate font-display text-base font-semibold sm:text-lg">{weekLabel(week)}</div>
            <div className="font-mono text-[11px] text-muted sm:text-xs">{weekRangeLabel(week)}</div>
          </div>
          <button onClick={next} disabled={week >= LAST_WEEK} className="rounded-full bg-card px-3 py-1.5 text-sm font-semibold hover:bg-card2 disabled:cursor-not-allowed disabled:opacity-35">
            <span className="hidden sm:inline">Next week</span> ›
          </button>
          <button onClick={() => go(todayWeek)} disabled={week === todayWeek} className="rounded-full border border-gold/60 px-3 py-1.5 text-sm font-semibold text-gold hover:bg-gold/10 disabled:opacity-40">
            Today
          </button>
        </div>
      </nav>

      {/* Summary */}
      <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 px-1 text-sm" aria-live="polite">
        <span className={selectedCount ? "text-gold" : "text-muted"}>{selectedCount ? `${plural(selectedCount, "event")} selected` : "No events selected yet"}</span>
        <span className="text-white/20">·</span>
        <span className={conflicts ? "font-semibold text-clash" : "text-muted"}>{plural(conflicts, "conflict")}</span>
        <span className="text-white/20">·</span>
        <span className={prayerWarnings ? "text-amber-300" : "text-muted"}>{plural(prayerWarnings, "prayer warning")} this week</span>
      </p>

      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 rounded-3xl border border-white/10 bg-card/60 p-2 sm:p-3" aria-label="Week calendar">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-[#00C6D7]" checked={state.showPrayers} onChange={(e) => update({ showPrayers: e.target.checked })} />
              Show prayer times
            </label>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
              <Legend c="bg-sky" t="Class" />
              <Legend c="bg-shift" t="Shift" />
              <Legend c="bg-gold" t="Interested" />
              <Legend c="bg-clash" t="Overlap" />
              <Legend c="bg-prayer" t="Prayer" />
            </div>
          </div>
          <p className="mb-2 px-1 text-[11px] text-muted">
            Checks scheduling only, not religious rulings.
            {source === "offline" && <span className="ml-2 text-amber-300">Prayer times calculated offline</span>}
            {source === "approx" && <span className="ml-2 text-amber-300">Prayer times are approximate (offline)</span>}
          </p>

          <div
            className="relative overflow-hidden"
            onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
            onTouchEnd={(e) => {
              const s = touch.current;
              touch.current = null;
              if (!s) return;
              const dx = e.changedTouches[0].clientX - s.x;
              const dy = e.changedTouches[0].clientY - s.y;
              if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? next : prev)();
            }}
          >
            <AnimatePresence initial={false} custom={dir} mode="popLayout">
              <motion.div key={week} custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: reduce ? 0 : 0.3, ease: [0.32, 0.72, 0, 1] }}>
                <ErrorBoundary label="the calendar">
                  <WeekGrid
                    dates={dates}
                    today={now.date}
                    nowMin={now.min}
                    analyses={analyses}
                    windows={windows}
                    events={weekEventsAll}
                    interested={interested}
                    interestedClash={interestedClash}
                    showPrayers={state.showPrayers}
                    onOpenBlock={(b) => setSelected({ kind: "block", block: b })}
                    onOpenEvent={(e) => setSelected({ kind: "event", id: e.id })}
                    onEmail={(classId, date) => setEmailFor({ classId, date })}
                  />
                </ErrorBoundary>
              </motion.div>
            </AnimatePresence>
          </div>
          {(week === 0 || week === LAST_WEEK) && <p className="mt-2 px-1 text-xs text-muted">Classes appear in Weeks 1–10.</p>}
        </section>

        <aside className="min-w-0 space-y-4">
          {sidebarTop}
          <ErrorBoundary label="the events list">
            <EventsPanel
              dates={dates}
              events={weekEvents}
              msoOptions={msoOptions}
              filter={filter}
              setFilter={setFilter}
              interested={interested}
              toggle={toggleInterested}
              doubleBooked={db}
              overlaps={overlaps}
              onOpen={(e) => setSelected({ kind: "event", id: e.id })}
              onDownloadIcs={() => downloadIcs(SAMPLE_EVENTS.filter((e) => interested.has(e.id)))}
              interestedCount={state.interested.length}
            />
          </ErrorBoundary>
        </aside>
      </div>

      {selectedEvent && (
        <EventSheet e={selectedEvent} on={interested.has(selectedEvent.id)} toggle={() => toggleInterested(selectedEvent.id)} db={db[selectedEvent.id]} ov={overlaps[selectedEvent.id]} onClose={() => setSelected(null)} />
      )}
      {selClass && selBlock && (
        <ClassSheet c={selClass} date={selBlock.date} r={selResult} onChange={(p) => updateClass(selClass.id, p)} onClose={() => setSelected(null)}
          onEmail={() => { setSelected(null); setEmailFor({ classId: selClass.id, date: selBlock.date }); }} />
      )}
      {selCommit && selBlock && (
        <CommitmentSheet c={selCommit} date={selBlock.date} r={selResult} onChange={(p) => updateCommitment(selCommit.id, p)} onClose={() => setSelected(null)}
          onRemove={() => { removeCommitment(selCommit.id); setSelected(null); }} />
      )}
      {emailDraft && <EmailModal draft={emailDraft} onClose={() => setEmailFor(null)} />}
    </div>
  );
}

function Legend({ c, t }: { c: string; t: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-2 w-2 rounded-full ${c}`} />
      {t}
    </span>
  );
}
