import { redirect } from 'next/navigation';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams?: { callbackUrl?: string | string[] };
}) {
  const callbackUrl = Array.isArray(searchParams?.callbackUrl)
    ? searchParams?.callbackUrl[0]
    : searchParams?.callbackUrl;

  redirect(callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/login');
}
