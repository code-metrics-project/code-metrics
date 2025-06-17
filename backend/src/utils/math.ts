export const roundTo = (n: number, digits = 0): number => {
  const multiplicator = Math.pow(10, digits);
  n = parseFloat((n * multiplicator).toFixed(11));
  const test = Math.round(n) / multiplicator;
  return +test.toFixed(digits);
};

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
