import type { Model } from '@ai-gateway/shared-types';
import {
  getAllModelsMeta,
  getPricingCatalog,
  type OneApiPricingModel,
  type OneApiPricingVendor,
} from '@/lib/oneapi';
import type { AdminModelMeta } from '@/services/admin/admin-types';
import { OFFICIAL_MODEL_CATALOG } from './official-model-catalog';

export type ListModelsOptions = {
  limit?: number;
  category?: string | null;
};

type OpenRouterArchitecture = {
  modality?: string;
  input_modalities?: string[];
  output_modalities?: string[];
};

type OpenRouterModel = {
  id: string;
  name?: string;
  description?: string;
  context_length?: number;
  architecture?: OpenRouterArchitecture;
  pricing?: {
    prompt?: string;
    completion?: string;
    image?: string;
    request?: string;
  };
  top_provider?: {
    context_length?: number;
  };
};

type OpenRouterResponse = {
  data?: OpenRouterModel[];
};

const OPENROUTER_MODELS_URL =
  process.env.OPENROUTER_MODELS_URL || 'https://openrouter.ai/api/v1/models';
const NAME_RULE_EXACT = 0;
const NAME_RULE_PREFIX = 1;
const NAME_RULE_CONTAINS = 2;
const NAME_RULE_SUFFIX = 3;

const PROVIDER_NAME_MAP: Record<string, string> = {
  anthropic: 'Anthropic',
  bytedance: 'ByteDance',
  cohere: 'Cohere',
  deepseek: 'DeepSeek',
  google: 'Google',
  meta: 'Meta',
  microsoft: 'Microsoft',
  mistralai: 'Mistral AI',
  mistral: 'Mistral AI',
  moonshotai: 'Moonshot AI',
  openai: 'OpenAI',
  openrouter: 'OpenRouter',
  perplexity: 'Perplexity',
  qwen: 'Qwen',
  xai: 'xAI',
};

function inferCategory(openRouterModel: OpenRouterModel, sharedModel?: Model): string {
  if (sharedModel?.category) return sharedModel.category;

  const modalities = [
    ...(openRouterModel.architecture?.input_modalities || []),
    ...(openRouterModel.architecture?.output_modalities || []),
    openRouterModel.architecture?.modality || '',
    openRouterModel.id,
  ]
    .join(' ')
    .toLowerCase();

  if (modalities.includes('embedding')) {
    return 'embedding';
  }
  if (modalities.includes('image')) {
    return 'image';
  }
  if (modalities.includes('audio') || modalities.includes('speech')) {
    return 'audio';
  }
  if (modalities.includes('video')) {
    return 'video';
  }

  return 'text';
}

function inferProvider(openRouterModel: OpenRouterModel, sharedModel?: Model): string {
  if (sharedModel?.provider) return sharedModel.provider;

  const providerKey = openRouterModel.id.split('/')[0]?.trim().toLowerCase();
  return PROVIDER_NAME_MAP[providerKey] || providerKey || 'Unknown';
}

function parsePrice(value?: string) {
  const parsed = Number(value || '0');
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return parsed * 1_000_000;
}

function buildSourceUrl(modelId: string) {
  return `https://openrouter.ai/${modelId}`;
}

function inferFallbackSupportedEndpointTypes(
  category: string,
  provider: string,
): string[] {
  if (category === 'embedding') {
    return ['embeddings'];
  }
  if (category === 'image') {
    return ['image-generation'];
  }
  if (category === 'audio') {
    return ['audio-speech', 'audio-transcriptions', 'audio-translations'];
  }
  if (category === 'video') {
    return ['openai-video'];
  }
  if (provider === 'Anthropic') {
    return ['anthropic'];
  }
  if (provider === 'Google') {
    return ['gemini'];
  }
  return ['openai'];
}

