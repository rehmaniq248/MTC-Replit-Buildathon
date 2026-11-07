import type { MouseEvent, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { dayOfWeek, fmtDate, fmtTime, toMin, weekLabel, weekRangeLabel } from "../engine/time";
import type { MsoEvent } from "../engine/types";
import { reminderKey, useStore } from "../lib/store";
import { todayWeekIndex, untilText, useTodayPrayers, useWeekAnalysis } from "../lib/useWeek";
import { Icons, MiniMonth, useNextEvent } from "../components/Widgets";
import { useWhoosh } from "../components/Whoosh";
import { DASHBOARD_GRADIENT, GRAIN, MirrorSymbol, SECTIONS, SYMBOLS, Sheen, type SectionKey } from "../components/Sections";
import { ThemeToggle } from "../lib/theme";
import { CampusMap, usePlaces } from "../components/CampusMap";
import { KIND_STYLE, type PlaceKind } from "../data/places";
import { SAMPLE_EVENTS } from "../data/sample";

/* ---------- small dark-glass widget pieces (like the reference widget) ---------- */
const glass =
  "rounded-[22px] border border-white/15 bg-[#0B1426]/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_18px_40px_-18px_rgba(0,0,0,0.6)] backdrop-blur-xl text-ink";
const Cap = ({ children }: { children: ReactNode }) => <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink/70">{children}</div>;
const InnerCard = ({ children }: { children: ReactNode }) => <div className="mt-2 rounded-2xl bg-white/[0.09] px-3 py-2 text-[13px] leading-snug text-ink/85">{children}</div>;
const MiniPill = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <div className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/[0.12] py-1 pl-1 pr-3 text-[13px] font-semibold">
    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/[0.16] [&_svg]:h-3 [&_svg]:w-3">{icon}</span>
    <span className="truncate">{children}</span>
  </div>
);

function eventWhen(e: MsoEvent, live: boolean, today: string) {
  const day = live ? "Now" : e.date === today ? "Today" : `${dayOfWeek(e.date)} ${fmtDate(e.date)}`;
  if (e.time === "unknown" || !e.start || !e.end) return `${day} · Time TBD`;
  if (e.time === "all-day") return `${day} · All day`;
  return `${day} · ${fmtTime(toMin(e.start)).replace(":00", "")}–${fmtTime(toMin(e.end)).replace(":00", "")}`;
}

