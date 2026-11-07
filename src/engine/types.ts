export type DayName = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
export type BlockKind = "class" | "commitment" | "event";

/** A busy block on one specific date. start/end are minutes since local (LA) midnight. */
export interface Block {
  id: string;
  kind: BlockKind;
  title: string;
  date: string; // YYYY-MM-DD
  start: number;
  end: number;
  sourceId?: string; // class/commitment/event id this occurrence came from
}

export interface ClassItem {
  id: string;
  course: string;
  title: string;
  days: DayName[];
  start: string;
  end: string;
  profName: string;
  profEmail: string;
}

export interface Commitment {
  id: string;
  title: string;
  type: string;
  days: DayName[];
  start: string;
  end: string;
  repeatsWeekly: boolean;
  date?: string; // for single-date commitments
}

export type EventTimeKind = "exact" | "end-assumed" | "unknown" | "all-day";

export interface MsoEvent {
  id: string;
  title: string;
  mso: string;
  date: string;
  start: string | null;
  end: string | null;
  location: string | null;
  time: EventTimeKind;
  flyerUrl?: string;
}

export interface PrayerWindow {
  name: string; // Fajr, Dhuhr, Asr, Maghrib, Isha
  start: number;
  end: number;
}

export interface JummahSession {
  name: string; // "Jummah 1" | "Jummah 2"
  start: number;
  end: number;
}

export interface DayWindows {
  date: string;
  windows: PrayerWindow[];
  jummah: JummahSession[];
}

export type ConflictLevel = "none" | "tight" | "conflict";

export interface ConflictResult {
  level: ConflictLevel;
  reason: string;
  prayer?: string;
  windowStart?: number;
  windowEnd?: number;
  coversWhole?: boolean; // the block alone covers the entire window
  jummahOverlaps?: number; // 0, 1 or 2 (Fridays)
}
