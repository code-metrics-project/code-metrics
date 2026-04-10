/**
 * Return a new array with duplicate values removed.
 * Uses Set for O(n) performance.
 */
export const uniq = <T>(array: T[]): T[] => [...new Set(array)];
