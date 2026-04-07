import type { Metadata } from 'next';
import { buildPageMetadata } from '@/config/site';
import PlaygroundPageClient from '@/components/playground/PlaygroundPageClient';
import { listModelCatalog } from '@/services/catalog/model-catalog.service';

export const metadata: Metadata = buildPageMetadata({
  title: 'Playground',
  description: 'Validate prompts, compare models, and copy proven call patterns before integrating into production.',
  path: '/playground',
});

export default async function PlaygroundPage() {
  const initialModels = await listModelCatalog({ category: 'text', limit: 100 });

  return <PlaygroundPageClient initialModels={initialModels} />;
}