/* ---------- the four blocks ---------- */
function useBlocks(): { key: SectionKey; label: ReactNode; widget: ReactNode }[] {
  const { state } = useStore();
  const p = useTodayPrayers();
  const next = useNextEvent();
  const week = todayWeekIndex();
  const { analyses, prayerWarnings, dates } = useWeekAnalysis(week);
  const places = usePlaces();
  const weekEvents = SAMPLE_EVENTS.filter((e) => dates.includes(e.date));
  const selected = weekEvents.filter((e) => state.interested.includes(e.id)).length;
  const now = p.now;
  const classesToday = analyses[now.date]?.schedule.filter((b) => b.kind === "class") ?? [];
  const pending = state.tasks.filter((t) => !t.done);
  const upcoming = [...state.reminders]
    .filter((r) => r.date > now.date || (r.date === now.date && (!r.time || toMin(r.time) >= now.min)))
    .sort((a, b) => reminderKey(a).localeCompare(reminderKey(b)));
  const nextReminder = upcoming[0];

  return [
    {
      key: "dashboard",
      label: "Dashboard",
      widget: (
        <>
          <Cap>{weekLabel(week)} · {weekRangeLabel(week)}</Cap>
          <div className="mt-2"><MiniPill icon={Icons.moon}>{prayerWarnings} prayer warning{prayerWarnings === 1 ? "" : "s"}</MiniPill></div>
          <InnerCard>{weekEvents.length} MSO events · {selected} selected</InnerCard>
        </>
      ),
    },
    {
      key: "events",
      label: "MSO Events",
      widget: (
        <>
          <Cap>Next event</Cap>
          {next ? (
            <InnerCard>
              <div className="truncate font-semibold text-ink">{next.e.title}</div>
              <div className="truncate">{eventWhen(next.e, next.live, now.date)}</div>
              {next.e.location && <div className="truncate text-ink/65">{next.e.location}</div>}
            </InnerCard>
          ) : <InnerCard>No upcoming events</InnerCard>}
        </>
      ),
    },
    {
      key: "classes",
      label: "Classes",
      widget: (
        <>
          <Cap>Today · {dayOfWeek(now.date)} {fmtDate(now.date)}</Cap>
          <InnerCard>
            {classesToday.length === 0 && "No classes today"}
            {classesToday.slice(0, 3).map((b) => {
              const r = analyses[now.date].results[b.id];
              return (
                <div key={b.id} className="flex items-center justify-between gap-2">
                  <span className="truncate"><span className="font-semibold text-ink">{b.title}</span> {fmtTime(b.start).replace(":00", "")}</span>
                  {r && r.level !== "none" && (
                    <span className={`shrink-0 rounded-full px-1.5 text-[10px] font-semibold ${r.level === "conflict" ? "bg-clash/30 text-[#FFC2C2]" : "bg-amber-300/25 text-amber-100"}`} title={r.reason}>
                      {r.prayer}
                    </span>
                  )}
                </div>
              );
            })}
          </InnerCard>
        </>
      ),
    },
    {
      key: "tasks",
      label: "Tasks",
      widget: (
        <>
          <MiniPill icon={Icons.check}>{pending.length} pending task{pending.length === 1 ? "" : "s"}</MiniPill>
          <InnerCard>
            <div className="line-clamp-2 font-semibold text-ink">{pending[0]?.text ?? "All done. Nice work."}</div>
            {pending[0]?.due && <div>Due {dayOfWeek(pending[0].due)} {fmtDate(pending[0].due)}</div>}
          </InnerCard>
        </>
      ),
    },
    {
      key: "reminders",
      label: <>Prayer Times &amp;<br />Reminders</>,
      widget: (
        <>
          <MiniPill icon={Icons.moon}>{p.next ? `${p.next.name} in ${untilText(now.min, p.next.start, p.nextIsTomorrow)}` : "Loading prayer times…"}</MiniPill>
          {p.slots.length > 0 && (
            <InnerCard>
              <div className="grid grid-cols-3 gap-x-2 gap-y-1 font-mono text-[11px]">
                {p.slots.slice(0, 6).map((s) => (
                  <div key={s.name} className={p.next?.name === s.name && !p.nextIsTomorrow ? "text-[#7FE6F0]" : ""}>
                    <div className="truncate text-ink/60">{s.name}</div>
                    <div>{fmtTime(s.start).replace(" ", "")}</div>
                  </div>
                ))}
              </div>
            </InnerCard>
          )}
          <InnerCard>
            <div className="flex items-center gap-1.5 text-ink/60 [&_svg]:h-3 [&_svg]:w-3">{Icons.bell}<span className="text-[11px] uppercase tracking-wider">Next reminder</span></div>
            <div className="truncate font-semibold text-ink">{nextReminder?.text ?? "Nothing coming up"}</div>
            {nextReminder && (
              <div>{nextReminder.date === now.date ? "Today" : `${dayOfWeek(nextReminder.date)} ${fmtDate(nextReminder.date)}`}{nextReminder.time ? ` · ${fmtTime(toMin(nextReminder.time))}` : ""}</div>
            )}
          </InnerCard>
        </>
      ),
    },
    {
      key: "map",
      label: "Campus Map",
      widget: (
        <>
          <div className="overflow-hidden rounded-2xl">
            <CampusMap places={places} mini forceDark className="h-[118px] sm:h-[128px]" />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink/75">
            {(["class", "prayer", "halal", "event"] as PlaceKind[]).map((k) => (
              <span key={k} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: KIND_STYLE[k].color }} />
                {k === "class" ? "Classes" : k === "prayer" ? "Prayer" : k === "halal" ? "Halal" : "Events"}
              </span>
            ))}
          </div>
        </>
      ),
    },
  ];
}

