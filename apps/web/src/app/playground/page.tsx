import type { Metadata } from 'next';
import { buildPageMetadata } from '@/config/site';
import PlaygroundPageClient from '@/components/playground/PlaygroundPageClient';
import { listModelCatalog } from '@/services/catalog/model-catalog.service';
import { getAuthenticatedAppUser } from '@/services/account/session.service';
import { listGatewayConfiguredModels } from '@/services/gateway/gateway-model.service';
import { listGatewayApiKeys } from '@/services/gateway/gateway-token.service';
import type { GatewayApiKey } from '@/services/gateway/gateway-types';
import type { Model } from '@ai-gateway/shared-types';

export const metadata: Metadata = buildPageMetadata({
  title: 'Playground',
  description: 'Validate prompts, compare models, and copy proven call patterns before integrating into production.',
  path: '/playground',
});

export default async function PlaygroundPage() {
  const [catalogModels, appUser] = await Promise.all([
    listModelCatalog({ category: 'text', limit: 100 }),
    getAuthenticatedAppUser(),
  ]);

  let gatewayModels: Model[] = [];
  let teamApiKeys: GatewayApiKey[] = [];
  let teamId: string | null = null;

  if (appUser) {
    try {
      [gatewayModels, teamApiKeys] = await Promise.all([
        listGatewayConfiguredModels(500),
        listGatewayApiKeys({ userId: appUser.id, teamId: null }),
      ]);
    } catch {
      teamId = null;
      gatewayModels = [];
      teamApiKeys = [];
    }
  }

  return (
    <PlaygroundPageClient
      initialModels={catalogModels}
      gatewayModels={gatewayModels}
      teamApiKeys={teamApiKeys}
      teamId={teamId}
    />
  );
}
