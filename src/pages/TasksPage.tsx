import { useState } from "react";
import { dayOfWeek, fmtDate, todayLA } from "../engine/time";
import { useStore, type Task } from "../lib/store";
import { PageHeader, pageWash } from "./PageHeader";

const input = "rounded-xl border border-white/10 bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/70";

function Row({ t }: { t: Task }) {
  const { toggleTask, removeTask } = useStore();
  const overdue = !t.done && t.due && t.due < todayLA();
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-white/10 bg-card px-4 py-3">
      <input type="checkbox" className="mt-1 h-4 w-4 accent-[#FFCD00]" checked={t.done} onChange={() => toggleTask(t.id)} aria-label={`Mark "${t.text}" ${t.done ? "not done" : "done"}`} />
      <div className="min-w-0 flex-1">
        <div className={t.done ? "text-muted line-through" : ""}>{t.text}</div>
        {t.due && <div className={`text-xs ${overdue ? "text-clash" : "text-muted"}`}>{overdue ? "Overdue · " : "Due "}{dayOfWeek(t.due)} {fmtDate(t.due)}</div>}
      </div>
      <button onClick={() => removeTask(t.id)} className="text-xs text-muted hover:text-clash" aria-label={`Delete "${t.text}"`}>Delete</button>
    </li>
  );
}

export default function TasksPage() {
  const { state, addTask } = useStore();
  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const pending = state.tasks.filter((t) => !t.done).sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
  const done = state.tasks.filter((t) => t.done);
  return (
    <div style={pageWash("tasks")}>
      <PageHeader section="tasks" sub={`${pending.length} pending · ${done.length} done`} />
      <div className="mx-auto max-w-3xl px-4 py-6">
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            addTask(text.trim(), due || undefined);
            setText("");
            setDue("");
          }}
        >
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a task, like 'Email Dr. Patel'" aria-label="Task" className={`${input} min-w-0 flex-1`} />
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due date" className={input} />
          <button className="rounded-xl bg-gold px-4 text-sm font-semibold text-navy">Add task</button>
        </form>
        <h2 className="mt-6 text-xs font-semibold uppercase tracking-wider text-muted">Pending</h2>
        <ul className="mt-2 space-y-2">
          {pending.length === 0 && <li className="rounded-2xl border border-dashed border-white/15 p-4 text-center text-sm text-muted">Nothing pending. Add a task above.</li>}
          {pending.map((t) => <Row key={t.id} t={t} />)}
        </ul>
        {done.length > 0 && (
          <>
            <h2 className="mt-6 text-xs font-semibold uppercase tracking-wider text-muted">Done</h2>
            <ul className="mt-2 space-y-2">{done.map((t) => <Row key={t.id} t={t} />)}</ul>
          </>
        )}
      </div>
    </div>
  );
}
