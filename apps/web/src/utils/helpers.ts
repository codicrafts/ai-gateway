export function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleString('zh-CN');
}

export function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) {
    return '$0.00';
  }

  const sign = amount < 0 ? '-' : '';
  const absolute = Math.abs(amount);
  const rounded = absolute.toFixed(2);

  if (parseFloat(rounded) === 0 && absolute > 0) {
    return `${sign}$0.01`;
  }

  return `${sign}$${rounded}`;
}

export function formatBillingLineAmount(amount: number, type: 'usage' | 'recharge'): string {
  if (!Number.isFinite(amount)) {
    return '$0.00';
  }

  const absolute = Math.abs(amount);
  if (absolute === 0) {
    return '$0.00';
  }

  const sign = type === 'recharge' ? '+' : '-';

  if (absolute < 0.01) {
    return `${sign}<$0.01`;
  }

  return `${sign}$${absolute.toFixed(2)}`;
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generateAPIKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'sk-';
  for (let i = 0; i < 48; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function normalizeMainlandPhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+86')) {
    return digits.slice(3);
  }
  if (digits.startsWith('86') && digits.length === 13) {
    return digits.slice(2);
  }
  return digits.replace(/[^\d]/g, '');
}

export function validateMainlandPhone(phone: string): boolean {
  const normalized = normalizeMainlandPhone(phone);
  return /^1\d{10}$/.test(normalized);
}

export function isPhoneIdentifier(value: string): boolean {
  return validateMainlandPhone(value);
}

export function validatePassword(password: string): boolean {
  return password.length >= 8;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
