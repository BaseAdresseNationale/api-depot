import * as crypto from 'crypto';

export const TOKEN_LENGTH = 32;

export function generateToken(): string {
  const charset: string =
    'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const buffer = crypto.randomBytes(TOKEN_LENGTH);
  let token = '';
  for (let i = 0; i < buffer.length; i++) {
    token += charset.charAt(Math.floor(buffer[i] % TOKEN_LENGTH));
  }
  return token;
}
