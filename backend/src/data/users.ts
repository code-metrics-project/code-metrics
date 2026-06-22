import { getConfigDirs, readConfig } from "../config/config";
import { warn } from "../utils/logger/logger";

export type User = {
  name: string;
  password: string;
  salt: string;
};

export const getUsers = async (): Promise<User[]> => {
  // Always reload to support hot-reloading of users file
  try {
    const configDirs = getConfigDirs();
    const users = await readConfig<User[]>(configDirs, "users", { required: false });

    if (!users || users.length === 0) {
      warn("No users file found - file-based authentication unavailable");
      return [];
    }
    return users;
  } catch (e) {
    warn("Failed to load users file", e);
    return [];
  }
};
