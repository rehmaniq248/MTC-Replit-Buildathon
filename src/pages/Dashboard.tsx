import { WeekPlanner } from "../components/WeekPlanner";
import { Glass, PrayerTimeline, RemindersWidget, TasksWidget } from "../components/Widgets";
import { SectionHeader, pageWash } from "../components/Sections";

export default function Dashboard() {
  return (
    <div style={pageWash("dashboard")}>
      <SectionHeader section="dashboard" sub="Your week, prayers, tasks and MSO events on one screen." />
      <div className="mx-auto max-w-[1400px] px-2 py-4 sm:px-4">
        <Glass className="!bg-card/80">
          <PrayerTimeline compact />
        </Glass>
        <div className="mt-4">
          <WeekPlanner sidebarBelow={<><TasksWidget /><RemindersWidget /></>} />
        </div>
      </div>
    </div>
  );
}
