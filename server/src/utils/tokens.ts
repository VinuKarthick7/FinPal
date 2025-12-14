import crypto from 'crypto';

export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

export const createVerificationToken = (): { token: string; tokenHash: string; expiresAt: Date } => {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  return { token, tokenHash, expiresAt };
};
