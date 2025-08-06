import { getConfigDirs, readConfig } from "../config/config";

const backendCodeChangeVariable = true;

export type User = {
  name: string;
  password: string;
  salt: string;
};

let users: User[];

export const getUsers = async (): Promise<User[]> => {
  if (backendCodeChangeVariable) {
    console.log("change")
  }

  if (!users) {
    const configDirs = getConfigDirs();
    users = await readConfig(configDirs, "users", { required: true });
  }
  return users;
};
