const CFN_REMOVE_MARKERS = ["REMOVE", "AWS::NoValue"];

const normalizeUrl = (value: unknown): string | null => {
  const url = String(value ?? "").trim();
  if (!url) {
    return null;
  }
  if (!url.startsWith("https://")) {
    throw new Error(`Cognito redirect URL must use https:// (got '${url}')`);
  }
  return url;
};

/**
 * Parse a Cognito URL list prop as delivered by CloudFormation.
 * Accepts a JSON array string (e.g. '["https://a"]'), an actual array, or a
 * comma-separated string. CloudFormation "REMOVE" / "AWS::NoValue" markers
 * (or null/undefined/empty) mean "no value" and yield an empty array.
 */
export function parseUrlList(raw: unknown): string[] {
  if (raw === undefined || raw === null) {
    return [];
  }
  if (typeof raw === "string" && CFN_REMOVE_MARKERS.includes(raw)) {
    return [];
  }
  let values: unknown[];
  if (Array.isArray(raw)) {
    values = raw;
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) {
      return [];
    }
    if (trimmed.startsWith("[")) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (!Array.isArray(parsed)) {
          throw new Error("not an array");
        }
        values = parsed;
      } catch (error) {
        throw new Error(`Cognito redirect URL list must be a JSON array string: ${(error as Error).message}`);
      }
    } else {
      values = trimmed.split(",");
    }
  } else {
    throw new Error(`Unsupported Cognito redirect URL list value: ${String(raw)}`);
  }
  const urls = new Set<string>();
  for (const value of values) {
    const url = normalizeUrl(value);
    if (url) {
      urls.add(url);
    }
  }
  return [...urls].sort();
}

export function urlListsMatch(a: string[], b: string[]): boolean {
  const left = [...a].sort();
  const right = [...b].sort();
  if (left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
}

export function buildPhysicalResourceId(userPoolId: string, userPoolClientId: string): string {
  return `${userPoolId}:${userPoolClientId}`;
}

type CfnEvent = {
  RequestType: string;
  PhysicalResourceId?: string;
  ResourceProperties?: Record<string, unknown>;
};

// On a brand new stack the IAM policy granting cognito-idp permissions can
// still be propagating when the custom resource's first call lands, so the
// first Cognito API call can fail with AccessDenied. Retry transient errors
// instead of failing (and rolling back) the whole stack.
const RETRYABLE_ERROR_NAMES = new Set([
  "AccessDeniedException",
  "ThrottlingException",
  "LimitExceededException",
  "InternalErrorException",
  "ServiceFailureException",
]);

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const sendWithRetry = async (
  client: { send: (command: unknown) => Promise<unknown> },
  command: unknown,
  options: { attempts?: number; baseDelayMs?: number } = {},
): Promise<unknown> => {
  const attempts = options.attempts ?? 4;
  const baseDelayMs = options.baseDelayMs ?? 2000;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await client.send(command);
    } catch (error) {
      const name = String((error as { name?: unknown; __type?: unknown })?.name ?? "");
      if (attempt === attempts || !RETRYABLE_ERROR_NAMES.has(name)) {
        throw error;
      }
      const delayMs = baseDelayMs * 2 ** (attempt - 1);
      console.warn(`Cognito ${name} on attempt ${attempt}/${attempts}; retrying in ${delayMs}ms.`);
      await sleep(delayMs);
    }
  }
  throw new Error("unreachable");
};

const loadSdk = () => {
  // Loaded lazily so importing this module (e.g. for pure helpers or unit
  // tests) never requires the AWS SDK to be installed.
  const {
    CognitoIdentityProviderClient,
    DescribeUserPoolClientCommand,
    UpdateUserPoolClientCommand,
  } = require("@aws-sdk/client-cognito-identity-provider");
  return { CognitoIdentityProviderClient, DescribeUserPoolClientCommand, UpdateUserPoolClientCommand };
};

export const handler = async function (event: CfnEvent) {
  const props = event.ResourceProperties || {};
  const userPoolId = String(props.UserPoolId || "");
  const userPoolClientId = String(props.UserPoolClientId || "");

  if (event.RequestType === "Delete") {
    return {
      Status: "SUCCESS",
      PhysicalResourceId: event.PhysicalResourceId || buildPhysicalResourceId(userPoolId, userPoolClientId),
    };
  }

  if (!userPoolId || !userPoolClientId) {
    throw new Error("UserPoolId and UserPoolClientId resource properties are required");
  }

  const resourcePhysicalId = event.PhysicalResourceId || buildPhysicalResourceId(userPoolId, userPoolClientId);
  const desiredCallbackUrls = parseUrlList(props.CallbackUrls);
  const desiredLogoutUrls = parseUrlList(props.LogoutUrls);

  const sdk = loadSdk();
  const cognitoClient = new sdk.CognitoIdentityProviderClient();

  const describeResponse = (await sendWithRetry(
    cognitoClient,
    new sdk.DescribeUserPoolClientCommand({
      UserPoolId: userPoolId,
      ClientId: userPoolClientId,
      IncludeExpires: false,
    }),
  )) as { UserPoolClient?: { CallbackURLs?: string[]; LogoutURLs?: string[] } };
  const currentClient = describeResponse?.UserPoolClient || {};
  const currentCallbackUrls = Array.isArray(currentClient.CallbackURLs) ? currentClient.CallbackURLs : [];
  const currentLogoutUrls = Array.isArray(currentClient.LogoutURLs) ? currentClient.LogoutURLs : [];

  if (
    urlListsMatch(currentCallbackUrls, desiredCallbackUrls) &&
    urlListsMatch(currentLogoutUrls, desiredLogoutUrls)
  ) {
    console.log("Cognito client redirect URLs already match desired values; skipping update.");
    return { Status: "SUCCESS", PhysicalResourceId: resourcePhysicalId };
  }

  await sendWithRetry(
    cognitoClient,
    new sdk.UpdateUserPoolClientCommand({
      UserPoolId: userPoolId,
      ClientId: userPoolClientId,
      CallbackURLs: desiredCallbackUrls,
      LogoutURLs: desiredLogoutUrls,
      GenerateSecret: false,
    }),
  );
  console.log(
    `Updated Cognito client ${userPoolClientId} (pool ${userPoolId}) with callback URLs [${desiredCallbackUrls.join(
      ", ",
    )}] and logout URLs [${desiredLogoutUrls.join(", ")}].`,
  );

  return { Status: "SUCCESS", PhysicalResourceId: resourcePhysicalId };
};
