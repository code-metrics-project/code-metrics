import { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { unauthorised } from "../utils/responses";
import { AUD, ISS } from "../auth/auth";

const { ACCESS_TOKEN_SECRET } = process.env;

export const validateJWT: RequestHandler = async (req, res, next): Promise<void> => {
  const authToken = req?.headers?.authorization || (req?.query.token as string);

  if (!authToken) {
    unauthorised(res);
    return;
  }

  const formattedAuthToken = authToken.replace("Bearer ", "");

  jwt.verify(
    formattedAuthToken,
    ACCESS_TOKEN_SECRET,
    {
      audience: AUD,
      issuer: ISS,
    },
    (err) => {
      if (err) {
        unauthorised(res);
        return;
      }

      next();
    },
  );
};
