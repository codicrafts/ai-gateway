import { createHmac, randomUUID } from 'crypto';

type PhoneVerificationSmsPurpose = 'register' | 'login' | 'bind_phone' | 'reset_password' | 'auth';

const ALIYUN_SMS_VERSION = '2017-05-25';
const ALIYUN_SMS_REGION_ID = process.env.SMS_ALIYUN_REGION_ID || 'cn-hangzhou';
const ALIYUN_SMS_ENDPOINT = process.env.SMS_ALIYUN_ENDPOINT || 'https://dysmsapi.aliyuncs.com/';

function encodeRFC3986(value: string): string {
  return encodeURIComponent(value)
    .replace(/\+/g, '%20')
    .replace(/\*/g, '%2A')
    .replace(/%7E/g, '~');
}

function toAliyunTimestamp(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function getSmsProvider(): string {
  return (process.env.SMS_PROVIDER || 'aliyun').trim().toLowerCase();
}

function resolvePhoneVerificationTemplateCode(purpose: PhoneVerificationSmsPurpose): string | null {
  const templateMap: Record<PhoneVerificationSmsPurpose, string | undefined> = {
    register: process.env.SMS_TEMPLATE_CODE_REGISTER,
    login: process.env.SMS_TEMPLATE_CODE_LOGIN,
    bind_phone: process.env.SMS_TEMPLATE_CODE_BIND_PHONE,
    reset_password: process.env.SMS_TEMPLATE_CODE_RESET_PASSWORD,
    auth: process.env.SMS_TEMPLATE_CODE_AUTH,
  };

  return templateMap[purpose] || process.env.SMS_TEMPLATE_CODE || null;
}

function getPurposeLabel(purpose: PhoneVerificationSmsPurpose): string {
  const labels: Record<PhoneVerificationSmsPurpose, string> = {
    register: '注册验证',
    login: '登录验证',
    bind_phone: '绑定手机号',
    reset_password: '重置密码',
    auth: '账号登录',
  };
  return labels[purpose];
}

function isAliyunSmsConfigured(purpose: PhoneVerificationSmsPurpose): boolean {
  return Boolean(
    process.env.SMS_ACCESS_KEY_ID &&
      process.env.SMS_ACCESS_KEY_SECRET &&
      process.env.SMS_SIGN_NAME &&
      resolvePhoneVerificationTemplateCode(purpose),
  );
}

export function canSendPhoneVerificationSms(purpose: PhoneVerificationSmsPurpose): boolean {
  const provider = getSmsProvider();
  if (provider !== 'aliyun') {
    return false;
  }

  return isAliyunSmsConfigured(purpose);
}

async function sendAliyunSms(payload: {
  phoneNumber: string;
  templateCode: string;
  templateParams: Record<string, string>;
  outId?: string;
}): Promise<void> {
  const accessKeyId = process.env.SMS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.SMS_ACCESS_KEY_SECRET;
  const signName = process.env.SMS_SIGN_NAME;

  if (!accessKeyId || !accessKeySecret || !signName) {
    throw new Error('短信服务未配置');
  }

  const params: Record<string, string> = {
    AccessKeyId: accessKeyId,
    Action: 'SendSms',
    Format: 'JSON',
    PhoneNumbers: payload.phoneNumber,
    RegionId: ALIYUN_SMS_REGION_ID,
    SignName: signName,
    SignatureMethod: 'HMAC-SHA1',
    SignatureNonce: randomUUID(),
    SignatureVersion: '1.0',
    Timestamp: toAliyunTimestamp(new Date()),
    Version: ALIYUN_SMS_VERSION,
    TemplateCode: payload.templateCode,
    TemplateParam: JSON.stringify(payload.templateParams),
  };

  if (payload.outId) {
    params.OutId = payload.outId;
  }

  const canonicalized = Object.keys(params)
    .sort()
    .map((key) => `${encodeRFC3986(key)}=${encodeRFC3986(params[key])}`)
    .join('&');
  const stringToSign = `GET&${encodeRFC3986('/')}&${encodeRFC3986(canonicalized)}`;
  const signature = createHmac('sha1', `${accessKeySecret}&`).update(stringToSign).digest('base64');
  const queryString = Object.entries({
    ...params,
    Signature: signature,
  })
    .map(([key, value]) => `${encodeRFC3986(key)}=${encodeRFC3986(value)}`)
    .join('&');

  const response = await fetch(`${ALIYUN_SMS_ENDPOINT}?${queryString}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`短信发送失败: ${errorText}`);
  }

  const result = (await response.json()) as {
    Code?: string;
    Message?: string;
    BizId?: string;
  };

  if (result.Code !== 'OK') {
    throw new Error(`短信发送失败: ${result.Message || result.Code || 'unknown_error'}`);
  }
}

export async function sendPhoneVerificationSms(payload: {
  phoneNumber: string;
  code: string;
  purpose: PhoneVerificationSmsPurpose;
  expiresAt?: string;
}): Promise<void> {
  const provider = getSmsProvider();
  if (provider !== 'aliyun') {
    throw new Error(`不支持的短信服务商: ${provider}`);
  }

  const templateCode = resolvePhoneVerificationTemplateCode(payload.purpose);
  if (!templateCode) {
    throw new Error('短信服务未配置');
  }

  const ttlMinutes = payload.expiresAt
    ? Math.max(1, Math.ceil((new Date(payload.expiresAt).getTime() - Date.now()) / (60 * 1000)))
    : 10;

  await sendAliyunSms({
    phoneNumber: payload.phoneNumber,
    templateCode,
    templateParams: {
      code: payload.code,
      ttl: String(ttlMinutes),
      scene: getPurposeLabel(payload.purpose),
    },
    outId: `${payload.purpose}:${payload.phoneNumber}:${Date.now()}`,
  });
}
