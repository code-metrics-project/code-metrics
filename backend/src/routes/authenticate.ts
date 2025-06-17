import { Request, Response } from "express";
import { success, unauthorised } from "../utils/responses";
import { getUserTokensFromLogin, getUserTokensFromQuery, logoutUser, UserTokens } from "../auth/auth";

const respondWithAuthState = (userTokens: UserTokens | null, res: Response) => {
  if (userTokens) {
    const { accessToken } = userTokens;
    return success(res, { accessToken });
  }
  return unauthorised(res);
};

export const checkAuthenticated = async (req: Request, res: Response) => {
  const userTokens = await getUserTokensFromQuery(req, res);
  respondWithAuthState(userTokens, res);
};

export const authenticate = async (req: Request, res: Response) => {
  const userTokens = await getUserTokensFromLogin(req.body?.username, req.body?.password);
  respondWithAuthState(userTokens, res);
};

export const logout = async (req, res) => {
  await logoutUser(req, res);
};