function parseCapabilityTags(tags?: string) {
  if (!tags) {
    return [];
  }

  return Array.from(
    new Set(
      tags
        .split(/[，,|/]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
}

function inferRuntimeCategory(
  pricingModel: OneApiPricingModel,
  adminMeta?: AdminModelMeta,
  sharedModel?: Model,
) {
  if (sharedModel?.category) {
    return sharedModel.category;
  }

  const endpointSignals = [
    ...(pricingModel.supported_endpoint_types || []),
    adminMeta?.endpoints || '',
    pricingModel.model_name,
  ]
    .join(' ')
    .toLowerCase();

  if (endpointSignals.includes('embedding') || endpointSignals.includes('rerank')) {
    return 'embedding';
  }
  if (endpointSignals.includes('image')) {
    return 'image';
  }
  if (endpointSignals.includes('audio') || endpointSignals.includes('speech')) {
    return 'audio';
  }
  if (endpointSignals.includes('video')) {
    return 'video';
  }

  return 'text';
}

function resolveRuntimeProvider(
  pricingModel: OneApiPricingModel,
  vendorsById: Map<number, OneApiPricingVendor>,
  adminMeta?: AdminModelMeta,
  sharedModel?: Model,
) {
  if (sharedModel?.provider) {
    return sharedModel.provider;
  }

  const vendorId = pricingModel.vendor_id ?? adminMeta?.vendor_id;
  if (vendorId && vendorsById.has(vendorId)) {
    return vendorsById.get(vendorId)?.name || 'new-api';
  }

  return adminMeta?.bound_channels?.[0]?.name || pricingModel.owner_by || 'new-api';
}

function resolveInputPrice(
  pricingModel: OneApiPricingModel,
  category: string,
  sharedModel?: Model,
) {
  if (sharedModel?.input_price && sharedModel.input_price > 0) {
    return sharedModel.input_price;
  }

  if (
    pricingModel.quota_type === 0 &&
    Number.isFinite(pricingModel.model_ratio) &&
    (pricingModel.model_ratio || 0) > 0
  ) {
    return (pricingModel.model_ratio || 0) * 1000;
  }

  if (
    category !== 'text' &&
    category !== 'embedding' &&
    Number.isFinite(pricingModel.model_price)
  ) {
    return pricingModel.model_price || 0;
  }

  return sharedModel?.input_price ?? 0;
}

function resolveOutputPrice(
  pricingModel: OneApiPricingModel,
  category: string,
  sharedModel?: Model,
) {
  if (sharedModel?.output_price && sharedModel.output_price > 0) {
    return sharedModel.output_price;
  }

  if (category === 'embedding' || category === 'image' || category === 'video') {
    return sharedModel?.output_price ?? 0;
  }

  if (
    pricingModel.quota_type === 0 &&
    Number.isFinite(pricingModel.model_ratio) &&
    (pricingModel.model_ratio || 0) > 0
  ) {
    const completionRatio =
      Number.isFinite(pricingModel.completion_ratio) &&
      (pricingModel.completion_ratio || 0) > 0
        ? pricingModel.completion_ratio || 0
        : 1;
    return (pricingModel.model_ratio || 0) * completionRatio * 1000;
  }

  return sharedModel?.output_price ?? 0;
}

function isRuntimePricingConfigured(pricingModel: OneApiPricingModel) {
  if (pricingModel.quota_type === 0) {
    return Number.isFinite(pricingModel.model_ratio) && (pricingModel.model_ratio || 0) > 0;
  }

  if (pricingModel.quota_type === 1) {
    return Number.isFinite(pricingModel.model_price) && (pricingModel.model_price || 0) > 0;
  }

  return false;
}

function matchAdminMetaForRuntimeModel(
  modelName: string,
  metas: AdminModelMeta[],
) {
  const exact = metas.find(
    (meta) => meta.name_rule === NAME_RULE_EXACT && meta.model_name === modelName,
  );
  if (exact) {
    return exact;
  }

  const prefix = metas.find(
    (meta) =>
      meta.name_rule === NAME_RULE_PREFIX &&
      meta.model_name &&
      modelName.startsWith(meta.model_name),
  );
  if (prefix) {
    return prefix;
  }

  const suffix = metas.find(
    (meta) =>
      meta.name_rule === NAME_RULE_SUFFIX &&
      meta.model_name &&
      modelName.endsWith(meta.model_name),
  );
  if (suffix) {
    return suffix;
  }

  return (
    metas.find(
      (meta) =>
        meta.name_rule === NAME_RULE_CONTAINS &&
        meta.model_name &&
        modelName.includes(meta.model_name),
    ) || null
  );
}

function buildOfficialCatalogLookups() {
  const sharedById = new Map(OFFICIAL_MODEL_CATALOG.map((model) => [model.id, model]));
  const sharedByName = new Map(
    OFFICIAL_MODEL_CATALOG.map((model) => [model.model_name, model]),
  );

  return { sharedById, sharedByName };
}

function findOfficialCatalogModel(
  modelName: string,
  adminMeta: AdminModelMeta | null,
  sharedById: Map<string, Model>,
  sharedByName: Map<string, Model>,
) {
  return (
    sharedById.get(modelName) ||
    sharedByName.get(modelName) ||
    (adminMeta
      ? sharedById.get(adminMeta.model_name) || sharedByName.get(adminMeta.model_name)
      : null) ||
    null
  );
}

function mapRuntimePricingModelToSharedModel(
  pricingModel: OneApiPricingModel,
  vendorsById: Map<number, OneApiPricingVendor>,
  adminMetas: AdminModelMeta[],
  sharedById: Map<string, Model>,
  sharedByName: Map<string, Model>,
) {
  const modelName = pricingModel.model_name?.trim();
  if (!modelName) {
    return null;
  }

  const adminMeta = matchAdminMetaForRuntimeModel(modelName, adminMetas);
  const sharedModel = findOfficialCatalogModel(
    modelName,
    adminMeta,
    sharedById,
    sharedByName,
  );
  const category = inferRuntimeCategory(pricingModel, adminMeta || undefined, sharedModel || undefined);
  const parsedTags = parseCapabilityTags(pricingModel.tags || adminMeta?.tags);
  const description =
    adminMeta?.description ||
    pricingModel.description ||
    sharedModel?.description ||
    modelName;

  return {
    id: modelName,
    model_name: modelName,
    provider: resolveRuntimeProvider(
      pricingModel,
      vendorsById,
      adminMeta || undefined,
      sharedModel || undefined,
    ),
    category,
    description,
    description_zh: sharedModel?.description_zh || description,
    description_en:
      sharedModel?.description_en ||
      pricingModel.description ||
      adminMeta?.description ||
      description,
    input_price: resolveInputPrice(pricingModel, category, sharedModel || undefined),
    output_price: resolveOutputPrice(pricingModel, category, sharedModel || undefined),
    context_length: sharedModel?.context_length ?? 0,
    capabilities_zh: sharedModel?.capabilities_zh || parsedTags,
    capabilities_en: sharedModel?.capabilities_en || parsedTags,
    source_url: sharedModel?.source_url,
    supported_endpoint_types:
      pricingModel.supported_endpoint_types?.length
        ? pricingModel.supported_endpoint_types
        : inferFallbackSupportedEndpointTypes(
            category,
            resolveRuntimeProvider(
              pricingModel,
              vendorsById,
              adminMeta || undefined,
              sharedModel || undefined,
            ),
          ),
    bound_channel_types: Array.from(
      new Set(
        (adminMeta?.bound_channels || [])
          .map((channel) => channel.type)
          .filter((channelType) => Number.isFinite(channelType)),
      ),
    ),
    runtime_pricing_configured: isRuntimePricingConfigured(pricingModel),
  } satisfies Model;
}

function applyCatalogFilters(
  models: Model[],
  { limit, category }: ListModelsOptions,
) {
  let result = models;

  if (category) {
    result = result.filter((model) => model.category === category);
  }

  const filtered = result
    .filter((model) => Boolean(model.model_name))
    .sort((a, b) => a.model_name.localeCompare(b.model_name));

  if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
    return filtered.slice(0, limit);
  }

  return filtered;
}

export async function listRuntimeModelCatalog(
  options: ListModelsOptions = {},
): Promise<Model[]> {
  const { sharedById, sharedByName } = buildOfficialCatalogLookups();

  const [pricingCatalog, modelsMetaResult] = await Promise.all([
    getPricingCatalog(),
    getAllModelsMeta(0, 500),
  ]);

  const pricingModels = Array.isArray(pricingCatalog.data) ? pricingCatalog.data : [];
  if (pricingModels.length === 0) {
    return [];
  }

  const adminMetas =
    modelsMetaResult.success && Array.isArray(modelsMetaResult.data?.items)
      ? modelsMetaResult.data.items.filter((item) => item.status === 1)
      : [];

  const vendorsById = new Map(
    (pricingCatalog.vendors || []).map((vendor) => [vendor.id, vendor]),
  );

  const mapped = pricingModels.reduce<Model[]>((result, pricingModel) => {
    const mappedModel = mapRuntimePricingModelToSharedModel(
      pricingModel,
      vendorsById,
      adminMetas,
      sharedById,
      sharedByName,
    );

    if (mappedModel) {
      result.push(mappedModel);
    }

    return result;
  }, []);

  return applyCatalogFilters(mapped, options);
}

async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (process.env.OPENROUTER_API_KEY) {
    headers.Authorization = `Bearer ${process.env.OPENROUTER_API_KEY}`;
  }
  if (process.env.OPENROUTER_SITE_URL) {
    headers['HTTP-Referer'] = process.env.OPENROUTER_SITE_URL;
  }
  if (process.env.OPENROUTER_SITE_NAME) {
    headers['X-Title'] = process.env.OPENROUTER_SITE_NAME;
  }

  const response = await fetch(OPENROUTER_MODELS_URL, {
    headers,
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`OpenRouter models request failed with ${response.status}`);
  }

  const result = (await response.json()) as OpenRouterResponse;
  return Array.isArray(result.data) ? result.data : [];
}

function buildFallbackCatalog(limit?: number, category?: string | null): Model[] {
  const filtered = category
    ? OFFICIAL_MODEL_CATALOG.filter((model) => model.category === category)
    : OFFICIAL_MODEL_CATALOG;

  if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
    return filtered.slice(0, limit);
  }

  return filtered;
}

