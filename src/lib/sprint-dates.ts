/** YYYY-MM-DD in local timezone */
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateString(value: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function formatDisplayDate(value: string): string {
  const date = parseDateString(value);
  if (!date) return "";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Sprint end date as YYYY-MM-DD (inclusive last day of sprint) */
export function getSprintEndDate(startDate: string | Date, durationWeeks: number): string {
  const start = typeof startDate === "string" ? parseDateString(startDate.slice(0, 10)) : startDate;
  if (!start) return "";
  const end = new Date(start);
  end.setDate(end.getDate() + durationWeeks * 7);
  return toDateString(end);
}
