import * as jose from 'jose';
import { env } from './env';

const secret = new TextEncoder().encode(
  env.JWT_SECRET
);

/**
 * Encrypts a payload into a JWT token using jose.
 * @param payload The data to include in the JWT.
 * @returns A promise that resolves to the JWT token.
 */
export async function encrypt(payload: any): Promise<string> {
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1w') // 1 week
    .sign(secret);
}

/**
 * Decrypts and verifies a JWT token using jose.
 * @param token The token to decrypt.
 * @returns A promise that resolves to the payload if valid, or null if invalid.
 */
export async function decrypt(token: string): Promise<any> {
  try {
    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    // Only log error if it's NOT a standard verification failure (to avoid noise)
    const errorCode = (error as any)?.code;
    if (errorCode !== 'ERR_JWS_INVALID' && errorCode !== 'ERR_JWT_EXPIRED') {
      console.error('Unexpected JWT Verification Error:', error);
    }
    return null;
  }
}
