import { redactAndRenderAsJson } from '../redact';

describe('redactAndRenderAsJson', () => {
  it('should redact apiKey', () => {
    const input = { apiKey: '12345', other: 'visible' };
    const result = redactAndRenderAsJson(input);
    expect(result).toContain('"apiKey": "*****"');
    expect(result).toContain('"other": "visible"');
    expect(result).not.toContain('12345');
  });

  it('should redact multiple sensitive fields', () => {
    const input = {
      apiKey: 'abc',
      clientSecret: 'def',
      password: 'ghi',
      refreshToken: 'jkl',
      safe: 'ok'
    };
    const result = redactAndRenderAsJson(input);
    expect(result).toContain('"apiKey": "*****"');
    expect(result).toContain('"clientSecret": "*****"');
    expect(result).toContain('"password": "*****"');
    expect(result).toContain('"refreshToken": "*****"');
    expect(result).toContain('"safe": "ok"');
    expect(result).not.toContain('abc');
    expect(result).not.toContain('def');
    expect(result).not.toContain('ghi');
    expect(result).not.toContain('jkl');
  });

  it('should not redact fields not in the list', () => {
    const input = { username: 'user', email: 'test@example.com' };
    const result = redactAndRenderAsJson(input);
    expect(result).toContain('"username": "user"');
    expect(result).toContain('"email": "test@example.com"');
  });

  it('should redact nested fields as well', () => {
    const input = {
      apiKey: 'top',
      nested: { apiKey: 'nested' }
    };
    const result = redactAndRenderAsJson(input);
    // Both top-level and nested apiKey should be redacted
    expect(result).toContain('"apiKey": "*****"');
    // Should not contain the original nested value
    expect(result).not.toContain('"apiKey": "nested"');
  });

  it('should handle arrays', () => {
    const input = [
      { apiKey: 'a' },
      { password: 'b' },
      { safe: 'c' }
    ];
    const result = redactAndRenderAsJson(input);
    expect(result).toContain('"apiKey": "*****"');
    expect(result).toContain('"password": "*****"');
    expect(result).toContain('"safe": "c"');
  });

  it('should handle null and undefined', () => {
    const input = { apiKey: null, password: undefined };
    const result = redactAndRenderAsJson(input);
    expect(result).toContain('"apiKey": null');
    // undefined fields are omitted from JSON.stringify
    expect(result).not.toContain('password');
  });
});
