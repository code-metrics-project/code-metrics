export const roundTo = (n: number, digits = 0): number => {
  const multiplicator = Math.pow(10, digits);
  const parsed = parseFloat((n * multiplicator).toFixed(11));
  const test = Math.round(parsed) / multiplicator;
  return +test.toFixed(digits);
};
