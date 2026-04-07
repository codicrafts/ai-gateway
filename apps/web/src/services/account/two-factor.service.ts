import { createHmac, createHash, randomBytes, timingSafeEqual } from 'crypto';
import { createServerAdminSupabaseClient } from '@/lib/supabase';

const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1;
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

type TwoFactorUserRow = {
  id: string;
  email: string | null;
  username: string | null;
  two_factor_enabled: boolean;
  two_factor_secret: string | null;
  two_factor_recovery_codes: string[];
};

type TwoFactorChallenge = {
  totpCode?: string | null;
  recoveryCode?: string | null;
};

function normalizeCode(code: string): string {
  return code.replace(/\s+/g, '').trim();
}

function encodeBase32(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let index = 0; index < buffer.length; index += 1) {
    const byte = buffer[index];
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function decodeBase32(secret: string): Buffer {
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of secret.toUpperCase().replace(/=+$/g, '')) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error('双因素认证密钥无效');
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

function generateTotp(secret: string, counter: number): string {
  const key = decodeBase32(secret);
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buffer.writeUInt32BE(counter >>> 0, 4);

  const hmac = createHmac('sha1', key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
}

function verifyTotpCode(secret: string, code: string): boolean {
  const normalizedCode = normalizeCode(code);
  if (!/^\d{6}$/.test(normalizedCode)) {
    return false;
  }

  const counter = Math.floor(Date.now() / 1000 / TOTP_STEP_SECONDS);
  for (let offset = -TOTP_WINDOW; offset <= TOTP_WINDOW; offset += 1) {
    if (generateTotp(secret, counter + offset) === normalizedCode) {
      return true;
    }
  }

  return false;
}

function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(normalizeCode(code)).digest('hex');
}

function buildOtpauthUrl(secret: string, label: string): string {
  const issuer = process.env.TWO_FACTOR_ISSUER || 'MeshRouter';
  return `otpauth://totp/${encodeURIComponent(`${issuer}:${label}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
}

function buildRecoveryCodes(): { plain: string[]; hashed: string[] } {
  const plain = Array.from({ length: 8 }, () =>
    `${randomBytes(3).toString('hex')}-${randomBytes(3).toString('hex')}`.toUpperCase()
  );

  return {
    plain,
    hashed: plain.map(hashRecoveryCode),
  };
}

async function getTwoFactorUserById(userId: string): Promise<TwoFactorUserRow | null> {
  const supabase = createServerAdminSupabaseClient();
  const { data } = await supabase
    .from('users')
    .select('id, email, username, two_factor_enabled, two_factor_secret, two_factor_recovery_codes')
    .eq('id', userId)
    .maybeSingle();

  return (data as TwoFactorUserRow | null) || null;
}

export async function beginTwoFactorSetup(userId: string): Promise<{
  secret: string;
  otpauthUrl: string;
}> {
  const user = await getTwoFactorUserById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  if (user.two_factor_enabled) {
    throw new Error('双因素认证已启用');
  }

  const secret = encodeBase32(randomBytes(20));
  const supabase = createServerAdminSupabaseClient();
  const { error } = await supabase
    .from('users')
    .update({
      two_factor_secret: secret,
    } as never)
    .eq('id', userId);

  if (error) {
    throw new Error('初始化双因素认证失败');
  }

  const label = user.email || user.username || userId;
  return {
    secret,
    otpauthUrl: buildOtpauthUrl(secret, label),
  };
}

export async function enableTwoFactor(userId: string, totpCode: string): Promise<{ recoveryCodes: string[] }> {
  const user = await getTwoFactorUserById(userId);
  if (!user || !user.two_factor_secret) {
    throw new Error('双因素认证尚未初始化');
  }

  if (!verifyTotpCode(user.two_factor_secret, totpCode)) {
    throw new Error('验证码无效');
  }

  const recoveryCodes = buildRecoveryCodes();
  const supabase = createServerAdminSupabaseClient();
  const { error } = await supabase
    .from('users')
    .update({
      two_factor_enabled: true,
      two_factor_enabled_at: new Date().toISOString(),
      two_factor_recovery_codes: recoveryCodes.hashed,
    } as never)
    .eq('id', userId);

  if (error) {
    throw new Error('启用双因素认证失败');
  }

  return { recoveryCodes: recoveryCodes.plain };
}

export async function disableTwoFactor(userId: string, challenge: TwoFactorChallenge): Promise<void> {
  const user = await getTwoFactorUserById(userId);
  if (!user || !user.two_factor_enabled || !user.two_factor_secret) {
    throw new Error('双因素认证尚未启用');
  }

  const satisfied = verifyTwoFactorChallenge(user, challenge);
  if (!satisfied) {
    throw new Error('双因素认证校验失败');
  }

  const supabase = createServerAdminSupabaseClient();
  const { error } = await supabase
    .from('users')
    .update({
      two_factor_enabled: false,
      two_factor_secret: null,
      two_factor_enabled_at: null,
      two_factor_recovery_codes: [],
    } as never)
    .eq('id', userId);

  if (error) {
    throw new Error('关闭双因素认证失败');
  }
}

export async function getTwoFactorRequirementsForIdentifier(identifier: {
  email?: string | null;
  phone?: string | null;
}): Promise<{ requiresTwoFactor: boolean }> {
  const supabase = createServerAdminSupabaseClient();
  let query = supabase
    .from('users')
    .select('two_factor_enabled')
    .limit(1);

  if (identifier.phone) {
    query = query.eq('phone', identifier.phone);
  } else if (identifier.email) {
    query = query.eq('email', identifier.email);
  } else {
    return { requiresTwoFactor: false };
  }

  const { data } = await query.maybeSingle();
  return { requiresTwoFactor: Boolean(data?.two_factor_enabled) };
}

export function verifyTwoFactorChallenge(
  user: Pick<TwoFactorUserRow, 'two_factor_enabled' | 'two_factor_secret' | 'two_factor_recovery_codes'>,
  challenge: TwoFactorChallenge
): boolean {
  if (!user.two_factor_enabled) {
    return true;
  }

  if (challenge.totpCode && user.two_factor_secret) {
    if (verifyTotpCode(user.two_factor_secret, challenge.totpCode)) {
      return true;
    }
  }

  if (challenge.recoveryCode) {
    const incomingHash = Buffer.from(hashRecoveryCode(challenge.recoveryCode), 'hex');
    return user.two_factor_recovery_codes.some((storedCode) => {
      const storedHash = Buffer.from(storedCode, 'hex');
      return incomingHash.length === storedHash.length && timingSafeEqual(incomingHash, storedHash);
    });
  }

  return false;
}