/* ---------- the calendar widget inside the Dashboard panel ---------- */
function CalendarWidget() {
  const { state } = useStore();
  const p = useTodayPrayers();
  const next = useNextEvent();
  const now = p.now;
  const pending = state.tasks.filter((t) => !t.done).length;
  const week = todayWeekIndex();
  const { prayerWarnings } = useWeekAnalysis(week);
  const month = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(new Date(`${now.date}T12:00:00Z`));
  return (
    <div className={`mt-7 w-full max-w-[470px] p-4 transition duration-300 group-hover:-translate-y-1 sm:p-5 ${glass}`}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.05fr_1fr]">
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-2 text-[13px] font-medium uppercase tracking-[0.14em] text-ink/75">
            {month}
            <span className="text-[10px] normal-case tracking-normal text-ink/55">{weekLabel(week)}</span>
          </div>
          <MiniMonth date={now.date} />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <MiniPill icon={Icons.check}>{pending} pending task{pending === 1 ? "" : "s"}</MiniPill>
          <div className="rounded-2xl bg-white/[0.09] px-3 py-2.5 text-[14px] leading-snug text-ink/85">
            {next ? (
              <>
                <div className="truncate font-semibold text-ink">{next.e.title}</div>
                <div className="truncate">{eventWhen(next.e, next.live, now.date)}</div>
                <div className="truncate text-ink/65">{next.e.location ?? next.e.mso}</div>
              </>
            ) : "No upcoming events"}
          </div>
          {p.next && <MiniPill icon={Icons.moon}>{p.next.name} in {untilText(now.min, p.next.start, p.nextIsTomorrow)}</MiniPill>}
          <MiniPill icon={Icons.star}>{prayerWarnings} prayer warning{prayerWarnings === 1 ? "" : "s"}</MiniPill>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const blocks = useBlocks();
  const reduce = useReducedMotion();
  const whoosh = useWhoosh();

  const open = (k: SectionKey) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    const s = SECTIONS[k];
    whoosh({ href: s.href, color: s.bg, symbol: SYMBOLS[s.symbol], rect: { top: r.top, left: r.left, width: r.width, height: r.height } });
  };

  return (
    <div className="force-dark relative grid min-h-screen lg:h-screen lg:min-h-[740px] lg:grid-cols-[36fr_64fr]">
      <ThemeToggle className="absolute right-4 top-4 z-20 bg-[#0B1426]/30 text-snow backdrop-blur" />

      {/* LEFT: grainy gradient + wordmark + calendar widget (opens the dashboard) */}
      <section
        className="relative flex flex-col justify-center overflow-hidden px-6 pb-12 pt-14 sm:px-10 lg:px-11"
        style={{ background: DASHBOARD_GRADIENT }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-50 mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
        <motion.h1
          className="relative leading-[0.86] text-navy"
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="block font-display text-[clamp(3.4rem,6.4vw,6.5rem)] font-bold tracking-[-0.025em]">MSA</span>
          <span className="flex items-baseline gap-3">
            <span className="font-display text-[clamp(3.4rem,6.4vw,6.5rem)] font-bold tracking-[-0.025em]">
              ILM<span className="align-[0.35em] text-[0.6em]">+</span>
            </span>
            <span className="font-serif text-[clamp(1.4rem,2.4vw,2.2rem)] italic tracking-tight">at UCSD</span>
          </span>
        </motion.h1>
        <motion.a
          href={SECTIONS.dashboard.href}
          onClick={open("dashboard")}
          aria-label="Open dashboard"
          className="group relative block rounded-[22px] outline-none focus-visible:ring-4 focus-visible:ring-white"
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <CalendarWidget />
        </motion.a>
      </section>

      {/* RIGHT: four blocks, each with a mirrored symbol and a mini widget */}
      <nav aria-label="Sections" className="grid grid-cols-1 sm:grid-cols-2 sm:grid-rows-3 lg:grid-cols-3 lg:grid-rows-2">
        {blocks.map((b, i) => {
          const s = SECTIONS[b.key];
          return (
            <motion.a
              key={b.key}
              href={s.href}
              onClick={open(b.key)}
              className="group relative flex min-h-[280px] flex-col justify-between overflow-hidden p-5 outline-none focus-visible:z-10 focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-white sm:p-6 lg:min-h-0"
              style={{ background: s.bg }}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.06 * i }}
            >
              <MirrorSymbol k={s.symbol} />
              <Sheen />
              <span className={`relative text-[13px] font-semibold uppercase leading-relaxed tracking-[0.22em] sm:text-sm ${s.fg === "dark" ? "text-navy" : "text-snow"}`}>{b.label}</span>
              <div className={`relative mt-5 w-full max-w-[300px] p-3 transition duration-300 group-hover:-translate-y-1 ${glass}`}>{b.widget}</div>
            </motion.a>
          );
        })}
      </nav>
    </div>
  );
}
