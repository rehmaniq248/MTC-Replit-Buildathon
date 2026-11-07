import { useEffect, useState } from "react";
import type { ClassItem, Commitment, ConflictResult, DayName, MsoEvent } from "../engine/types";
import { WEEK_DAYS, dayOfWeek, fmtDate, fmtTime, toMin } from "../engine/time";
import type { JummahConfig } from "../engine/conflicts";
import { Modal } from "./Modal";
import { EventTime, StarButton } from "./EventsPanel";
import { googleCalendarUrl } from "../lib/calendar";
import { gmailUrl, mailtoUrl, type EmailDraft } from "../lib/email";

const input = "w-full rounded-lg border border-white/10 bg-navy px-3 py-2 text-sm text-ink placeholder:text-muted/60";
const label = "mb-1 block text-xs font-semibold text-muted";

function ConflictNote({ r }: { r?: ConflictResult }) {
  if (!r) return <p className="text-sm text-muted">Prayer times still loading…</p>;
  const tone = r.level === "conflict" ? "border-clash/60 bg-clash/10 text-[#FFB3B3]" : r.level === "tight" ? "border-amber-400/50 bg-amber-400/10 text-amber-200" : "border-prayer/40 bg-prayer/10 text-prayer";
  const head = r.level === "conflict" ? `Prayer conflict: ${r.prayer}` : r.level === "tight" ? `Tight: ${r.prayer}` : "No prayer conflict";
  return (
    <div className={`rounded-2xl border p-3 text-sm ${tone}`}>
      <div className="font-semibold">{head}</div>
      {r.level !== "none" && <div className="mt-0.5 opacity-90">{r.reason}.</div>}
    </div>
  );
}

export function ClassSheet({ c, date, r, onChange, onEmail, onClose }: { c: ClassItem; date: string; r?: ConflictResult; onChange: (p: Partial<ClassItem>) => void; onEmail: () => void; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title={`${c.course} · ${c.title}`}>
      <p className="mb-3 font-mono text-sm text-muted">
        {dayOfWeek(date)} {fmtDate(date)} · {fmtTime(toMin(c.start))} – {fmtTime(toMin(c.end))}
      </p>
      <ConflictNote r={r} />
      {r && r.level !== "none" && (
        <button onClick={onEmail} className={`mt-3 w-full rounded-xl px-3 py-2.5 text-sm font-semibold ${r.level === "conflict" ? "bg-gold text-navy hover:brightness-105" : "border border-white/20 text-ink hover:bg-white/5"}`}>
          {r.level === "conflict" ? "Email for prayer accommodation" : "Email anyway"}
        </button>
      )}
      <div className="mt-5 space-y-3 border-t border-white/10 pt-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted">Edit professor</div>
        <div>
          <label className={label} htmlFor="pn">Professor name</label>
          <input id="pn" className={input} value={c.profName} onChange={(e) => onChange({ profName: e.target.value })} placeholder="Dr. Last name" />
        </div>
        <div>
          <label className={label} htmlFor="pe">Professor email</label>
          <input id="pe" type="email" className={input} value={c.profEmail} onChange={(e) => onChange({ profEmail: e.target.value })} placeholder="name@ucsd.edu" />
        </div>
        <p className="text-xs text-muted">Saved on this device.</p>
      </div>
    </Modal>
  );
}

export function CommitmentSheet({ c, date, r, onChange, onRemove, onClose }: { c: Commitment; date: string; r?: ConflictResult; onChange: (p: Partial<Commitment>) => void; onRemove: () => void; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title={c.title}>
      <p className="mb-3 text-sm text-muted">
        {c.type} · {c.repeatsWeekly ? `Every ${c.days.join(", ")}` : fmtDate(date)}
      </p>
      <ConflictNote r={r} />
      <div className="mt-5 space-y-3 border-t border-white/10 pt-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted">Edit times</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="cs">Start</label>
            <input id="cs" type="time" className={input} value={c.start} onChange={(e) => e.target.value && onChange({ start: e.target.value })} />
          </div>
          <div>
            <label className={label} htmlFor="ce">End</label>
            <input id="ce" type="time" className={input} value={c.end} onChange={(e) => e.target.value && onChange({ end: e.target.value })} />
          </div>
        </div>
        {toMin(c.end) <= toMin(c.start) && <p className="text-xs text-amber-300">End time should be after the start time.</p>}
        <button onClick={onRemove} className="text-xs text-muted underline hover:text-clash">Remove this commitment</button>
      </div>
    </Modal>
  );
}

