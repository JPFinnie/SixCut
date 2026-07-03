import type { OpeningHours } from "@/lib/types";

const MIN_PER_DAY = 24 * 60;
const MIN_PER_WEEK = 7 * MIN_PER_DAY;

/** Current minute-of-week in Toronto (day 0 = Sunday, matching Places API). */
function torontoMinuteOfWeek(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const dayIdx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    get("weekday").slice(0, 3),
  );
  const hour = Number(get("hour")) % 24;
  return dayIdx * MIN_PER_DAY + hour * 60 + Number(get("minute"));
}

/**
 * Whether the shop is open right now, from Places `regularOpeningHours.periods`.
 * Returns null when hours are unknown. Handles periods that wrap past midnight.
 */
export function isOpenNow(hours: OpeningHours | null): boolean | null {
  const periods = hours?.periods;
  if (!periods?.length) return hours?.openNow ?? null;
  // A period with no close means open 24/7.
  if (periods.some((p) => !p.close)) return true;

  const now = torontoMinuteOfWeek();
  return periods.some((p) => {
    const open = p.open.day * MIN_PER_DAY + p.open.hour * 60 + p.open.minute;
    let close = p.close!.day * MIN_PER_DAY + p.close!.hour * 60 + p.close!.minute;
    if (close <= open) close += MIN_PER_WEEK; // wraps past Saturday night
    return (now >= open && now < close) || (now + MIN_PER_WEEK >= open && now + MIN_PER_WEEK < close);
  });
}

/** Today's hours line, e.g. "Monday: 9:00 a.m. – 6:00 p.m." */
export function todayHoursLine(hours: OpeningHours | null): string | null {
  const lines = hours?.weekdayDescriptions;
  if (!lines?.length) return null;
  const weekday = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    weekday: "long",
  }).format(new Date());
  return lines.find((l) => l.startsWith(weekday)) ?? null;
}
