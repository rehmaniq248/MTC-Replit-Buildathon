import { useState } from "react";
import { dayOfWeek, fmtDate, fmtTime, toMin } from "../engine/time";
import { reminderKey, useStore, type Reminder } from "../lib/store";
import { useNow } from "../lib/useWeek";
import { Glass, PrayerTimeline } from "../components/Widgets";
import { PageHeader, pageWash } from "./PageHeader";

const input = "rounded-xl border border-white/10 bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/70";

export default function RemindersPage() {
  const { state, addReminder, removeReminder } = useStore();
  const now = useNow();
  const [text, setText] = useState("");
  const [date, setDate] = useState(now.date);
  const [time, setTime] = useState("");
  const [msg, setMsg] = useState("");

  const sorted = [...state.reminders].sort((a, b) => reminderKey(a).localeCompare(reminderKey(b)));
  const isPast = (r: Reminder) => r.date < now.date || (r.date === now.date && !!r.time && toMin(r.time) < now.min);
  const today = sorted.filter((r) => r.date === now.date && !isPast(r));
  const upcoming = sorted.filter((r) => r.date > now.date);
  const past = sorted.filter(isPast).reverse();

  const Group = ({ title, list, muted }: { title: string; list: Reminder[]; muted?: boolean }) =>
    list.length ? (
      <>
        <h2 className="mt-6 text-xs font-semibold uppercase tracking-wider text-muted">{title}</h2>
        <ul className="mt-2 space-y-2">
          {list.map((r) => (
            <li key={r.id} className={`flex items-center gap-3 rounded-2xl border border-white/10 bg-card px-4 py-3 ${muted ? "opacity-55" : ""}`}>
              <div className="w-24 shrink-0 font-mono text-xs text-ink/80">
                {r.date === now.date ? "Today" : `${dayOfWeek(r.date)} ${fmtDate(r.date)}`}
                <div className="text-muted">{r.time ? fmtTime(toMin(r.time)) : "Any time"}</div>
              </div>
              <div className="min-w-0 flex-1">{r.text}</div>
              <button onClick={() => removeReminder(r.id)} className="text-xs text-muted hover:text-clash" aria-label={`Delete "${r.text}"`}>Delete</button>
            </li>
          ))}
        </ul>
      </>
    ) : null;

  return (
    <div style={pageWash("reminders")}>
      <PageHeader section="reminders" sub="Prayer times, deadlines and anything you don't want to forget." />
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Glass className="!bg-card/70">
          <PrayerTimeline compact />
        </Glass>
        <form
          className="mt-6 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return setMsg("Add what you want to be reminded about.");
            if (!date) return setMsg("Pick a date.");
            addReminder(text.trim(), date, time || undefined);
            setText("");
            setTime("");
            setMsg("Reminder added.");
          }}
        >
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Remind me to…" aria-label="Reminder" className={`${input} min-w-0 flex-1`} />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" className={input} />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Time (optional)" className={input} />
          <button className="rounded-xl bg-gold px-4 text-sm font-semibold text-navy">Add reminder</button>
        </form>
        {msg && <p className="mt-2 text-xs text-muted" role="status">{msg}</p>}
        <p className="mt-1 text-xs text-muted">Reminders show here and on your dashboard. MSA ILM+ doesn't send notifications yet.</p>
        {today.length + upcoming.length === 0 && <p className="mt-6 rounded-2xl border border-dashed border-white/15 p-4 text-center text-sm text-muted">Nothing coming up. Add a reminder above.</p>}
        <Group title="Today" list={today} />
        <Group title="Upcoming" list={upcoming} />
        <Group title="Past" list={past} muted />
      </div>
    </div>
  );
}
