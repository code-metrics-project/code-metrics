import { getConfigDirs, readConfig } from "../config/config";
import { error, verbose } from "../utils/logger/logger";
import jwt, { TokenExpiredError } from "jsonwebtoken";
import { publicKey } from "./pubkey-license.json";

type LicenseWrapper = {
  email: string;
  key: string;
};

const LICENSE_ISS = "uk.co.deloittedigital.codemetrics.project";
const LICENSE_AUD = "uk.co.deloittedigital.codemetrics.application";

const verifyJwt = async (
  token: string,
  publicKey: jwt.Secret | jwt.GetPublicKeyOrSecret,
  audience: string,
  issuer: string,
  subject: string,
): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      publicKey,
      {
        algorithms: ["RS256"],
        audience,
        issuer,
        subject,
      },
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      },
    );
  });
};

export const validateLicense = async (dir?: string): Promise<boolean> => {
  const configDirs = getConfigDirs(dir);
  verbose(`Loading license file from ${configDirs}`);
  const license = await readConfig<LicenseWrapper>(configDirs, "license", {
    required: true,
    resolveSecrets: true,
  });
  if (license.key) {
    try {
      const valid = await verifyJwt(license.key, publicKey, LICENSE_AUD, LICENSE_ISS, license.email);
      if (valid) {
        verbose(`License is valid`);
        return true;
      } else {
        error(`License is invalid`);
      }
    } catch (e) {
      if (e instanceof TokenExpiredError) {
        error(`License has expired`);
      } else {
        error(`License is invalid: ${e}`);
      }
    }
  }
  return false;
};
