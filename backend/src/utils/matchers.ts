export const matchOrEquals = (comparand: string, subject: string) => {
  // Guard against non-string inputs
  if (typeof comparand !== "string" || typeof subject !== "string") {
    return false;
  }
  const pattern = comparand.match(/\/.+\//) ? comparand.substring(1, comparand.length - 1) : `^${comparand}$`;
  return new RegExp(pattern).test(subject);
};
