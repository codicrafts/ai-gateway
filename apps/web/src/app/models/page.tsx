import type { Metadata } from 'next';
import { buildPageMetadata } from '@/config/site';
import ModelsPageClient from '@/components/models/ModelsPageClient';
import { listModelCatalog } from '@/services/catalog/model-catalog.service';

export const metadata: Metadata = buildPageMetadata({
  title: 'Model Catalog',
  description: 'Browse the full AI model catalog with provider, pricing, context window, and capability filters.',
  path: '/models',
});

export default async function ModelsPage() {
  const initialModels = await listModelCatalog({ limit: 100 });

  return <ModelsPageClient initialModels={initialModels} />;
}
