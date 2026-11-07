import { useEffect, useState } from "react";
import type { DayPrayerTimes } from "../engine/conflicts";
import { getTimesForDates, type PrayerSource } from "./prayerTimes";

export function usePrayerTimes(dates: string[]) {
  const [days, setDays] = useState<Record<string, DayPrayerTimes>>({});
  const [source, setSource] = useState<PrayerSource | null>(null);
  const [loading, setLoading] = useState(true);
  const key = dates.join(",");
  useEffect(() => {
    let alive = true;
    setLoading(true);
    getTimesForDates(dates)
      .then((r) => {
        if (!alive) return;
        setDays((prev) => ({ ...prev, ...r.days }));
        setSource(r.source);
      })
      .catch(() => alive && setSource("approx"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { days, source, loading };
}