export function EventSheet({ e, on, toggle, db, ov, onClose }: { e: MsoEvent; on: boolean; toggle: () => void; db?: string[]; ov?: string[]; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title={e.title}>
      <div className="space-y-1 text-sm">
        <div className="text-sky">{e.mso}</div>
        <div className="text-muted">
          {dayOfWeek(e.date)} {fmtDate(e.date)} · <EventTime e={e} />
        </div>
        {e.location && <div className="text-muted">{e.location}</div>}
        {e.time === "end-assumed" && <div className="text-xs text-muted">End time estimated.</div>}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {db && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-semibold text-amber-300">Double-booked with {db.join(", ")}</span>}
        {ov && <span className="rounded-full bg-clash/20 px-2 py-0.5 text-xs font-semibold text-[#FFB3B3]">Overlaps {ov.join(", ")}</span>}
      </div>
      <p className="mt-3 text-xs text-muted">MSO events include prayer, so they aren't checked against prayer times.</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <StarButton on={on} onClick={toggle} />
        <a href={googleCalendarUrl(e)} target="_blank" rel="noreferrer" className="text-sm text-sky underline">Add to Google Calendar</a>
        {e.flyerUrl && <a href={e.flyerUrl} target="_blank" rel="noreferrer" className="text-sm text-sky underline">View flyer</a>}
      </div>
    </Modal>
  );
}

export function EmailModal({ draft, onClose }: { draft: EmailDraft; onClose: () => void }) {
  const [d, setD] = useState(draft);
  const [copied, setCopied] = useState<"" | "ok" | "fail">("");
  useEffect(() => setD(draft), [draft]);

  const copy = async () => {
    const text = `To: ${d.to}\nSubject: ${d.subject}\n\n${d.body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied("ok");
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        setCopied(ok ? "ok" : "fail");
      } catch {
        setCopied("fail");
      }
    }
    setTimeout(() => setCopied(""), 2500);
  };

  return (
    <Modal open onClose={onClose} title="Prayer accommodation email" wide>
      <p className="mb-3 text-xs text-muted">This is a draft. Nothing is sent until you send it from your email app.</p>
      <div className="space-y-3">
        <div>
          <label className={label} htmlFor="to">To</label>
          <input id="to" className={input} value={d.to} onChange={(e) => setD({ ...d, to: e.target.value })} placeholder="professor@ucsd.edu" />
          {!d.to && <p className="mt-1 text-xs text-amber-300">Add professor email on the class card.</p>}
        </div>
        <div>
          <label className={label} htmlFor="su">Subject</label>
          <input id="su" className={input} value={d.subject} onChange={(e) => setD({ ...d, subject: e.target.value })} />
        </div>
        <div>
          <label className={label} htmlFor="bo">Message</label>
          <textarea id="bo" rows={14} className={`${input} leading-relaxed`} value={d.body} onChange={(e) => setD({ ...d, body: e.target.value })} />
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <a href={mailtoUrl(d)} className="rounded-xl bg-gold px-3 py-2.5 text-center text-sm font-semibold text-navy hover:brightness-105">Open in email app</a>
        <a href={gmailUrl(d)} target="_blank" rel="noreferrer" className="rounded-xl border border-white/20 px-3 py-2.5 text-center text-sm font-semibold hover:bg-white/5">Open in Gmail</a>
        <button onClick={copy} className="rounded-xl border border-white/20 px-3 py-2.5 text-sm font-semibold hover:bg-white/5">
          {copied === "ok" ? "Copied" : copied === "fail" ? "Copy failed. Select the text instead" : "Copy email"}
        </button>
      </div>
      <p className="mt-3 text-xs text-muted">Check your syllabus and UCSD policy for the right process.</p>
    </Modal>
  );
}

export function SettingsModal({
  name, jummah, onSave, onAddCommitment, onClose,
}: {
  name: string;
  jummah: JummahConfig;
  onSave: (name: string, j: JummahConfig) => void;
  onAddCommitment: (c: Commitment) => void;
  onClose: () => void;
}) {
  const [n, setN] = useState(name);
  const [j, setJ] = useState<JummahConfig>({ standard: [...jummah.standard], daylight: [...jummah.daylight], durationMinutes: jummah.durationMinutes });
  const [cm, setCm] = useState({ title: "", type: "Shift", days: [] as DayName[], start: "09:00", end: "10:00", repeatsWeekly: true, date: "" });
  const [cmMsg, setCmMsg] = useState("");
  const setSlot = (season: "standard" | "daylight", i: number, v: string) => {
    if (!v) return;
    const arr = [...j[season]];
    arr[i] = v;
    setJ({ ...j, [season]: arr });
  };
  const addCommitment = () => {
    if (!cm.title.trim()) return setCmMsg("Add a title.");
    if (toMin(cm.end) <= toMin(cm.start)) return setCmMsg("End time should be after the start time.");
    if (cm.repeatsWeekly && cm.days.length === 0) return setCmMsg("Pick at least one day.");
    if (!cm.repeatsWeekly && !cm.date) return setCmMsg("Pick a date.");
    onAddCommitment({
      id: `u${Date.now()}`, title: cm.title.trim(), type: cm.type, start: cm.start, end: cm.end, repeatsWeekly: cm.repeatsWeekly,
      days: cm.repeatsWeekly ? cm.days : [dayOfWeek(cm.date)], date: cm.repeatsWeekly ? undefined : cm.date,
    });
    setCm({ ...cm, title: "", days: [] });
    setCmMsg(`Added "${cm.title.trim()}" to your week.`);
  };

  return (
    <Modal open onClose={onClose} title="Settings">
      <div className="space-y-5">
        <div>
          <label className={label} htmlFor="yn">Your name (used to sign emails)</label>
          <input id="yn" className={input} value={n} onChange={(e) => setN(e.target.value)} placeholder="[Your name]" />
        </div>
        <div>
          <div className={label}>Jummah times</div>
          {(["standard", "daylight"] as const).map((season) => (
            <div key={season} className="mb-2 grid grid-cols-[1fr_auto_auto] items-center gap-2">
              <span className="text-sm">{season === "standard" ? "Standard time (PST)" : "Daylight time (PDT)"}</span>
              {[0, 1].map((i) => (
                <input key={i} type="time" aria-label={`${season} Jummah ${i + 1}`} className={`${input} w-[7.5rem]`} value={j[season][i]} onChange={(e) => setSlot(season, i, e.target.value)} />
              ))}
            </div>
          ))}
          <label className="flex items-center gap-2 text-sm">
            Length
            <input type="number" min={15} max={120} className={`${input} w-20`} value={j.durationMinutes} onChange={(e) => setJ({ ...j, durationMinutes: Math.max(15, Math.min(120, Number(e.target.value) || 45)) })} />
            min
          </label>
        </div>
        <button onClick={() => { onSave(n, j); onClose(); }} className="w-full rounded-xl bg-gold px-3 py-2.5 text-sm font-semibold text-navy hover:brightness-105">
          Save settings
        </button>

        <div className="border-t border-white/10 pt-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Add a commitment</div>
          <div className="space-y-2">
            <input className={input} placeholder="Title (e.g. Board meeting)" value={cm.title} onChange={(e) => setCm({ ...cm, title: e.target.value })} aria-label="Commitment title" />
            <div className="grid grid-cols-3 gap-2">
              <select className={input} value={cm.type} onChange={(e) => setCm({ ...cm, type: e.target.value })} aria-label="Type">
                {["Class", "Shift", "Board meeting", "Other"].map((t) => <option key={t}>{t}</option>)}
              </select>
              <input type="time" className={input} value={cm.start} onChange={(e) => e.target.value && setCm({ ...cm, start: e.target.value })} aria-label="Start" />
              <input type="time" className={input} value={cm.end} onChange={(e) => e.target.value && setCm({ ...cm, end: e.target.value })} aria-label="End" />
            </div>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5"><input type="radio" checked={cm.repeatsWeekly} onChange={() => setCm({ ...cm, repeatsWeekly: true })} /> Weekly</label>
              <label className="flex items-center gap-1.5"><input type="radio" checked={!cm.repeatsWeekly} onChange={() => setCm({ ...cm, repeatsWeekly: false })} /> Single date</label>
            </div>
            {cm.repeatsWeekly ? (
              <div className="flex flex-wrap gap-1.5">
                {WEEK_DAYS.map((d) => {
                  const on = cm.days.includes(d);
                  return (
                    <button key={d} type="button" aria-pressed={on} onClick={() => setCm({ ...cm, days: on ? cm.days.filter((x) => x !== d) : [...cm.days, d] })}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${on ? "bg-sky text-navy" : "border border-white/15 text-muted"}`}>
                      {d}
                    </button>
                  );
                })}
              </div>
            ) : (
              <input type="date" className={input} min="2026-09-21" max="2026-12-13" value={cm.date} onChange={(e) => setCm({ ...cm, date: e.target.value })} aria-label="Date" />
            )}
            <button onClick={addCommitment} className="w-full rounded-xl border border-white/20 px-3 py-2 text-sm font-semibold hover:bg-white/5">Add commitment</button>
            {cmMsg && <p className="text-xs text-muted">{cmMsg}</p>}
            <p className="text-xs text-muted">Weekly commitments repeat in Weeks 1–10.</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
