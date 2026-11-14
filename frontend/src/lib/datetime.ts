// The departure field is an <input type="datetime-local">: local time, no zone, to the minute.

const pad = (value: number) => String(value).padStart(2, "0");

export function toLocalInputValue(moment: Date): string {
  const date = `${moment.getFullYear()}-${pad(moment.getMonth() + 1)}-${pad(moment.getDate())}`;
  return `${date}T${pad(moment.getHours())}:${pad(moment.getMinutes())}`;
}

/** The moment a local date-time value names, or null if it doesn't name one. */
export function fromLocalInputValue(value: string): Date | null {
  // A date-time without a zone is read as local time.
  const moment = new Date(value);
  return value === "" || Number.isNaN(moment.getTime()) ? null : moment;
}
