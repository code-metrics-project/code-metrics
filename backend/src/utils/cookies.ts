import { CookieOptions, Request, Response } from "express";
import { verbose } from "./logger/logger";
import { decrypt, encrypt } from "./cryptoutil";
import { getTokenSecret } from "../auth/tokens";
import { getEnvConfigItem } from "../config/sources/source";

const COOKIE_SAME_SITE = getEnvConfigItem("COOKIE_SAME_SITE");

/**
 * Writes an encrypted cookie to the response.
 * @param res
 * @param name
 * @param cleartextCookieValue
 * @param salt
 * @param options
 */
export const writeEncryptedCookie = <C>(
  res: Response,
  name: string,
  cleartextCookieValue: C,
  salt: string,
  options: CookieOptions = {},
): void => {
  verbose(`Setting cookie: ${name}`);
  const encrypted = encrypt(getTokenSecret(), salt, JSON.stringify(cleartextCookieValue));
  const allOptions = {
    httpOnly: true,
    sameSite: COOKIE_SAME_SITE as any,
    ...options,
  };
  res.cookie(name, encrypted, allOptions);
};

/**
 * Reads an encrypted cookie from the request.
 * @param req
 * @param name
 * @param salt
 */
export const readEncryptedCookie = <C>(req: Request, name: string, salt: string): C | null => {
  verbose(`Reading cookie: ${name}`);
  const encryptedCookie = req.cookies[name];
  if (!encryptedCookie) {
    verbose(`No cookie found named ${name}`);
    return null;
  }
  const decrypted = decrypt(getTokenSecret(), salt, encryptedCookie);
  return JSON.parse(decrypted);
};
