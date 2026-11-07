import { useMemo, useState, type ReactNode } from "react";
import { SAMPLE_EVENTS } from "../data/sample";
import { dayOfWeek, fmtDate, fmtTime, toMin } from "../engine/time";
import type { MsoEvent } from "../engine/types";
import { reminderKey, useStore } from "../lib/store";
import { todayWeekIndex, untilText, useNow, useTodayPrayers, useWeekAnalysis } from "../lib/useWeek";

/* ---------- primitives ---------- */

export function Glass({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative rounded-[28px] border border-white/[0.12] bg-white/[0.06] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_24px_48px_-24px_rgba(0,0,0,0.7)] backdrop-blur-2xl ${className}`}
    >
      {children}
    </div>
  );
}

export const Eyebrow = ({ children }: { children: ReactNode }) => (
  <div className="text-[13px] font-medium uppercase tracking-[0.14em] text-ink/70">{children}</div>
);

export const Inner = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-2xl bg-white/[0.07] px-3.5 py-3 ${className}`}>{children}</div>
);

export function Pill({ icon, children, tone = "default" }: { icon: ReactNode; children: ReactNode; tone?: "default" | "gold" | "prayer" }) {
  const t = tone === "gold" ? "text-gold" : tone === "prayer" ? "text-prayer" : "text-ink";
  return (
    <div className={`inline-flex items-center gap-2 rounded-full bg-white/[0.10] py-1.5 pl-1.5 pr-3.5 text-[15px] font-semibold ${t}`}>
      <span className="grid h-7 w-7 place-items-center rounded-full bg-white/[0.14]">{icon}</span>
      {children}
    </div>
  );
}

const svg = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
);
export const Icons = {
  book: svg(<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" /><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" /></>),
  bell: svg(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>),
  check: svg(<><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>),
  star: svg(<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />),
  moon: svg(<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />),
  arrow: svg(<><path d="M7 17 17 7" /><path d="M8 7h9v9" /></>),
};

/* ---------- mini month calendar (like the widget) ---------- */

