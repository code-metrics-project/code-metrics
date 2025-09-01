import { AuthenticationResult, Authenticator, baseAuthenticator } from "../auth";
import { logger } from "../../utils/logger/logger";
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  CognitoUserSession,
  ICognitoUserPoolData,
} from "amazon-cognito-identity-js";
import { getConfigItem } from "../../config/sources/source";

let cognitoUserPoolData: ICognitoUserPoolData;

const getCognitoConfig = (): ICognitoUserPoolData => {
  if (!cognitoUserPoolData) {
    cognitoUserPoolData = {
      UserPoolId: getConfigItem("COGNITO_USER_POOL_ID"),
      ClientId: getConfigItem("COGNITO_CLIENT_ID"),
    };
  }
  return cognitoUserPoolData;
};

export const getCognitoAuthenticator = (): Authenticator => {
  return { ...baseAuthenticator, authenticateUser };
};

const authenticateUser = async (username: string, password: string): Promise<AuthenticationResult> => {
  const authenticationDetails = new AuthenticationDetails({
    Username: username,
    Password: password,
  });
  const userPool = new CognitoUserPool(getCognitoConfig());
  const cognitoUser = new CognitoUser({
    Username: username,
    Pool: userPool,
  });

  let result: CognitoUserSession;
  try {
    result = await new Promise(function (resolve, reject) {
      cognitoUser.authenticateUser(authenticationDetails, {
        onFailure: reject,
        onSuccess: resolve,
        newPasswordRequired: () => {
          reject(new Error(`User requires a new password`));
        },
      });
    });
  } catch (e) {
    logger(`Authentication failed for user: ${username}: ${e}`);
    return { success: false };
  }

  const token = (result as CognitoUserSession)?.getAccessToken()?.getJwtToken();
  if (token) {
    logger(`Authentication succeeded with username: ${username}`);
    return { success: true, user: { name: username } };
  } else {
    logger(`Authentication failed for user: ${username}`);
    return { success: false };
  }
};
