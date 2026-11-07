import { useMemo, useState } from "react";
import { getJummahSessions } from "../engine/conflicts";
import { CLASS_WEEKS, dayOfWeek, fmtDate, fmtTime, toMin, weekLabel } from "../engine/time";
import type { ConflictResult } from "../engine/types";
import { useStore } from "../lib/store";
import { buildAccommodationEmail } from "../lib/email";
import { todayWeekIndex, useWeekAnalysis } from "../lib/useWeek";
import { ClassSheet, CommitmentSheet, EmailModal } from "../components/Sheets";
import { PageHeader, pageWash } from "./PageHeader";

const RANK = { none: 0, tight: 1, conflict: 2 } as const;

export default function ClassesPage({ onAddCommitment }: { onAddCommitment: () => void }) {
  const { state, updateClass, updateCommitment, removeCommitment } = useStore();
  const tw = todayWeekIndex();
  const week = tw < CLASS_WEEKS.from ? CLASS_WEEKS.from : tw > CLASS_WEEKS.to ? CLASS_WEEKS.to : tw;
  const { dates, analyses } = useWeekAnalysis(week);
  const [edit, setEdit] = useState<{ kind: "class" | "commitment"; id: string } | null>(null);
  const [emailFor, setEmailFor] = useState<{ classId: string; date: string } | null>(null);

  // worst result per class/commitment across this week's meetings
  const worst = useMemo(() => {
    const out: Record<string, { r: ConflictResult; date: string }> = {};
    for (const d of dates) {
      for (const b of analyses[d].schedule) {
        const r = analyses[d].results[b.id];
        if (!r || !b.sourceId) continue;
        if (!out[b.sourceId] || RANK[r.level] > RANK[out[b.sourceId].r.level]) out[b.sourceId] = { r, date: d };
      }
    }
    return out;
  }, [dates, analyses]);

  const draft = useMemo(() => {
    if (!emailFor) return null;
    const c = state.classes.find((x) => x.id === emailFor.classId);
    const w = worst[emailFor.classId];
    return c && w ? buildAccommodationEmail(c, w.r, state.name, getJummahSessions(w.date, state.jummah)) : null;
  }, [emailFor, state.classes, state.name, state.jummah, worst]);

  const editingClass = edit?.kind === "class" ? state.classes.find((c) => c.id === edit.id) : undefined;
  const editingCommit = edit?.kind === "commitment" ? state.commitments.find((c) => c.id === edit.id) : undefined;

  return (
    <div style={pageWash("classes")}>
      <PageHeader section="classes" sub={`Your schedule, checked against prayer times for ${weekLabel(week)}.`}>
        <button onClick={onAddCommitment} className="rounded-full border border-white/25 px-4 py-2 text-sm font-semibold hover:bg-white/5">Add a commitment</button>
      </PageHeader>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <ul className="grid gap-3 sm:grid-cols-2">
          {state.classes.map((c) => {
            const w = worst[c.id];
            const lvl = w?.r.level ?? "none";
            return (
              <li key={c.id} className={`rounded-3xl border bg-card p-4 ${lvl === "conflict" ? "border-clash/60" : lvl === "tight" ? "border-amber-400/40" : "border-white/10"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display text-xl font-semibold">{c.course}</div>
                    <div className="text-sm text-ink/75">{c.title}</div>
                  </div>
                  <button onClick={() => setEdit({ kind: "class", id: c.id })} className="text-xs text-sky hover:underline">Edit</button>
                </div>
                <div className="mt-2 font-mono text-sm text-ink/85">{c.days.join(" · ")} · {fmtTime(toMin(c.start))}–{fmtTime(toMin(c.end))}</div>
                <div className="mt-1 text-xs text-muted">{c.profName || "Professor not set"}{c.profEmail ? ` · ${c.profEmail}` : ""}</div>
                <div className="mt-3">
                  {!w && <span className="text-xs text-muted">Checking prayer times…</span>}
                  {w && lvl === "none" && <span className="rounded-full bg-prayer/15 px-2.5 py-1 text-xs font-semibold text-prayer">No prayer conflict</span>}
                  {w && lvl !== "none" && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${lvl === "conflict" ? "bg-clash/20 text-[#FFB3B3]" : "bg-amber-400/15 text-amber-200"}`}>
                        {lvl === "conflict" ? "Prayer conflict" : "Tight"}: {w.r.prayer} · {dayOfWeek(w.date)}
                      </span>
                      <button onClick={() => setEmailFor({ classId: c.id, date: w.date })}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${lvl === "conflict" ? "bg-gold text-navy" : "border border-white/25"}`}>
                        {lvl === "conflict" ? "Email for prayer accommodation" : "Email anyway"}
                      </button>
                    </div>
                  )}
                  {w && lvl !== "none" && <p className="mt-1.5 text-xs text-muted">{w.r.reason}.</p>}
                </div>
              </li>
            );
          })}
        </ul>

        <h2 className="mt-8 font-display text-2xl font-semibold">Shifts and other commitments</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {state.commitments.length === 0 && <li className="text-sm text-muted">No commitments yet. Add work shifts or board meetings to check them too.</li>}
          {state.commitments.map((c) => {
            const w = worst[c.id];
            return (
              <li key={c.id} className="rounded-3xl border border-white/10 bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{c.title}</div>
                    <div className="text-xs text-muted">{c.type}</div>
                  </div>
                  <button onClick={() => setEdit({ kind: "commitment", id: c.id })} className="text-xs text-sky hover:underline">Edit</button>
                </div>
                <div className="mt-2 font-mono text-sm text-ink/85">
                  {c.repeatsWeekly ? c.days.join(" · ") : c.date ? fmtDate(c.date) : ""} · {fmtTime(toMin(c.start))}–{fmtTime(toMin(c.end))}
                </div>
                {w && w.r.level !== "none" && <p className="mt-2 text-xs text-amber-200">{w.r.reason}.</p>}
              </li>
            );
          })}
        </ul>
      </div>

      {editingClass && (
        <ClassSheet c={editingClass} date={worst[editingClass.id]?.date ?? dates[0]} r={worst[editingClass.id]?.r} onChange={(p) => updateClass(editingClass.id, p)} onClose={() => setEdit(null)}
          onEmail={() => { setEdit(null); setEmailFor({ classId: editingClass.id, date: worst[editingClass.id]?.date ?? dates[0] }); }} />
      )}
      {editingCommit && (
        <CommitmentSheet c={editingCommit} date={worst[editingCommit.id]?.date ?? dates[0]} r={worst[editingCommit.id]?.r} onChange={(p) => updateCommitment(editingCommit.id, p)} onClose={() => setEdit(null)}
          onRemove={() => { removeCommitment(editingCommit.id); setEdit(null); }} />
      )}
      {draft && <EmailModal draft={draft} onClose={() => setEmailFor(null)} />}
    </div>
  );
}
