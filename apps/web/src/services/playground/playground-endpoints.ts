import type { Model } from '@ai-gateway/shared-types';

export type PlaygroundEndpointType =
  | 'openai'
  | 'anthropic'
  | 'openai-response'
  | 'gemini'
  | 'embeddings'
  | 'image-generation'
  | 'jina-rerank'
  | 'audio-speech'
  | 'audio-transcriptions'
  | 'audio-translations'
  | 'openai-video';

export type PlaygroundExecutionKind =
  | 'text'
  | 'embeddings'
  | 'images'
  | 'rerank'
  | 'audio-speech'
  | 'audio-upload'
  | 'video';

export type PlaygroundExecutionScope =
  | 'chat'
  | 'responses'
  | 'embeddings'
  | 'images'
  | 'audio'
  | 'rerank'
  | 'video';

type PlaygroundEndpointDefinition = {
  type: PlaygroundEndpointType;
  scope: PlaygroundExecutionScope;
  kind: PlaygroundExecutionKind;
};

const PLAYGROUND_ENDPOINTS: PlaygroundEndpointDefinition[] = [
  { type: 'openai', scope: 'chat', kind: 'text' },
  { type: 'anthropic', scope: 'chat', kind: 'text' },
  { type: 'openai-response', scope: 'responses', kind: 'text' },
  { type: 'gemini', scope: 'chat', kind: 'text' },
  { type: 'embeddings', scope: 'embeddings', kind: 'embeddings' },
  { type: 'image-generation', scope: 'images', kind: 'images' },
  { type: 'jina-rerank', scope: 'rerank', kind: 'rerank' },
  { type: 'audio-speech', scope: 'audio', kind: 'audio-speech' },
  { type: 'audio-transcriptions', scope: 'audio', kind: 'audio-upload' },
  { type: 'audio-translations', scope: 'audio', kind: 'audio-upload' },
  { type: 'openai-video', scope: 'video', kind: 'video' },
];

const SUPPORTED_ENDPOINT_TYPE_SET = new Set(
  PLAYGROUND_ENDPOINTS.map((endpoint) => endpoint.type),
);

export function isPlaygroundEndpointType(value: string): value is PlaygroundEndpointType {
  return SUPPORTED_ENDPOINT_TYPE_SET.has(value as PlaygroundEndpointType);
}

export function getPlaygroundEndpointScope(
  endpointType: PlaygroundEndpointType,
): PlaygroundExecutionScope {
  return (
    PLAYGROUND_ENDPOINTS.find((endpoint) => endpoint.type === endpointType)?.scope ||
    'chat'
  );
}

export function getPlaygroundEndpointKind(
  endpointType: PlaygroundEndpointType,
): PlaygroundExecutionKind {
  return (
    PLAYGROUND_ENDPOINTS.find((endpoint) => endpoint.type === endpointType)?.kind ||
    'text'
  );
}

export function normalizeModelEndpointTypes(model: Model | null): PlaygroundEndpointType[] {
  const raw: string[] = model?.supported_endpoint_types || [];
  const normalized = new Set<PlaygroundEndpointType>();

  for (const endpointType of raw) {
    if (endpointType === 'openai-response-compact') {
      normalized.add('openai-response');
      continue;
    }

    if (endpointType === 'audio' || endpointType === 'speech') {
      normalized.add('audio-speech');
      normalized.add('audio-transcriptions');
      normalized.add('audio-translations');
      continue;
    }

    if (endpointType === 'video') {
      normalized.add('openai-video');
      continue;
    }

    if (!isPlaygroundEndpointType(endpointType)) {
      continue;
    }

    normalized.add(endpointType);
  }

  if (normalized.size === 0) {
    if (model?.category === 'embedding') {
      normalized.add('embeddings');
    } else if (model?.category === 'image') {
      normalized.add('image-generation');
    } else if (model?.category === 'audio') {
      normalized.add('audio-speech');
      normalized.add('audio-transcriptions');
      normalized.add('audio-translations');
    } else if (model?.category === 'video') {
      normalized.add('openai-video');
    } else if (model?.provider === 'Anthropic') {
      normalized.add('anthropic');
    } else if (model?.provider === 'Google') {
      normalized.add('gemini');
    } else {
      normalized.add('openai');
    }
  }

  return Array.from(normalized);
}

export function supportsEndpoint(
  model: Model | null,
  endpointType: PlaygroundEndpointType,
) {
  return normalizeModelEndpointTypes(model).includes(endpointType);
}
