// In-memory stand-in for @aws-sdk/client-cognito-identity-provider.
// Wired up via jest moduleNameMapper so the authWiring handler's lazy
// `require("@aws-sdk/client-cognito-identity-provider")` resolves here in tests.

export type MockUserPoolClient = {
  ClientId?: string;
  CallbackURLs?: string[];
  LogoutURLs?: string[];
};

type RecordedCommand = {
  name: string;
  input: Record<string, unknown>;
};

type MockUser = {
  username: string;
  email?: string;
  password?: string;
};

const state: {
  clients: Record<string, MockUserPoolClient>;
  users: Record<string, MockUser>;
  commands: RecordedCommand[];
  failNext: number;
  failNextError: Error | null;
} = {
  clients: {},
  users: {},
  commands: [],
  failNext: 0,
  failNextError: null,
};

export function __reset(): void {
  state.clients = {};
  state.users = {};
  state.commands = [];
  state.failNext = 0;
  state.failNextError = null;
}

/** Make the next `count` sends throw `error` (simulates transient Cognito failures). */
export function __failNextSends(count: number, error: Error): void {
  state.failNext = count;
  state.failNextError = error;
}

export function __setClient(clientId: string, client: MockUserPoolClient): void {
  state.clients[clientId] = { ClientId: clientId, ...client };
}

export function __getClient(clientId: string): MockUserPoolClient | undefined {
  return state.clients[clientId];
}

export function __sentCommands(): RecordedCommand[] {
  return state.commands;
}

export class DescribeUserPoolClientCommand {
  readonly input: Record<string, unknown>;
  constructor(input: Record<string, unknown>) {
    this.input = input;
  }
}

export class UpdateUserPoolClientCommand {
  readonly input: Record<string, unknown>;
  constructor(input: Record<string, unknown>) {
    this.input = input;
  }
}

export class AdminCreateUserCommand {
  readonly input: Record<string, unknown>;
  constructor(input: Record<string, unknown>) {
    this.input = input;
  }
}

export class AdminSetUserPasswordCommand {
  readonly input: Record<string, unknown>;
  constructor(input: Record<string, unknown>) {
    this.input = input;
  }
}

export function __user(username: string): MockUser | undefined {
  return state.users[username];
}

export class CognitoIdentityProviderClient {
  async send(command: unknown): Promise<any> {
    if (state.failNext > 0) {
      state.failNext -= 1;
      throw state.failNextError ?? new Error("forced mock failure");
    }
    const commandAny = command as any;
    if (commandAny instanceof DescribeUserPoolClientCommand) {
      const clientId = String(commandAny.input.ClientId);
      const client = state.clients[clientId];
      if (!client) {
        throw new Error(`UserPoolClientNotFoundException: no mock client ${clientId}`);
      }
      state.commands.push({ name: "DescribeUserPoolClient", input: commandAny.input });
      return { UserPoolClient: { ...client } };
    }
    if (commandAny instanceof UpdateUserPoolClientCommand) {
      const clientId = String(commandAny.input.ClientId);
      state.clients[clientId] = {
        ClientId: clientId,
        ...(state.clients[clientId] || {}),
        CallbackURLs: commandAny.input.CallbackURLs as string[] | undefined,
        LogoutURLs: commandAny.input.LogoutURLs as string[] | undefined,
      };
      state.commands.push({ name: "UpdateUserPoolClient", input: commandAny.input });
      return { UserPoolClient: { ClientId: clientId } };
    }
    if (commandAny instanceof AdminCreateUserCommand) {
      const username = String(commandAny.input.Username);
      if (state.users[username]) {
        const error: any = new Error(`User already exists. ${username}`);
        error.name = "UsernameExistsException";
        error.__type = "UsernameExistsException";
        throw error;
      }
      const attributes = (commandAny.input.UserAttributes || []) as Array<{
        Name?: string;
        Value?: string;
      }>;
      const email = attributes.find((attr) => attr.Name === "email")?.Value;
      state.users[username] = { username, email: email ? String(email) : undefined };
      state.commands.push({ name: "AdminCreateUser", input: commandAny.input });
      return {};
    }
    if (commandAny instanceof AdminSetUserPasswordCommand) {
      const username = String(commandAny.input.Username);
      if (!state.users[username]) {
        throw new Error(`UserNotFoundException: no mock user ${username}`);
      }
      state.users[username].password = String(commandAny.input.Password);
      state.commands.push({ name: "AdminSetUserPassword", input: commandAny.input });
      return {};
    }
    throw new Error(`Mock CognitoSDK does not handle ${commandAny?.constructor?.name}`);
  }
}
