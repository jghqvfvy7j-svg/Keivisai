// Date helpers that respect the user's LOCAL timezone (device timezone), not
// UTC. Using toISOString() gives UTC, which shifts the "day" for users west of
// GMT (e.g. late evening in the US becomes tomorrow in UTC). These build the
// date string from local calendar parts instead.

/** Today's date as YYYY-MM-DD in the device's local timezone. */
export function localToday(): string {
  return localDateStr(new Date());
}

/** A given Date as YYYY-MM-DD in the device's local timezone. */
export function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** The date N days ago, as YYYY-MM-DD in local time. */
export function localDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateStr(d);
}

/** Convert a stored timestamp to its local YYYY-MM-DD (the day the user
 *  experienced it in their timezone). */
export function localDayOf(ts: string | Date): string {
  return localDateStr(new Date(ts));
}
