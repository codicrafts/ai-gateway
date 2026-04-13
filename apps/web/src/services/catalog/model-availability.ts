import type { Model } from '@ai-gateway/shared-types';

export function hasModelRuntimeBinding(model: Model): boolean {
  return Array.isArray(model.bound_channel_types) && model.bound_channel_types.length > 0;
}

export function isModelPlaygroundAvailable(model: Model): boolean {
  return hasModelRuntimeBinding(model) && model.runtime_pricing_configured === true;
}
