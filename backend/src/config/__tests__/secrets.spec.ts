import { resolveAllSecretsWithResolver, SecretResolver } from "../secrets";

describe(`a secret resolver`, () => {
  const resolver: SecretResolver = {
    async resolve(secretName: string): Promise<string> {
      if (secretName === "test") {
        return "s3cr3t";
      } else if (secretName === "special/char-acters_key.name") {
        return "sp3ci4l";
      } else {
        throw new Error(`Unexpected secret name: ${secretName}`);
      }
    },
  };

  it(`resolves a single secret`, async () => {
    const input = `Hello \${secret.test}`;
    const result = await resolveAllSecretsWithResolver(input, resolver);
    expect(result).toBe("Hello s3cr3t");
  });
  it(`resolves multiple secrets`, async () => {
    const input = `Hello \${secret.test} \${secret.test}`;
    const result = await resolveAllSecretsWithResolver(input, resolver);
    expect(result).toBe("Hello s3cr3t s3cr3t");
  });

  it(`resolves secret with special characters`, async () => {
    const input = `Hello \${secret.special/char-acters_key.name}`;
    const result = await resolveAllSecretsWithResolver(input, resolver);
    expect(result).toBe("Hello sp3ci4l");
  });

  it(`replaces placeholder with falsy value when secret cannot be resolved`, async () => {
    const falsyResolver: SecretResolver = {
      async resolve(): Promise<string> {
        return undefined as unknown as string;
      },
    };
    const input = `key: \${secret.missing}`;
    const result = await resolveAllSecretsWithResolver(input, falsyResolver);
    expect(result).toBe("key: undefined");
  });

  it(`replaces placeholder with empty string when secret resolves to empty`, async () => {
    const emptyResolver: SecretResolver = {
      async resolve(): Promise<string> {
        return "";
      },
    };
    const input = `key: \${secret.empty}`;
    const result = await resolveAllSecretsWithResolver(input, emptyResolver);
    expect(result).toBe("key: ");
  });
});
