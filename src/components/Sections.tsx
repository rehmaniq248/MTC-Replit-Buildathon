import type { ReactNode } from "react";

/** Film-grain noise as an inline SVG (no external assets). */
export const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export const DASHBOARD_GRADIENT =
  "radial-gradient(120% 90% at 0% 0%, #EAF6FF 0%, rgba(234,246,255,0) 55%)," +
  "radial-gradient(90% 70% at 100% 45%, #3B86D1 0%, rgba(59,134,209,0) 70%)," +
  "linear-gradient(180deg, #CBE7FB 0%, #8CCBF5 30%, #4E8FD3 56%, #22477E 80%, #182B49 100%)";

/* ---------- symbols (line art on a 24 grid) ---------- */
const sym = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
export const SYMBOLS = {
  dashboard: sym(<><rect x="3" y="3" width="7.5" height="7.5" rx="1.8" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.8" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.8" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8" /></>),
  moon: sym(<><path d="M19 15.2A7.8 7.8 0 0 1 8.8 5a7.8 7.8 0 1 0 10.2 10.2Z" /><path d="m17.5 3.5.6 1.3 1.4.2-1 1 .2 1.4-1.2-.7-1.2.7.2-1.4-1-1 1.4-.2z" /></>),
  book: sym(<><path d="M12 6.5C10 4.8 6.8 4.3 3 4.8v13.4c3.8-.5 7 0 9 1.7 2-1.7 5.2-2.2 9-1.7V4.8c-3.8-.5-7 0-9 1.7Z" /><path d="M12 6.5v13.4" /></>),
  check: sym(<><circle cx="12" cy="12" r="9" /><path d="m7.8 12.2 2.8 2.8 5.6-6" /></>),
  pin: sym(<><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.4" /></>),
  bell: sym(<><path d="M6 9a6 6 0 0 1 12 0c0 6.5 2.5 8.5 2.5 8.5h-17S6 15.5 6 9" /><path d="M10.2 20.5a2 2 0 0 0 3.6 0" /></>),
};
export type SymbolKey = keyof typeof SYMBOLS;

/** Symbol in a lighter shade with a mirrored, fading reflection below it (glossy floor). */
export function MirrorSymbol({ k, className = "-right-[4%] bottom-[16%] w-[30%] max-w-[230px] sm:w-[46%]" }: { k: SymbolKey; className?: string }) {
  const mask = "linear-gradient(to top, rgba(0,0,0,0.55), transparent 55%)";
  return (
    <div aria-hidden className={`pointer-events-none absolute text-snow/[0.24] ${className}`}>
      <div className="aspect-square">{SYMBOLS[k]}</div>
      <div className="aspect-square -scale-y-100 opacity-70 blur-[1px]" style={{ maskImage: mask, WebkitMaskImage: mask }}>
        {SYMBOLS[k]}
      </div>
    </div>
  );
}

export const Sheen = () => (
  <div
    aria-hidden
    className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.04)_38%,transparent_55%,rgba(0,0,0,0.10)_100%)]"
  />
);

/* ---------- one theme per section: used by the home blocks AND the pages ---------- */
export type SectionKey = "dashboard" | "events" | "classes" | "tasks" | "reminders" | "map";
export interface Section {
  href: string;
  title: string;
  bg: string; // css background
  tint: string; // page wash colour (rgba)
  fg: "light" | "dark"; // text colour that reads on bg
  symbol: SymbolKey;
}
export const SECTIONS: Record<SectionKey, Section> = {
  dashboard: { href: "#/dashboard", title: "Dashboard", bg: "#00629B", tint: "rgba(0,98,155,0.20)", fg: "light", symbol: "dashboard" },
  events: { href: "#/events", title: "MSO Events", bg: "#FFCD00", tint: "rgba(255,205,0,0.20)", fg: "dark", symbol: "moon" },
  classes: { href: "#/classes", title: "Classes", bg: "#182B49", tint: "rgba(24,43,73,0.20)", fg: "light", symbol: "book" },
  tasks: { href: "#/tasks", title: "Tasks", bg: "#0E1A30", tint: "rgba(14,26,48,0.18)", fg: "light", symbol: "check" },
  reminders: { href: "#/reminders", title: "Prayer Times & Reminders", bg: "#7FC8F8", tint: "rgba(127,200,248,0.30)", fg: "dark", symbol: "bell" },
  map: { href: "#/map", title: "Campus Map", bg: "#C69214", tint: "rgba(198,146,20,0.20)", fg: "dark", symbol: "pin" },
};

/** Soft wash of the section colour at the top of the page body. */
export const pageWash = (k: SectionKey) => ({ background: `linear-gradient(to bottom, ${SECTIONS[k].tint} 0px, transparent 420px)` });

/** Header band in the section's exact colour, with the same symbol/sheen/grain as its home block. */
export function SectionHeader({ section, title, sub, children }: { section: SectionKey; title?: string; sub?: ReactNode; children?: ReactNode }) {
  const s = SECTIONS[section];
  return (
    <header className={`relative overflow-hidden ${s.fg === "dark" ? "force-light text-navy" : "force-dark text-snow"}`} style={{ background: s.bg }}>
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40 mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
      <MirrorSymbol k={s.symbol} className="right-[3%] top-1/2 w-[110px] -translate-y-[30%] sm:w-[170px]" />
      <Sheen />
      <div className="relative mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-3 px-4 pb-8 pt-10 sm:pt-12">
        <div className="max-w-[75%]">
          <h1 className="font-display text-4xl font-bold leading-[1.02] tracking-tight sm:text-5xl">{title ?? s.title}</h1>
          {sub && <div className={`mt-2 max-w-xl ${s.fg === "dark" ? "text-navy/75" : "text-snow/80"}`}>{sub}</div>}
        </div>
        {children && <div className="relative flex flex-wrap gap-2">{children}</div>}
      </div>
    </header>
  );
}
