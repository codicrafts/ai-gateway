import type { Metadata } from 'next';
import { SITE_DESCRIPTION, SITE_TITLE, getAbsoluteUrl } from '@/config/site';
import HomePageClient from '@/components/home/HomePageClient';
import { listModelCatalog } from '@/services/catalog/model-catalog.service';

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: getAbsoluteUrl('/'),
  },
};

export default async function HomePage() {
  const models = await listModelCatalog({ limit: 6 });

  return <HomePageClient initialModels={models} />;
}
