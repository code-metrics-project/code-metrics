import { AuthenticationResult, Authenticator, baseAuthenticator } from "../auth";
import { getUsers } from "../../data/users";
import { logger } from "../../utils/logger/logger";
import crypto from "crypto";

export const getFileAuthenticator = (): Authenticator => {
  return { ...baseAuthenticator, authenticateUser };
};

const authenticateUser = async (username: string, password: string): Promise<AuthenticationResult> => {
  const user = (await getUsers()).find((u) => u.name === username);
  if (!user) {
    logger(`No user found with username: ${username}`);
    return { success: false };
  }

  const hash = crypto.pbkdf2Sync(password, user.salt, 100_000, 64, "sha256").toString("hex");
  if (hash === user.password) {
    logger(`Authentication succeeded with username: ${username}`);
    return { success: true, user };
  }

  logger(`Authentication failed for user: ${username}`);
  return { success: false };
};
