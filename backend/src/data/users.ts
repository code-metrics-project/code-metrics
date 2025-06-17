import { getConfigDirs, readConfig } from "../config/config";

export type User = {
  name: string;
  password: string;
  salt: string;
};

let users: User[];

export const getUsers = async (): Promise<User[]> => {
  if (!users) {
    const configDirs = getConfigDirs();
    users = await readConfig(configDirs, "users", { required: true });
  }
  return users;
};
