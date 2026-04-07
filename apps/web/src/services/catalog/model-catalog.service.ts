import { Model } from '@ai-gateway/shared-types';
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

function buildFallbackCatalog(limit: number, category?: string | null): Model[] {
  const filtered = category
    ? OFFICIAL_MODEL_CATALOG.filter((model) => model.category === category)
    : OFFICIAL_MODEL_CATALOG;

  return filtered.slice(0, limit);
}

export async function listModelCatalog(options: ListModelsOptions = {}): Promise<Model[]> {
  const { limit = 100, category } = options;

  const sharedById = new Map(OFFICIAL_MODEL_CATALOG.map((model) => [model.id, model]));
  const sharedByName = new Map(OFFICIAL_MODEL_CATALOG.map((model) => [model.model_name, model]));

  let result: Model[];

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
        id: sharedModel?.id || openRouterModel.id,
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
      } satisfies Model;
    });
  } catch (error) {
    console.warn('Failed to load OpenRouter models, falling back to local catalog:', error);
    result = buildFallbackCatalog(limit, category);
  }

  if (category) {
    result = result.filter((model) => model.category === category);
  }

  return result
    .filter((model) => Boolean(model.model_name))
    .sort((a, b) => a.model_name.localeCompare(b.model_name))
    .slice(0, limit);
}
