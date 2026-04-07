import type { Metadata } from 'next';
import ContactPageClient from '@/components/contact/ContactPageClient';
import { buildPageMetadata } from '@/config/site';

export const metadata: Metadata = buildPageMetadata({
  title: 'Contact Sales and Delivery | MeshRouter',
  description:
    'Reach the MeshRouter team for procurement, integration validation, enterprise onboarding, and delivery support.',
  path: '/contact',
});

export default function ContactPage() {
  return <ContactPageClient />;
}
