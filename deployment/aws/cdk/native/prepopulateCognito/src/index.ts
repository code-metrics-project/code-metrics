const {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

const cognitoClient = new CognitoIdentityProviderClient();

type DemoUser = { Username: string; Password: string; Email: string };

export function parseDemoUsers(raw: string | undefined): DemoUser[] {
  if (!raw || !raw.trim()) {
    throw new Error("DEMO_USERS environment variable is required");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`DEMO_USERS must be valid JSON: ${(error as Error).message}`);
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("DEMO_USERS must be a non-empty JSON array");
  }

  return parsed.map((user: any, index: number) => {
    const username = String(user?.Username || "").trim();
    const password = String(user?.Password || "");
    const email = String(user?.Email || user?.Username || "").trim();

    if (!username || !password || !email) {
      throw new Error(`DEMO_USERS[${index}] requires Username, Password, and Email`);
    }

    return { Username: username, Password: password, Email: email };
  });
}

function errorName(error: unknown): string {
  const candidate = error as { name?: unknown; __type?: unknown };
  return String(candidate?.name || candidate?.__type || "");
}

async function seedUser(userPoolId: string, user: DemoUser): Promise<void> {
  try {
    await cognitoClient.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: user.Username,
        UserAttributes: [
          { Name: "email", Value: user.Email },
          { Name: "email_verified", Value: "true" },
        ],
        MessageAction: "SUPPRESS",
      }),
    );
    console.log(`User ${user.Username} successfully created.`);
  } catch (error) {
    if (!new Set(["UsernameExistsException", "UserAlreadyExistsException"]).has(errorName(error))) {
      throw error;
    }
    console.log(`User ${user.Username} already exists; updating its password instead.`);
  }

  // The demo users file is the source of truth for demo passwords, so an
  // existing account is always reset to the file value on re-deploy.
  await cognitoClient.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: user.Username,
      Password: user.Password,
      Permanent: true,
    }),
  );
}

export const handler = async function (event: any) {
  const userPoolId = process.env.USER_POOL_ID;
  if (!userPoolId) {
    throw new Error("USER_POOL_ID environment variable is required");
  }

  if (!event?.RequestId) {
    throw new Error("Missing RequestId in the CloudFormation event");
  }

  if (event.RequestType === "Delete") {
    // The user pool's own removal policy removes its users; nothing to do.
    return {
      Status: "SUCCESS",
      PhysicalResourceId: userPoolId,
    };
  }

  const users = parseDemoUsers(process.env.DEMO_USERS);

  for (const user of users) {
    await seedUser(userPoolId, user);
  }

  return {
    Status: "SUCCESS",
    PhysicalResourceId: userPoolId,
  };
};
