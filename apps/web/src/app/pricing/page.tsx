import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/config/site';
import PricingPageClient from '@/components/pricing/PricingPageClient';
import { listModelCatalog } from '@/services/catalog/model-catalog.service';
import { getPricingReference } from '@/services/pricing/pricing-reference.service';
import { getAuthAudienceFromHeaders } from '@/lib/auth-region';

export const metadata: Metadata = buildPageMetadata({
  title: 'Pricing',
  description: 'Review reference pricing, model cost ranges, and enterprise buying paths for MeshRouter.',
  path: '/pricing',
});

export default async function PricingPage() {
  const authAudience = getAuthAudienceFromHeaders(headers());
  const pricingModels = await listModelCatalog({ limit: 12, category: 'text' });
  const pricingReference = getPricingReference(pricingModels, authAudience);

  return <PricingPageClient pricingModels={pricingModels} pricingReference={pricingReference} />;
}
