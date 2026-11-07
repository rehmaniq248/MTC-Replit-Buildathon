import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { SAMPLE_EVENTS } from "../data/sample";
import { CAMPUS_CENTER, CLASS_LOCATIONS, FIXED_PLACES, KIND_STYLE, eventPlace, type Place } from "../data/places";
import { fmtTime, toMin, weekDates } from "../engine/time";
import { useStore } from "../lib/store";
import { todayWeekIndex } from "../lib/useWeek";

// OpenFreeMap: free, keyless vector tiles with minimalist styles.
const STYLES = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

/** All places to show: your classes, prayer spaces, halal food, and this week's MSO events. */
export function usePlaces(): Place[] {
  const { state } = useStore();
  return useMemo(() => {
    const classes: Place[] = state.classes
      .filter((c) => CLASS_LOCATIONS[c.id])
      .map((c) => ({
        id: `cl-${c.id}`,
        kind: "class",
        name: c.course,
        where: CLASS_LOCATIONS[c.id].where,
        lat: CLASS_LOCATIONS[c.id].lat,
        lng: CLASS_LOCATIONS[c.id].lng,
        detail: `${c.days.join(" ")} · ${fmtTime(toMin(c.start))}–${fmtTime(toMin(c.end))}`,
      }));
    const dates = weekDates(todayWeekIndex());
    const events = SAMPLE_EVENTS.filter((e) => dates.includes(e.date))
      .map((e) => eventPlace(e))
      .filter(Boolean) as Place[];
    return [...classes, ...FIXED_PLACES, ...events];
  }, [state.classes]);
}

/** Watches the <html class="dark"> toggle. */
export function useIsDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains("dark")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function popupHtml(p: Place) {
  return (
    `<div class="map-pop"><div class="map-pop-kind" style="color:${KIND_STYLE[p.kind].color}">${esc(KIND_STYLE[p.kind].label.replace(" this week", ""))}</div>` +
    `<div class="map-pop-name">${esc(p.name)}</div><div class="map-pop-where">${esc(p.where)}</div>` +
    (p.detail ? `<div class="map-pop-detail">${esc(p.detail)}</div>` : "") +
    (p.demo ? `<div class="map-pop-demo">Demo location</div>` : "") +
    `</div>`
  );
}

export interface CampusMapProps {
  places: Place[];
  mini?: boolean; // non-interactive preview (home widget)
  forceDark?: boolean;
  focus?: string | null; // "placeId#nonce" to fly to
  className?: string;
}

export function CampusMap({ places, mini, forceDark, focus, className = "" }: CampusMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Record<string, maplibregl.Marker>>({});
  const [failed, setFailed] = useState(false);
  const themeDark = useIsDark();
  const dark = forceDark || themeDark;

  // create once
  useEffect(() => {
    if (!el.current || map.current) return;
    try {
      const m = new maplibregl.Map({
        container: el.current,
        style: dark ? STYLES.dark : STYLES.light,
        center: [CAMPUS_CENTER[1], CAMPUS_CENTER[0]],
        zoom: mini ? 14.6 : 15.6,
        interactive: !mini,
        attributionControl: mini ? false : { compact: true },
        fadeDuration: 0,
      });
      if (!mini) m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
      m.on("error", (e) => {
        // tile/style network problems: keep the pins, show a note
        if (String(e?.error?.message || "").match(/fetch|network|Failed|style/i)) setFailed(true);
      });
      map.current = m;
    } catch {
      setFailed(true); // e.g. WebGL unavailable
    }
    return () => {
      map.current?.remove();
      map.current = null;
      markers.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mini]);

  // style follows the theme (DOM markers survive setStyle)
  const firstStyle = useRef(true);
  useEffect(() => {
    if (firstStyle.current) {
      firstStyle.current = false;
      return;
    }
    map.current?.setStyle(dark ? STYLES.dark : STYLES.light);
  }, [dark]);

  // markers
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    Object.values(markers.current).forEach((mk) => mk.remove());
    markers.current = {};
    const size = mini ? 9 : 16;
    for (const p of places) {
      const dot = document.createElement(mini ? "span" : "button");
      dot.className = "map-dot";
      dot.style.setProperty("--c", KIND_STYLE[p.kind].color);
      dot.style.setProperty("--s", `${size}px`);
      if (!mini) {
        dot.setAttribute("aria-label", `${p.name}, ${p.where}`);
        dot.title = p.name;
      }
      const mk = new maplibregl.Marker({ element: dot }).setLngLat([p.lng, p.lat]);
      if (!mini) mk.setPopup(new maplibregl.Popup({ closeButton: false, offset: 12, maxWidth: "260px" }).setHTML(popupHtml(p)));
      mk.addTo(m);
      markers.current[p.id] = mk;
    }
    if (places.length) {
      const b = new maplibregl.LngLatBounds();
      places.forEach((p) => b.extend([p.lng, p.lat]));
      m.fitBounds(b, { padding: mini ? 16 : 56, maxZoom: 17, duration: 0 });
    }
  }, [places, mini]);

  // fly to a focused place
  useEffect(() => {
    const m = map.current;
    const id = focus?.split("#")[0];
    if (!m || !id || !markers.current[id]) return;
    const mk = markers.current[id];
    Object.values(markers.current).forEach((x) => x.getPopup()?.isOpen() && x.togglePopup());
    m.flyTo({ center: mk.getLngLat(), zoom: 17.5, duration: 900, essential: true });
    setTimeout(() => !mk.getPopup()?.isOpen() && mk.togglePopup(), 950);
  }, [focus]);

  return (
    <div className={`relative overflow-hidden ${dark ? "bg-[#1b2433]" : "bg-[#e9edf2]"} ${className}`}>
      <div ref={el} className={`absolute inset-0 ${mini ? "pointer-events-none" : ""}`} aria-label={mini ? undefined : "Campus map"} />
      {failed && !mini && (
        <div className="absolute inset-x-3 bottom-3 z-10 rounded-xl bg-card/95 px-3 py-2 text-xs text-ink shadow">The map couldn't fully load (offline?). Use the list to find places.</div>
      )}
    </div>
  );
}
