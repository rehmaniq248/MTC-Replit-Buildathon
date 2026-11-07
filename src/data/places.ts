// Campus places for the map. Coordinates are approximate (building-level) for the demo.
import type { MsoEvent } from "../engine/types";

export type PlaceKind = "class" | "prayer" | "halal" | "event";

export interface Place {
  id: string;
  kind: PlaceKind;
  name: string; // what it is
  where: string; // building / room
  lat: number;
  lng: number;
  detail?: string;
  demo?: boolean; // spoofed location
}

export const CAMPUS_CENTER: [number, number] = [32.8797, -117.2365];

export const KIND_STYLE: Record<PlaceKind, { label: string; color: string }> = {
  class: { label: "Your classes", color: "#00629B" },
  prayer: { label: "Prayer spaces", color: "#00C6D7" },
  halal: { label: "Halal food", color: "#C69214" },
  event: { label: "MSO events this week", color: "#FFCD00" },
};

/** Where each sample class meets (placeholder rooms on real lecture halls). */
export const CLASS_LOCATIONS: Record<string, { where: string; lat: number; lng: number }> = {
  c1: { where: "Warren Lecture Hall 2001", lat: 32.8807, lng: -117.234 },
  c2: { where: "Center Hall 101", lat: 32.8774, lng: -117.2375 },
  c3: { where: "Peterson Hall 108", lat: 32.8801, lng: -117.2402 },
  c4: { where: "Galbraith Hall 242", lat: 32.8738, lng: -117.2407 },
  c5: { where: "Pepper Canyon Hall 120", lat: 32.8787, lng: -117.2319 },
  c6: { where: "Price Center Theater", lat: 32.8799, lng: -117.2364 },
};

export const FIXED_PLACES: Place[] = [
  {
    id: "p-contemplation",
    kind: "prayer",
    name: "Contemplation Lounge",
    where: "Price Center",
    lat: 32.87965,
    lng: -117.23575,
    detail: "Quiet space used for daily prayers. Check with the MSA for current hours.",
  },
  {
    id: "h-tahini",
    kind: "halal",
    name: "Tahini",
    where: "Sixth College",
    lat: 32.8808,
    lng: -117.2421,
    detail: "Halal Mediterranean.",
  },
  {
    id: "h-canyon-vista",
    kind: "halal",
    name: "Canyon Vista",
    where: "Warren College dining hall",
    lat: 32.8834,
    lng: -117.2333,
    detail: "Dining hall with halal options.",
  },
];

/** Campus venues used to spoof event locations for the demo. */
const VENUES = [
  { where: "Price Center Plaza", lat: 32.8796, lng: -117.2368 },
  { where: "Original Student Center", lat: 32.8777, lng: -117.2412 },
  { where: "Geisel Library", lat: 32.8811, lng: -117.2376 },
  { where: "Library Walk", lat: 32.8788, lng: -117.2372 },
  { where: "Muir Quad", lat: 32.8793, lng: -117.2409 },
  { where: "Revelle Plaza", lat: 32.8746, lng: -117.241 },
];
const VENUE_OVERRIDES: Record<string, { where: string; lat: number; lng: number }> = {
  e31: { where: "RIMAC (Triton Arena)", lat: 32.8852, lng: -117.2399 },
  e33: { where: "Thurgood Marshall College", lat: 32.8826, lng: -117.2416 },
  e19: { where: "Price Center East Ballroom", lat: 32.8798, lng: -117.2356 },
};

export function eventPlace(e: MsoEvent): Place | null {
  if (e.location === "Off campus" || e.location === "La Jolla Shores") return null;
  const n = Number(e.id.replace(/\D/g, "")) || 0;
  const v = VENUE_OVERRIDES[e.id] ?? VENUES[n % VENUES.length];
  return {
    id: `ev-${e.id}`,
    kind: "event",
    name: e.title,
    where: e.location ?? v.where,
    lat: v.lat,
    lng: v.lng,
    detail: e.mso,
    demo: true,
  };
}
