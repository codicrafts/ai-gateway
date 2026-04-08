import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/config/site';
import DocsPageClient from '@/components/docs/DocsPageClient';
import { getDocsReference, type DocsReference } from '@/services/docs/docs-reference.service';
import { getAuthAudienceFromHeaders } from '@/lib/auth-region';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildPageMetadata({
  title: 'Documentation',
  description: 'OpenAI-compatible API documentation, model matrix, endpoint references, and usage guidance.',
  path: '/docs',
});

export default async function DocsPage() {
  const authAudience = getAuthAudienceFromHeaders(headers());
  let reference: DocsReference | null = null;
  let referenceError = '';

  try {
    reference = await getDocsReference(undefined, authAudience);
  } catch (error) {
    referenceError = error instanceof Error ? error.message : '获取动态文档失败';
  }

  return (
    <DocsPageClient
      initialReference={reference}
      initialReferenceError={referenceError}
    />
  );
}
