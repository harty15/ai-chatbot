import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scrypt,
} from 'node:crypto';
import { promisify } from 'node:util';
import type { MCPCredentials } from './types';

const scryptAsync = promisify(scrypt);

// Get encryption key from environment variable
const ENCRYPTION_KEY =
  process.env.MCP_ENCRYPTION_KEY || 'default-key-change-in-production';

/**
 * Encrypts MCP credentials for secure storage
 */
export async function encryptCredentials(
  credentials: MCPCredentials,
  userId: string,
): Promise<string> {
  try {
    const salt = randomBytes(16);
    const key = (await scryptAsync(
      ENCRYPTION_KEY + userId,
      salt,
      32,
    )) as Buffer;
    const iv = randomBytes(16);

    const cipher = createCipheriv('aes-256-gcm', key, iv);

    const credentialsString = JSON.stringify(credentials);
    let encrypted = cipher.update(credentialsString, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine salt, iv, authTag, and encrypted data
    const combined = Buffer.concat([
      salt,
      iv,
      authTag,
      Buffer.from(encrypted, 'hex'),
    ]);

    return combined.toString('base64');
  } catch (error) {
    console.error('Error encrypting credentials:', error);
    throw new Error('Failed to encrypt credentials');
  }
}

/**
 * Decrypts MCP credentials from storage
 */
export async function decryptCredentials(
  encryptedData: string,
  userId: string,
): Promise<MCPCredentials> {
  try {
    const combined = Buffer.from(encryptedData, 'base64');

    const salt = combined.subarray(0, 16);
    const iv = combined.subarray(16, 32);
    const authTag = combined.subarray(32, 48);
    const encrypted = combined.subarray(48);

    const key = (await scryptAsync(
      ENCRYPTION_KEY + userId,
      salt,
      32,
    )) as Buffer;

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Error decrypting credentials:', error);
    throw new Error('Failed to decrypt credentials');
  }
}

/**
 * Validates that credentials can be encrypted and decrypted
 */
export async function validateCredentials(
  credentials: MCPCredentials,
  userId: string,
): Promise<boolean> {
  try {
    const encrypted = await encryptCredentials(credentials, userId);
    const decrypted = await decryptCredentials(encrypted, userId);
    return JSON.stringify(credentials) === JSON.stringify(decrypted);
  } catch {
    return false;
  }
}
