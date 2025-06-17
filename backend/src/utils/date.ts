import { add, formatISO } from "date-fns";
import { logger, verbose } from "./logger/logger";
import { DateStamp } from "../model/metrics";

export const MILLIS_PER_DAY = 1000 * 3600 * 24;

export const truncateDateOnly = (date: Date | string): DateStamp => 
  formatISO(date, { representation: "date" }) as DateStamp;

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
 * Calculate the difference between two dates in milliseconds.
 * @param date1
 * @param date2
 */
export const dateDiff = (date1: Date | string, date2: Date | string): number => {
  if (typeof date1 === "string") {
    date1 = new Date(date1);
  }
  if (typeof date2 === "string") {
    date2 = new Date(date2);
  }
  return date2.getTime() - date1.getTime();
};

/**
 * Calculate the difference in days between two dates in milliseconds.
 * @param date1
 * @param date2
 */
export const dateDiffDays = (date1: Date | string, date2: Date | string): number => {
  return dateDiff(truncateDateOnly(date1), truncateDateOnly(date2));
};

/**
 * Check if two dates are the same day.
 * @param date1
 * @param date2
 */
export const sameDay = (date1: Date | string, date2: Date | string): boolean => {
  return dateDiffDays(date1, date2) === 0;
}

/**
 * Check if two dates are the same date and time.
 * @param date1
 * @param date2
 */
export const sameDate = (date1: Date | string, date2: Date | string): boolean => {
  return dateDiff(date1, date2) === 0;
}

/**
 * Walks a date range sequentially, and inclusively, running the given operation on each day.
 * The async operation is `await`ed before moving to the next day.
 *
 * @param startDate
 * @param endDate
 * @param operation
 */
export const walkDateRange = async <T>(startDate: Date, endDate: Date, operation: (current: Date) => Promise<T>) => {
  const days = Math.round(dateDiffDays(startDate, endDate) / MILLIS_PER_DAY);
  logger(`${days} days between ${startDate.toISOString()} and ${endDate.toISOString()}`);

  for (let i = 0; i <= days; i++) {
    const current = getRelativeDate(startDate, i);
    verbose(`Walked to date: ${current}`);
    await operation(current);
  }
};

export const todayDateOnly = (): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};
