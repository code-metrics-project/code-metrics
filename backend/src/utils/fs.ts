import fs from "fs/promises";

export const pathExists = async (path: string): Promise<boolean> => {
  try {
    const stat = await fs.stat(path);
    if (stat.isFile()) {
      return true;
    }
  } catch (ignored) {
    // sink
  }
  return false;
};
