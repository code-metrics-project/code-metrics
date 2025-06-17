export const matchOrEquals = (comparand: string, subject: string) => {
  const pattern = comparand.match(/\/.+\//) ? comparand.substring(1, comparand.length - 1) : `^${comparand}$`;
  return new RegExp(pattern).test(subject);
};
