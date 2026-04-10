import { add, formatDuration, formatISO } from "date-fns";
import { logger, verbose } from "@/utils/logger";
import { roundTo } from "@/utils/math";

export const MILLIS_PER_DAY = 1000 * 3600 * 24;

export function truncateDateOnly(date: Date): string {
  return formatISO(date, { representation: "date" });
}

/**
 * Get the date a given number of days relative to the start date, as a string
 * in the format "yyyy-mm-dd".
 * @param start
 * @param days
 * @return date-only portion of ISO-8601 formatted timestamp
 */
export const getRelativeDateAsString = (start: Date, days: number) => truncateDateOnly(add(start, { days }));

/**
 * Get the date a given number of days relative to the start date.
 * @param start
 * @param days
 */
export const getRelativeDate = (start: Date, days: number) => new Date(getRelativeDateAsString(start, days));

/**
 * Get the date a given number of days relative to the current date.
 * @param dayOffset
 */
export function getOffsetDate(dayOffset: number): Date {
  return add(new Date(), { days: dayOffset });
}

/**
 * Get today's date in date-only format.
 */
export function getTodayDateOnly(): string {
  return truncateDateOnly(new Date());
}

/**
 * Calculate the difference between two dates in milliseconds.
 * @param date1
 * @param date2
 */
export function dateDiff(date1: Date, date2: Date): number {
  // Discard the time and time-zone information.
  const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());

  return utc2 - utc1;
}

/**
 * Walks a date range sequentially, batch by the number of days, then
 * running the given operation on each batch.
 * The async operation is `await`ed before moving to the next day.
 *
 * @param startDate
 * @param endDate
 * @param batchDays
 * @param operation
 */
export const walkDateRangeBatched = async <T>(
  startDate: Date,
  endDate: Date,
  batchDays: number,
  operation: (batch: Date[], progress: number) => Promise<T>
) => {
  const days = Math.round((endDate.getTime() - startDate.getTime()) / MILLIS_PER_DAY);
  logger(`${days} days between ${startDate.toISOString()} and ${endDate.toISOString()}`);

  let batch: Date[] = [];
  for (let i = 0; i <= days; i++) {
    const current = getRelativeDate(startDate, i);
    batch.push(current);

    if (batch.length === batchDays || i === days) {
      const progress = roundTo(i / days, 2);
      verbose(`Walked to date batch: ${batch} (${progress} %)`);
      await operation(batch, progress);
      batch = [];
    }
  }
};

/**
 * Humanise the duration in seconds to a string format.
 * @param durationInSeconds
 */
export const humaniseDuration = (durationInSeconds: number) => {
  const seconds = durationInSeconds % 60;
  const minutes = Math.floor(durationInSeconds / 60) % 60;
  const hours = Math.floor(durationInSeconds / 3600);

  return formatDuration({ hours, minutes, seconds });
};
