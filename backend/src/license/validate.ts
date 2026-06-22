import { getConfigDirs, readConfig } from "../config/config";
import { verbose, warn } from "../utils/logger/logger";
import jwt, { TokenExpiredError } from "jsonwebtoken";
import { publicKey } from "./pubkey-license.json";
import { isStrictMode } from "../utils/strict";

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

let licenceValidated = false;
export const validateLicense = async (dir?: string): Promise<boolean> => {
  const configDirs = getConfigDirs(dir);
  verbose(`Loading license file from ${configDirs}`);
  try {
    const license = await readConfig<LicenseWrapper>(configDirs, "license", {
      required: false,
      resolveSecrets: true,
    });

    if (!license) {
      warn("No license file found - running in unlicensed mode");
      licenceValidated = false;
      return false;
    }

    try {
      const valid = await verifyJwt(license.key, publicKey, LICENSE_AUD, LICENSE_ISS, license.email);
      if (valid) {
        verbose(`License is valid`);
        licenceValidated = true;
        return true;
      } else {
        throw new Error(`License is invalid`);
      }
    } catch (e) {
      if (e instanceof TokenExpiredError) {
        throw new Error(`License has expired`);
      } else {
        throw new Error(`License is invalid: ${e}`);
      }
    }
  } catch (e) {
    licenceValidated = false;
    if (isStrictMode()) {
      throw e;
    } else {
      warn("License validation failed", e);
      return false;
    }
  }
};

export const isLicensed = async () => {
  // Always re-validate to support hot-reloading of license files
  return validateLicense();
};

export const requiresLicense = async (req, res, next) => {
  if (!(await isLicensed())) throw new Error("License required for this route.");
  next();
};
