import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/** Number of salt rounds for bcrypt hashing. */
const SALT_ROUNDS = 12;

/**
 * Hashes a plain-text password using bcrypt (12 rounds).
 * @returns The bcrypt hash string.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
}

/**
 * Compares a plain-text password against a bcrypt hash.
 * @returns `true` if the password matches.
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Creates a SHA-256 hash of a token string.
 * Used to store refresh tokens securely in the database —
 * the raw token is never persisted.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
