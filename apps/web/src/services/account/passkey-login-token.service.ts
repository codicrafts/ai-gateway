import { createHmac, timingSafeEqual } from 'crypto';

type PasskeyLoginTokenPayload = {
  sub: string;
  exp: number;
};

const PASSKEY_LOGIN_TOKEN_TTL_SECONDS = 60 * 5;

function getPasskeyTokenSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error('Passkey 登录缺少签名密钥配置');
  }
  return secret;
}

function signPayload(payload: string): string {
  return createHmac('sha256', getPasskeyTokenSecret()).update(payload).digest('base64url');
}

export function issuePasskeyLoginToken(userId: string): string {
  const payload: PasskeyLoginTokenPayload = {
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + PASSKEY_LOGIN_TOKEN_TTL_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyPasskeyLoginToken(token: string): { userId: string } | null {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as PasskeyLoginTokenPayload;
    if (!payload.sub || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return { userId: payload.sub };
  } catch {
    return null;
  }
}
