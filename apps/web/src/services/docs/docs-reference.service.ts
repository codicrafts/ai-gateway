import type { Model } from '@ai-gateway/shared-types';
import type { AuthAudience } from '@/lib/auth-region';
import {
  DOCS_ENDPOINT_LABELS,
  DOCS_RATE_LIMITS,
  DOCS_STATUS_CODES,
} from '@/config/docs-reference';
import { PRICING_RAILS, PRICING_RULES } from '@/config/pricing-reference';
import { listModelCatalog } from '@/services/catalog/model-catalog.service';
import {
  normalizeModelEndpointTypes,
  type PlaygroundEndpointType,
} from '@/services/playground/playground-endpoints';

export type DocsEndpointReference = {
  key: string;
  label: string;
  method: string;
  path: string;
  providerCount: number;
  modelCount: number;
};

export type DocsStatusCodeReference = {
  code: string;
  descriptionZh: string;
  descriptionEn: string;
};

export type DocsModelReference = {
  id: string;
  modelName: string;
  provider: string;
  category: string;
  contextLength: number;
  inputPrice: number;
  outputPrice: number;
  sourceUrl?: string;
};

export type DocsRateLimitReference = {
  key: string;
  labelZh: string;
  labelEn: string;
};

export type DocsPricingRuleReference = {
  key: string;
  titleZh: string;
  titleEn: string;
  bodyZh: string;
  bodyEn: string;
};

export type DocsBillingRailReference = {
  key: string;
  labelZh: string;
  labelEn: string;
  valueZh: string;
  valueEn: string;
};

export type DocsReference = {
  baseUrl: string;
  featuredModel: string;
  imageModel: string;
  supportedModelCount: number;
  providerCount: number;
  providers: string[];
  endpoints: DocsEndpointReference[];
  models: DocsModelReference[];
  statusCodes: DocsStatusCodeReference[];
  rateLimits: DocsRateLimitReference[];
  pricingRules: DocsPricingRuleReference[];
  billingRails: DocsBillingRailReference[];
};

const RUNTIME_ENDPOINT_REFERENCE: Record<
  PlaygroundEndpointType,
  { key: string; method: string; path: string }
> = {
  openai: {
    key: 'openai',
    method: 'POST',
    path: '/v1/chat/completions',
  },
  anthropic: {
    key: 'anthropic',
    method: 'POST',
    path: '/v1/messages',
  },
  'openai-response': {
    key: 'openai-response',
    method: 'POST',
    path: '/v1/responses',
  },
  gemini: {
    key: 'gemini',
    method: 'POST',
    path: '/v1beta/models/{model}:generateContent',
  },
  embeddings: {
    key: 'embeddings',
    method: 'POST',
    path: '/v1/embeddings',
  },
  'image-generation': {
    key: 'image-generation',
    method: 'POST',
    path: '/v1/images/generations',
  },
  'jina-rerank': {
    key: 'jina-rerank',
    method: 'POST',
    path: '/v1/rerank',
  },
  'audio-speech': {
    key: 'audio-speech',
    method: 'POST',
    path: '/v1/audio/speech',
  },
  'audio-transcriptions': {
    key: 'audio-transcriptions',
    method: 'POST',
    path: '/v1/audio/transcriptions',
  },
  'audio-translations': {
    key: 'audio-translations',
    method: 'POST',
    path: '/v1/audio/translations',
  },
  'openai-video': {
    key: 'openai-video',
    method: 'POST',
    path: '/v1/videos',
  },
};

function getEndpointLabel(path: string) {
  return DOCS_ENDPOINT_LABELS[path] || path.replace(/^\/v1\//, '').replace(/^\/v1beta\//, '');
}

function buildEndpointReference(models: Model[]) {
  const endpointMap = new Map<
    string,
    {
      key: string;
      label: string;
      method: string;
      path: string;
      providers: Set<string>;
      models: Set<string>;
    }
  >();

  for (const model of models) {
    const modelName = model.model_name || model.id;
    const endpointTypes = normalizeModelEndpointTypes(model);

    for (const endpointType of endpointTypes) {
      const endpoint = RUNTIME_ENDPOINT_REFERENCE[endpointType];
      if (!endpoint) continue;
      const lookup = `${endpoint.method}:${endpoint.path}`;
      const existing = endpointMap.get(lookup) || {
        key: endpoint.key,
        label: getEndpointLabel(endpoint.path),
        method: endpoint.method,
        path: endpoint.path,
        providers: new Set<string>(),
        models: new Set<string>(),
      };
      existing.providers.add(model.provider);
      existing.models.add(modelName);
      endpointMap.set(lookup, existing);
    }
  }

  return Array.from(endpointMap.values())
    .map((entry) => ({
      key: entry.key,
      label: entry.label,
      method: entry.method,
      path: entry.path,
      providerCount: entry.providers.size,
      modelCount: entry.models.size,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export async function getDocsReference(baseOrigin?: string, audience: AuthAudience = 'global'): Promise<DocsReference> {
  const models = await listModelCatalog({ limit: 500 });
  const providers = Array.from(new Set(models.map((model) => model.provider))).sort();
  const featuredTextModel = models.find((model) => model.category === 'text');
  const featuredImageModel = models.find((model) => model.category === 'image');
  const referenceModels = models
    .slice()
    .sort((a, b) => {
      if (a.provider !== b.provider) return a.provider.localeCompare(b.provider);
      return a.model_name.localeCompare(b.model_name);
    })
    .slice(0, 24)
    .map((model) => ({
      id: model.id,
      modelName: model.model_name,
      provider: model.provider,
      category: model.category,
      contextLength: model.context_length,
      inputPrice: model.input_price,
      outputPrice: model.output_price,
      sourceUrl: model.source_url,
    }));

  const runtimeBaseOrigin = (process.env.ONE_API_URL || '').replace(/\/$/, '');
  const baseUrl = `${(runtimeBaseOrigin || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || baseOrigin || 'http://localhost:3001').replace(/\/$/, '')}/v1`;

  return {
    baseUrl,
    featuredModel: featuredTextModel?.model_name || 'gpt-4.1',
    imageModel: featuredImageModel?.model_name || 'dall-e-3',
    supportedModelCount: models.length,
    providerCount: providers.length,
    providers,
    endpoints: buildEndpointReference(models).filter((endpoint) => endpoint.path !== '/v1/videos'),
    models: referenceModels,
    statusCodes: DOCS_STATUS_CODES,
    rateLimits: DOCS_RATE_LIMITS,
    pricingRules: PRICING_RULES.map((rule) => ({
      key: rule.key,
      titleZh: rule.title.zh,
      titleEn: rule.title.en,
      bodyZh: rule.body.zh,
      bodyEn: rule.body.en,
    })),
    billingRails: PRICING_RAILS
      .filter((rail) => (audience === 'domestic' ? rail.key === 'domestic' : rail.key === 'international'))
      .map((rail) => ({
      key: rail.key,
      labelZh: rail.label.zh,
      labelEn: rail.label.en,
      valueZh: rail.value.zh,
      valueEn: rail.value.en,
    })),
  };
}
