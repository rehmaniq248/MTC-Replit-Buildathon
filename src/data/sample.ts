import type { ClassItem, Commitment, MsoEvent } from "../engine/types";
import eventsJson from "./sample-events.json";

// All professor data is placeholder (example.edu).
export const SAMPLE_CLASSES: ClassItem[] = [
  { id: "c1", course: "CSE 100", title: "Advanced Data Structures", days: ["Mon", "Wed", "Fri"], start: "10:00", end: "10:50", profName: "Dr. Rivera", profEmail: "rivera@example.edu" },
  { id: "c2", course: "CSE 120", title: "Operating Systems", days: ["Mon", "Wed"], start: "13:00", end: "13:50", profName: "Dr. Chen", profEmail: "chen@example.edu" },
  { id: "c3", course: "ANTH 10", title: "Intro Anthropology", days: ["Tue", "Thu"], start: "11:00", end: "12:20", profName: "Dr. Okafor", profEmail: "okafor@example.edu" },
  { id: "c4", course: "CSE 101", title: "Algorithms", days: ["Tue", "Thu"], start: "14:00", end: "15:20", profName: "Dr. Patel", profEmail: "patel@example.edu" },
  { id: "c5", course: "CAT 125R", title: "Seminar", days: ["Wed"], start: "15:30", end: "18:20", profName: "Dr. Nguyen", profEmail: "nguyen@example.edu" },
  { id: "c6", course: "ECON 1", title: "Intro Economics", days: ["Fri"], start: "12:00", end: "13:50", profName: "Dr. Brooks", profEmail: "brooks@example.edu" },
];

export const SAMPLE_COMMITMENTS: Commitment[] = [
  { id: "w1", title: "Work shift", type: "Shift", days: ["Thu"], start: "16:00", end: "20:00", repeatsWeekly: true },
];

export const SAMPLE_EVENTS: MsoEvent[] = eventsJson as MsoEvent[];

// future: published CSV of a clean events sheet, polled periodically for new events
export const EVENTS_CSV_URL = "";
