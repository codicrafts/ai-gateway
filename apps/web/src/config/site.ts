import type { Metadata } from 'next';

export const SITE_NAME = 'MeshRouter';
export const SITE_TITLE = 'MeshRouter - Unified AI Model API Platform';
export const SITE_DESCRIPTION =
  'One API to access multiple AI models, with a unified product layer for model access, validation, pricing, and team-ready delivery.';

export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export function getAbsoluteUrl(path = '/'): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath}`;
}

export type SiteContactChannel = {
  icon: string;
  label: 'email' | 'phone' | 'address';
  value: string;
  href: string;
};

export type SiteContactMember = {
  name: string;
  avatar: string;
  email: string;
  roleKey: 'salesDirector' | 'techSupport' | 'customerSuccess';
  descriptionKey: 'salesDesc' | 'techSupportDesc' | 'customerSuccessDesc';
};

export const siteContactChannels: SiteContactChannel[] = [
  {
    icon: 'fa-envelope',
    label: 'email',
    value: process.env.CONTACT_EMAIL || 'contact@meshrouter.ai',
    href: `mailto:${process.env.CONTACT_EMAIL || 'contact@meshrouter.ai'}`,
  },
  {
    icon: 'fa-phone',
    label: 'phone',
    value: process.env.CONTACT_PHONE || '+86 400-888-2048',
    href: `tel:${(process.env.CONTACT_PHONE || '+86 400-888-2048').replace(/[^\d+]/g, '')}`,
  },
  {
    icon: 'fa-map-marker-alt',
    label: 'address',
    value: process.env.CONTACT_ADDRESS || 'Beijing, China',
    href: '#',
  },
];

export const siteContactTeamMembers: SiteContactMember[] = [
  {
    name: process.env.CONTACT_SALES_NAME || 'Mike Zhang',
    avatar: 'M',
    email: process.env.SALES_EMAIL || 'sales@meshrouter.ai',
    roleKey: 'salesDirector',
    descriptionKey: 'salesDesc',
  },
  {
    name: process.env.CONTACT_SUPPORT_NAME || 'Lisa Li',
    avatar: 'L',
    email: process.env.SUPPORT_EMAIL || 'support@meshrouter.ai',
    roleKey: 'techSupport',
    descriptionKey: 'techSupportDesc',
  },
  {
    name: process.env.CONTACT_SUCCESS_NAME || 'Fang Wang',
    avatar: 'F',
    email: process.env.SUCCESS_EMAIL || 'success@meshrouter.ai',
    roleKey: 'customerSuccess',
    descriptionKey: 'customerSuccessDesc',
  },
];

export function buildPageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = getAbsoluteUrl(path);

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}
