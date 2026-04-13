import type { Metadata } from 'next';
import { SITE_DESCRIPTION, SITE_TITLE, getAbsoluteUrl } from '@/config/site';
import HomePageClient from '@/components/home/HomePageClient';
import type { Model } from '@ai-gateway/shared-types';
import { listModelCatalog } from '@/services/catalog/model-catalog.service';
import { isModelPlaygroundAvailable } from '@/services/catalog/model-availability';

function hasMeaningfulDescription(model: Model) {
  const description = (model.description || '').trim();
  if (!description) {
    return false;
  }

  const comparable = description.toLowerCase();
  return comparable !== model.model_name.trim().toLowerCase() && comparable !== model.id.trim().toLowerCase();
}

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: getAbsoluteUrl('/'),
  },
};

export default async function HomePage() {
  const models = await listModelCatalog();
  const featuredModels = [...models.filter(isModelPlaygroundAvailable)]
    .sort((a, b) => {
      const aScore = hasMeaningfulDescription(a) ? 1 : 0;
      const bScore = hasMeaningfulDescription(b) ? 1 : 0;
      if (aScore !== bScore) {
        return bScore - aScore;
      }
      return a.model_name.localeCompare(b.model_name);
    })
    .slice(0, 6);

  return <HomePageClient initialModels={featuredModels} />;
}
