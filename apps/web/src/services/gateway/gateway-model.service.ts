import type { Model } from '@ai-gateway/shared-types';
import { getOneApiStatus } from '@/lib/oneapi';
import {
  hasModelRuntimeBinding,
  isModelPlaygroundAvailable,
} from '@/services/catalog/model-availability';
import { listRuntimeModelCatalog } from '@/services/catalog/model-catalog.service';

export async function listGatewayConfiguredModels(limit: number = 500): Promise<Model[]> {
  return listRuntimeModelCatalog({ limit });
}

export async function listGatewayRunnableModels(limit: number = 500): Promise<Model[]> {
  const [configuredModels, oneApiStatus] = await Promise.all([
    listGatewayConfiguredModels(limit),
    getOneApiStatus().catch(() => null),
  ]);

  if (oneApiStatus?.data?.self_use_mode_enabled) {
    return configuredModels.filter(hasModelRuntimeBinding);
  }

  return configuredModels.filter(isModelPlaygroundAvailable);
}
