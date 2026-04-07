import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/config/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const routes = ['/', '/models', '/pricing', '/docs', '/playground', '/contact', '/login'];

  return routes.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: path === '/' ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : path === '/models' || path === '/docs' ? 0.9 : 0.7,
  }));
}
