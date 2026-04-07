'use client';

export async function logoutUser() {
  const response = await fetch('/api/account/logout', {
    method: 'POST',
    cache: 'no-store',
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    throw new Error(result?.error || 'Logout failed');
  }
}
