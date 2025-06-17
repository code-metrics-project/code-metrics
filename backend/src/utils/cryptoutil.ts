import crypto from 'crypto';

/**
 * Encrypts cleartext using a passphrase and salt
 * @param passphrase
 * @param salt
 * @param cleartext
 */
export const encrypt = (passphrase: string, salt: string, cleartext: string): string => {
  const key = crypto.scryptSync(passphrase, salt, 24);
  const iv = Buffer.alloc(16, 0);
  const cipher = crypto.createCipheriv('aes-192-cbc', key, iv);
  let encrypted = cipher.update(cleartext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

/**
 * Decrypts encrypted text using a passphrase and salt
 * @param passphrase
 * @param salt
 * @param encrypted
 */
export const decrypt = (passphrase: string, salt: string, encrypted: string): string => {
  const key = crypto.scryptSync(passphrase, salt, 24);
  const iv = Buffer.alloc(16, 0);
  const decipher = crypto.createDecipheriv('aes-192-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};
