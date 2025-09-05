import { Datastore, DatastoreCollection, QueryFilter } from "../db/api";
import { logger } from "../utils/logger/logger";
import { truncateDateOnly, walkDateRange } from "../utils/date";

/**
 * Objects that can be stored and queried should implement
 * this type to help ensure uniqueness.
 */
export type StorableLike = {
  date: string;
};

/**
 * Walks a date range, fetching data for each day.
 * The `datastore` is queried first, and if no entry is found matching the criteria,
 * the `populator` is invoked.
 *
 * @param collectionName
 * @param filter
 * @param startDate
 * @param endDate
 * @param datastore
 * @param populator
 */
export const getDataForDateRange = async <F extends QueryFilter, DF extends F & StorableLike, T extends DF>(
  collectionName: string,
  filter: F,
  startDate: Date,
  endDate: Date,
  datastore: Datastore<DF, DatastoreCollection>,
  populator: (current: Date) => Promise<T>,
): Promise<T[]> => {
  try {
    logger(`Fetching data between ${startDate.toISOString()}-${endDate.toISOString()} for`, filter);

    const result: T[] = [];
    await walkDateRange(startDate, endDate, async (current) => {
      const datedFilter: DF = { ...filter, date: truncateDateOnly(current) };
      const data = await getDataForDate(collectionName, current, datedFilter, datastore, populator);
      if (data != null) {
        result.push(data);
      }
    });
    return result;
  } catch (err) {
    throw new Error(
      `Failed to fetch ${JSON.stringify(
        filter,
      )} data between ${startDate.toISOString()}-${endDate.toISOString()} - error: ${err}`,
    );
  }
};

/**
 * Wraps call to `populator` with DB cache.
 *
 * @param collectionName
 * @param date
 * @param filter
 * @param datastore
 * @param populator
 */
const getDataForDate = async <F extends StorableLike, T extends F>(
  collectionName: string,
  date: Date,
  filter: F,
  datastore: Datastore<F, DatastoreCollection>,
  populator: (current: Date) => Promise<T | null>,
): Promise<T | null> => datastore.findOrInsertOneDated<T>(collectionName, date, filter, () => populator(date));
