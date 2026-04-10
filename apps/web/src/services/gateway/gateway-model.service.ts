import type { Model } from '@ai-gateway/shared-types';
import { listRuntimeModelCatalog } from '@/services/catalog/model-catalog.service';

export async function listGatewayConfiguredModels(limit: number = 500): Promise<Model[]> {
  return listRuntimeModelCatalog({ limit });
}