export async function listModelCatalog(options: ListModelsOptions = {}): Promise<Model[]> {
  let result: Model[];

  try {
    result = await listRuntimeModelCatalog(options);

    if (result.length > 0) {
      return result;
    }
  } catch (error) {
    console.warn('Failed to load runtime-enabled model catalog, falling back:', error);
  }

  const { limit, category } = options;
  const { sharedById, sharedByName } = buildOfficialCatalogLookups();

  try {
    const openRouterModels = await fetchOpenRouterModels();

    result = openRouterModels.map((openRouterModel) => {
      const sharedModel =
        sharedById.get(openRouterModel.id) ||
        sharedByName.get(openRouterModel.id) ||
        sharedByName.get(openRouterModel.name || '');

      const modelName = openRouterModel.id;
      const description = sharedModel?.description || openRouterModel.description || modelName;

      return {
        id: openRouterModel.id,
        model_name: modelName,
        provider: inferProvider(openRouterModel, sharedModel),
        category: inferCategory(openRouterModel, sharedModel),
        description,
        description_zh: sharedModel?.description_zh || description,
        description_en: sharedModel?.description_en || description,
        input_price: sharedModel?.input_price ?? parsePrice(openRouterModel.pricing?.prompt),
        output_price:
          sharedModel?.output_price ?? parsePrice(openRouterModel.pricing?.completion),
        context_length:
          sharedModel?.context_length ??
          openRouterModel.context_length ??
          openRouterModel.top_provider?.context_length ??
          0,
        capabilities_zh: sharedModel?.capabilities_zh || [],
        capabilities_en: sharedModel?.capabilities_en || [],
        source_url: sharedModel?.source_url || buildSourceUrl(openRouterModel.id),
        supported_endpoint_types:
          sharedModel?.supported_endpoint_types ||
          inferFallbackSupportedEndpointTypes(
            inferCategory(openRouterModel, sharedModel),
            inferProvider(openRouterModel, sharedModel),
          ),
      } satisfies Model;
    });
  } catch (error) {
    console.warn('Failed to load OpenRouter models, falling back to local catalog:', error);
    result = buildFallbackCatalog(limit, category);
  }

  return applyCatalogFilters(result, options);
}
