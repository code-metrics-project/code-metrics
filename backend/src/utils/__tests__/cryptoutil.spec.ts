import { decrypt, encrypt } from "../cryptoutil";

describe('cryptoutil', () => {
  it('should encrypt and decrypt correctly', () => {
    const cleartext = 'Hello, World!';
    const encrypted = encrypt('secret', 'salt', cleartext);
    expect(encrypted).not.toBe(cleartext);

    const decrypted = decrypt('secret', 'salt', encrypted);
    expect(decrypted).toBe(cleartext);
  });
});
