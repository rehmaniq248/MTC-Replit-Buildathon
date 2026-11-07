import { useEffect, useState } from "react";
import Debug from "./Debug";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import ClassesPage from "./pages/ClassesPage";
import RemindersPage from "./pages/RemindersPage";
import TasksPage from "./pages/TasksPage";
import EventsPage from "./pages/EventsPage";
import MapPage from "./pages/MapPage";
import { SettingsModal } from "./components/Sheets";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { resetDemo, useStore } from "./lib/store";
import { ThemeToggle } from "./lib/theme";

const ROUTES = ["dashboard", "classes", "reminders", "tasks", "events", "map", "debug"] as const;
type Route = (typeof ROUTES)[number] | "home";

function readRoute(): Route {
  const h = window.location.hash.replace(/^#\/?/, "").split(/[/?]/)[0];
  if ((ROUTES as readonly string[]).includes(h)) return h as Route;
  if (window.location.pathname.startsWith("/debug")) return "debug";
  return "home";
}

function useRoute() {
  const [route, setRoute] = useState<Route>(readRoute);
  useEffect(() => {
    const on = () => {
      setRoute(readRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

const NAV: { r: Route; label: string }[] = [
  { r: "dashboard", label: "Dashboard" },
  { r: "classes", label: "Classes" },
  { r: "reminders", label: "Prayer & Reminders" },
  { r: "tasks", label: "Tasks" },
  { r: "events", label: "Events" },
  { r: "map", label: "Map" },
];

export default function App() {
  const route = useRoute();
  const { state, update, addCommitment } = useStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    const label = NAV.find((n) => n.r === route)?.label;
    document.title = label ? `${label} · MSA ILM+` : "MSA ILM+";
  }, [route]);

  if (route === "debug") return <Debug />;

  return (
    <div className="flex min-h-screen flex-col">
      {route !== "home" && (
      <header className="z-40 flex min-h-16 flex-wrap items-stretch border-b border-white/10 bg-card">
        <a href="#/" className="flex items-center bg-gold px-5 text-navy" aria-label="MSA ILM+ home">
          <span className="font-display text-2xl font-bold leading-none tracking-tight">
            MSA <span className="font-semibold">ILM</span>
            <span className="align-super text-lg">+</span>
          </span>
        </a>
        <nav className="no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto px-3 py-2 sm:justify-end" aria-label="Main">
          {NAV.map((n) => (
            <a
              key={n.r}
              href={`#/${n.r}`}
              aria-current={route === n.r ? "page" : undefined}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${route === n.r ? "bg-ink text-surface" : "text-ink/80 hover:bg-white/[0.08]"}`}
            >
              {n.label}
            </a>
          ))}
          <span className="mx-1 h-5 w-px shrink-0 bg-white/15" />
          <ThemeToggle />
          <button onClick={() => setSettingsOpen(true)} className="shrink-0 rounded-full border border-white/15 px-3.5 py-1.5 text-sm font-semibold hover:bg-white/5">Settings</button>
          <button
            onClick={() => window.confirm("Reset demo? This clears your interested events, tasks, reminders, edits and name.") && resetDemo()}
            className="shrink-0 rounded-full px-3 py-1.5 text-sm text-muted hover:text-ink"
          >
            Reset demo
          </button>
        </nav>
      </header>
      )}

      <main className="flex-1">
        <ErrorBoundary label="this page">
          {route === "home" && <Landing />}
          {route === "dashboard" && <Dashboard />}
          {route === "classes" && <ClassesPage onAddCommitment={() => setSettingsOpen(true)} />}
          {route === "reminders" && <RemindersPage />}
          {route === "tasks" && <TasksPage />}
          {route === "events" && <EventsPage />}
          {route === "map" && <MapPage />}
        </ErrorBoundary>
      </main>

      <footer className="border-t border-white/5 px-4 py-5 text-xs leading-relaxed text-muted">
        <div className="mx-auto max-w-[1400px]">
          Demo data from the MSA Avengers calendar. Some times are estimated. Live event updates, calendar-link import and Ramadan mode are coming soon.
          <a href="#/debug" className="ml-2 underline hover:text-ink">Engine debug</a>
        </div>
      </footer>

      {settingsOpen && (
        <SettingsModal name={state.name} jummah={state.jummah} onClose={() => setSettingsOpen(false)} onSave={(name, jummah) => update({ name, jummah })} onAddCommitment={addCommitment} />
      )}
    </div>
  );
}
