import type { Metadata } from 'next';
import { buildPageMetadata } from '@/config/site';
import PlaygroundPageClient from '@/components/playground/PlaygroundPageClient';
import { getAuthenticatedAppUser } from '@/services/account/session.service';
import { listGatewayRunnableModels } from '@/services/gateway/gateway-model.service';
import { listGatewayApiKeys } from '@/services/gateway/gateway-token.service';
import type { GatewayApiKey } from '@/services/gateway/gateway-types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = buildPageMetadata({
  title: 'Playground',
  description: 'Validate prompts, compare models, and copy proven call patterns before integrating into production.',
  path: '/playground',
});

export default async function PlaygroundPage() {
  const [gatewayModels, appUser] = await Promise.all([
    listGatewayRunnableModels(500).catch(() => []),
    getAuthenticatedAppUser(),
  ]);

  let teamApiKeys: GatewayApiKey[] = [];
  let teamId: string | null = null;

  if (appUser) {
    try {
      teamApiKeys = await listGatewayApiKeys({ userId: appUser.id, teamId: null });
    } catch {
      teamId = null;
      teamApiKeys = [];
    }
  }

  return (
    <PlaygroundPageClient
      initialModels={gatewayModels}
      gatewayModels={gatewayModels}
      teamApiKeys={teamApiKeys}
      teamId={teamId}
    />
  );
}