export function MiniMonth({ date }: { date: string }) {
  const [y, m] = date.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); // 0 = Sun
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const prevDays = new Date(Date.UTC(y, m - 1, 0)).getUTCDate();
  const { state } = useStore();
  const eventDays = useMemo(() => {
    const s = new Map<number, "event" | "interested">();
    for (const e of SAMPLE_EVENTS) {
      if (e.date.slice(0, 7) !== date.slice(0, 7)) continue;
      const d = Number(e.date.slice(8));
      if (state.interested.includes(e.id)) s.set(d, "interested");
      else if (!s.has(d)) s.set(d, "event");
    }
    return s;
  }, [date, state.interested]);
  const today = Number(date.slice(8));
  const cells: { n: number; muted: boolean }[] = [];
  for (let i = first - 1; i >= 0; i--) cells.push({ n: prevDays - i, muted: true });
  for (let d = 1; d <= days; d++) cells.push({ n: d, muted: false });
  for (let d = 1; cells.length % 7 !== 0; d++) cells.push({ n: d, muted: true });

  return (
    <div className="grid grid-cols-7 gap-y-1 text-center text-[13px]">
      {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
        <div key={i} className="pb-1 text-[11px] font-semibold text-ink/55">{d}</div>
      ))}
      {cells.map((c, i) => {
        const mark = !c.muted ? eventDays.get(c.n) : undefined;
        const isToday = !c.muted && c.n === today;
        return (
          <div key={i} className="relative grid place-items-center">
            <span className={`grid h-7 w-7 place-items-center rounded-full ${c.muted ? "text-ink/30" : "text-ink/90"} ${isToday ? "bg-white/20 font-semibold text-ink" : ""}`}>{c.n}</span>
            {mark && <span className={`absolute bottom-0 h-1 w-1 rounded-full ${mark === "interested" ? "bg-gold" : "bg-sky"}`} />}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- data helpers ---------- */

export function useNextEvent(): { e: MsoEvent; live: boolean } | null {
  const now = useNow();
  return useMemo(() => {
    // timed events first within a day; "time not announced" sorts last
    const key = (e: MsoEvent) => e.date + (e.time === "unknown" || !e.start ? "99:99" : e.time === "all-day" ? "00:00" : e.start);
    const sorted = [...SAMPLE_EVENTS].sort((a, b) => key(a).localeCompare(key(b)));
    for (const e of sorted) {
      if (e.date < now.date) continue;
      if (e.date === now.date && e.time !== "all-day" && e.end && toMin(e.end) <= now.min) continue;
      const live = e.date === now.date && e.time !== "unknown" && !!e.start && toMin(e.start) <= now.min;
      return { e, live };
    }
    return null;
  }, [now]);
}

function eventTimeText(e: MsoEvent) {
  if (e.time === "unknown" || !e.start || !e.end) return "Time not announced";
  if (e.time === "all-day") return "All day";
  return `${fmtTime(toMin(e.start)).replace(":00", "")}–${e.time === "end-assumed" ? "~" : ""}${fmtTime(toMin(e.end)).replace(":00", "")}`;
}

/* ---------- tiles (previews) ---------- */

export function ClassesTileBody() {
  const now = useNow();
  const { analyses, prayerWarnings } = useWeekAnalysis(todayWeekIndex());
  const today = analyses[now.date];
  const items = today ? today.schedule : [];
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <Eyebrow>Classes</Eyebrow>
        <span className="text-[13px] text-ink/60">{dayOfWeek(now.date)} {fmtDate(now.date)}</span>
      </div>
      <div className="mt-4 space-y-2">
        {items.length === 0 && <Inner><div className="text-[15px] text-ink/80">No classes today.</div></Inner>}
        {items.slice(0, 3).map((b) => {
          const r = today.results[b.id];
          const past = b.end <= now.min;
          return (
            <Inner key={b.id} className={past ? "opacity-50" : ""}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[17px] font-semibold text-ink/95">{b.title}</div>
                  <div className="text-[15px] text-ink/70">{fmtTime(b.start)}–{fmtTime(b.end)}</div>
                </div>
                {r && r.level !== "none" && (
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.level === "conflict" ? "bg-clash/25 text-[#FFB3B3]" : "bg-amber-400/20 text-amber-200"}`}>
                    {r.prayer}
                  </span>
                )}
              </div>
            </Inner>
          );
        })}
      </div>
      <div className="mt-3 text-[13px] text-ink/60">{prayerWarnings ? `${prayerWarnings} prayer warning${prayerWarnings === 1 ? "" : "s"} this week` : "No prayer warnings this week"}</div>
    </>
  );
}

export function RemindersTileBody({ limit = 2 }: { limit?: number }) {
  const { state } = useStore();
  const p = useTodayPrayers();
  const now = p.now;
  const upcoming = useMemo(
    () =>
      [...state.reminders]
        .filter((r) => r.date > now.date || (r.date === now.date && (!r.time || toMin(r.time) >= now.min)))
        .sort((a, b) => reminderKey(a).localeCompare(reminderKey(b))),
    [state.reminders, now],
  );
  return (
    <>
      <Eyebrow>Reminders</Eyebrow>
      <div className="mt-4">
        {p.next ? (
          <Pill icon={Icons.moon} tone="prayer">
            {p.next.name} in {untilText(now.min, p.next.start, p.nextIsTomorrow)}
          </Pill>
        ) : (
          <Pill icon={Icons.moon}>Loading prayer times…</Pill>
        )}
      </div>
      <div className="mt-3 space-y-2">
        {upcoming.length === 0 && <Inner><div className="text-[15px] text-ink/80">Nothing coming up.</div></Inner>}
        {upcoming.slice(0, limit).map((r) => (
          <Inner key={r.id}>
            <div className="truncate text-[17px] font-semibold text-ink/95">{r.text}</div>
            <div className="text-[15px] text-ink/70">
              {r.date === now.date ? "Today" : `${dayOfWeek(r.date)} ${fmtDate(r.date)}`}
              {r.time ? ` · ${fmtTime(toMin(r.time))}` : ""}
            </div>
          </Inner>
        ))}
      </div>
    </>
  );
}

export function TasksTileBody() {
  const { state } = useStore();
  const pending = state.tasks.filter((t) => !t.done);
  return (
    <>
      <Eyebrow>Tasks</Eyebrow>
      <div className="mt-4">
        <Pill icon={Icons.check}>
          {pending.length} pending task{pending.length === 1 ? "" : "s"}
        </Pill>
      </div>
      <div className="mt-3 space-y-2">
        {pending.length === 0 && <Inner><div className="text-[15px] text-ink/80">All done. Nice work.</div></Inner>}
        {pending.slice(0, 2).map((t) => (
          <Inner key={t.id}>
            <div className="line-clamp-2 text-[17px] font-semibold leading-snug text-ink/95">{t.text}</div>
            {t.due && <div className="text-[15px] text-ink/70">Due {dayOfWeek(t.due)} {fmtDate(t.due)}</div>}
          </Inner>
        ))}
      </div>
    </>
  );
}

export function EventsTileBody() {
  const now = useNow();
  const next = useNextEvent();
  const month = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(new Date(`${now.date}T12:00:00Z`));
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <Eyebrow>{month}</Eyebrow>
        <span className="text-[13px] text-ink/60">MSO events</span>
      </div>
      <div className="mt-3">
        <MiniMonth date={now.date} />
      </div>
      {next && (
        <Inner className="mt-3">
          <div className="truncate text-[17px] font-semibold text-ink/95">{next.e.title}</div>
          <div className="text-[15px] text-ink/75">
            {next.live ? <span className="font-semibold text-gold">Happening now · </span> : next.e.date !== now.date ? `${dayOfWeek(next.e.date)} ${fmtDate(next.e.date)} · ` : ""}
            {eventTimeText(next.e)}
          </div>
          {next.e.location && <div className="truncate text-[15px] text-ink/70">{next.e.location}</div>}
        </Inner>
      )}
    </>
  );
}

/* ---------- prayer timeline (today) ---------- */

export function PrayerTimeline({ compact }: { compact?: boolean }) {
  const p = useTodayPrayers();
  const now = p.now;
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <Eyebrow>Today · {dayOfWeek(now.date)} {fmtDate(now.date)}</Eyebrow>
          {p.next && (
            <div className={`mt-1 font-display font-semibold ${compact ? "text-xl" : "text-2xl sm:text-3xl"}`}>
              {p.next.name} <span className="text-prayer">in {untilText(now.min, p.next.start, p.nextIsTomorrow)}</span>
            </div>
          )}
        </div>
        {p.source && p.source !== "api" && <span className="text-xs text-amber-300">Prayer times calculated offline</span>}
      </div>
      <ol className={`mt-4 grid gap-2 ${compact ? "grid-cols-3 sm:grid-cols-6" : "grid-cols-3"}`}>
        {p.slots.map((s) => {
          const isNext = p.next && !p.nextIsTomorrow && p.next.name === s.name;
          const past = s.start <= now.min && !isNext;
          return (
            <li
              key={s.name}
              className={`rounded-2xl px-3 py-2.5 ${isNext ? "bg-prayer text-navy" : "bg-white/[0.07]"} ${past ? "opacity-45" : ""}`}
              aria-current={isNext ? "true" : undefined}
            >
              <div className={`text-[12px] font-semibold uppercase tracking-wider ${isNext ? "text-navy/70" : "text-ink/60"}`}>{s.name}</div>
              <div className="whitespace-nowrap font-mono text-[13px] font-medium sm:text-[15px]">{fmtTime(s.start)}</div>
            </li>
          );
        })}
        {p.slots.length === 0 && <li className="col-span-3 text-sm text-muted">Loading prayer times…</li>}
      </ol>
    </div>
  );
}

/* ---------- interactive widgets for the dashboard ---------- */

export function TasksWidget() {
  const { state, addTask, toggleTask } = useStore();
  const [text, setText] = useState("");
  const pending = state.tasks.filter((t) => !t.done);
  return (
    <Glass className="!p-4">
      <div className="flex items-center justify-between">
        <Eyebrow>Tasks</Eyebrow>
        <a href="#/tasks" className="text-xs text-sky hover:underline">All tasks</a>
      </div>
      <div className="mt-3">
        <Pill icon={Icons.check}>{pending.length} pending task{pending.length === 1 ? "" : "s"}</Pill>
      </div>
      <ul className="mt-3 space-y-1.5">
        {pending.slice(0, 4).map((t) => (
          <li key={t.id}>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-white/[0.06] px-3 py-2 text-sm hover:bg-white/[0.09]">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#FFCD00]" checked={t.done} onChange={() => toggleTask(t.id)} />
              <span className="min-w-0 flex-1">
                {t.text}
                {t.due && <span className="block text-xs text-muted">Due {dayOfWeek(t.due)} {fmtDate(t.due)}</span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) addTask(text.trim());
          setText("");
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a task" aria-label="New task" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-surface/60 px-3 py-1.5 text-sm placeholder:text-muted/70" />
        <button className="rounded-xl bg-gold px-3 text-sm font-semibold text-navy">Add</button>
      </form>
    </Glass>
  );
}

export function RemindersWidget() {
  return (
    <Glass className="!p-4">
      <div className="absolute right-4 top-4">
        <a href="#/reminders" className="text-xs text-sky hover:underline">All reminders</a>
      </div>
      <RemindersTileBody limit={3} />
    </Glass>
  );
}
