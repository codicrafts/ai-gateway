import type { Model } from '@ai-gateway/shared-types';
import { getAllChannels, getAllModelsMeta, type OneApiChannel, type OneApiModelMeta } from '@/lib/oneapi';

export type ModelBenchmarkMetric = {
  key: 'reasoning' | 'coding' | 'context' | 'multimodal';
  score: number;
};

export type ModelRuntimeChannelSnapshot = {
  id: number;
  name: string;
  group: string;
  status: 'online' | 'degraded' | 'offline';
  response_time_ms: number | null;
  last_test_at: number | null;
};

export type ModelRuntimeHealth = {
  status: 'online' | 'degraded' | 'offline' | 'unknown';
  online_channels: number;
  degraded_channels: number;
  offline_channels: number;
  total_channels: number;
  checked_at: number | null;
};

export type ModelLatencySnapshot = {
  best_ms: number | null;
  median_ms: number | null;
  p95_ms: number | null;
  worst_ms: number | null;
  sample_size: number;
};

export type ModelDetailInsights = {
  benchmark: {
    source: 'reference';
    metrics: ModelBenchmarkMetric[];
  };
  runtime: {
    health: ModelRuntimeHealth;
    latency: ModelLatencySnapshot;
    channels: ModelRuntimeChannelSnapshot[];
  };
};

function parseCsvLikeList(value?: string | null): string[] {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function includesKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function inferBenchmarkMetrics(model: Model): ModelBenchmarkMetric[] {
  const haystack = [
    model.id,
    model.model_name,
    model.provider,
    model.category,
    ...(model.capabilities_en || []),
    ...(model.capabilities_zh || []),
    ...(model.supported_endpoint_types || []),
  ]
    .join(' ')
    .toLowerCase();
  const contextLength = Number(model.context_length || 0);
  const hasLongContext = contextLength >= 128_000;
  const hasMultimodal =
    model.category === 'image' ||
    model.category === 'audio' ||
    model.category === 'video' ||
    includesKeyword(haystack, ['image', 'vision', 'audio', 'speech', 'video', 'multimodal', 'gemini']);

  let reasoning = model.category === 'text' ? 70 : 40;
  if (includesKeyword(haystack, ['reasoner', 'reasoning', 'r1', 'o1', 'o3', 'thinking', 'opus', 'sonnet', 'gpt-5', 'gpt-4.1', 'gemini-2.5-pro'])) {
    reasoning += 18;
  }
  if (includesKeyword(haystack, ['mini', 'flash', 'haiku', 'nano'])) {
    reasoning -= 8;
  }

  let coding = model.category === 'text' ? 62 : 18;
  if (includesKeyword(haystack, ['code', 'coder', 'dev', 'deepseek', 'claude', 'gpt', 'qwen'])) {
    coding += 18;
  }
  if (includesKeyword(haystack, ['reasoner'])) {
    coding += 6;
  }

  let context = 38;
  if (contextLength >= 1_000_000) {
    context = 98;
  } else if (contextLength >= 256_000) {
    context = 90;
  } else if (contextLength >= 128_000) {
    context = 82;
  } else if (contextLength >= 64_000) {
    context = 70;
  } else if (contextLength >= 32_000) {
    context = 58;
  }
  if (hasLongContext) {
    context += 4;
  }

  let multimodal = hasMultimodal ? 78 : 22;
  if (includesKeyword(haystack, ['image-generation', 'audio-speech', 'audio-transcriptions', 'video'])) {
    multimodal += 10;
  }
  if (model.category === 'embedding') {
    multimodal = 12;
  }

  return [
    { key: 'reasoning', score: normalizeScore(reasoning) },
    { key: 'coding', score: normalizeScore(coding) },
    { key: 'context', score: normalizeScore(context) },
    { key: 'multimodal', score: normalizeScore(multimodal) },
  ];
}

function findMatchedChannels(model: Model, adminMeta: OneApiModelMeta | null, channels: OneApiChannel[]) {
  const boundChannelNames = new Set((adminMeta?.bound_channels || []).map((channel) => channel.name.trim()).filter(Boolean));
  const modelIds = new Set([model.id, model.model_name].map((item) => item.trim()).filter(Boolean));

  return channels.filter((channel) => {
    if (boundChannelNames.has(channel.name.trim())) {
      return true;
    }

    const channelModels = parseCsvLikeList(channel.models);
    return channelModels.some((channelModel) => modelIds.has(channelModel));
  });
}

function mapChannelStatus(status: number, responseTime: number | null): 'online' | 'degraded' | 'offline' {
  if (status === 1) {
    if (typeof responseTime === 'number' && responseTime > 5000) {
      return 'degraded';
    }
    return 'online';
  }
  if (status === 3) {
    return 'degraded';
  }
  return 'offline';
}

function percentile(sortedValues: number[], ratio: number): number | null {
  if (sortedValues.length === 0) {
    return null;
  }
  const index = Math.min(sortedValues.length - 1, Math.max(0, Math.floor((sortedValues.length - 1) * ratio)));
  return sortedValues[index];
}

function buildRuntimeInsights(channels: OneApiChannel[]): ModelDetailInsights['runtime'] {
  const snapshots: ModelRuntimeChannelSnapshot[] = channels.map((channel) => {
    const responseTime = Number.isFinite(channel.response_time) && channel.response_time > 0 ? channel.response_time : null;
    return {
      id: channel.id,
      name: channel.name,
      group: channel.group || '-',
      status: mapChannelStatus(channel.status, responseTime),
      response_time_ms: responseTime,
      last_test_at: channel.test_time || null,
    };
  });

  const onlineChannels = snapshots.filter((channel) => channel.status === 'online').length;
  const degradedChannels = snapshots.filter((channel) => channel.status === 'degraded').length;
  const offlineChannels = snapshots.filter((channel) => channel.status === 'offline').length;
  const responseTimes = snapshots
    .map((channel) => channel.response_time_ms)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    .sort((left, right) => left - right);
  const checkedAt = snapshots.reduce<number | null>((latest, channel) => {
    if (!channel.last_test_at) {
      return latest;
    }
    return latest === null ? channel.last_test_at : Math.max(latest, channel.last_test_at);
  }, null);

  const healthStatus: ModelRuntimeHealth['status'] =
    snapshots.length === 0
      ? 'unknown'
      : onlineChannels > 0 && degradedChannels === 0 && offlineChannels === 0
        ? 'online'
        : onlineChannels > 0 || degradedChannels > 0
          ? 'degraded'
          : 'offline';

  return {
    health: {
      status: healthStatus,
      online_channels: onlineChannels,
      degraded_channels: degradedChannels,
      offline_channels: offlineChannels,
      total_channels: snapshots.length,
      checked_at: checkedAt,
    },
    latency: {
      best_ms: responseTimes[0] ?? null,
      median_ms: percentile(responseTimes, 0.5),
      p95_ms: percentile(responseTimes, 0.95),
      worst_ms: responseTimes[responseTimes.length - 1] ?? null,
      sample_size: responseTimes.length,
    },
    channels: snapshots.sort((left, right) => {
      const statusRank = { online: 0, degraded: 1, offline: 2 };
      if (statusRank[left.status] !== statusRank[right.status]) {
        return statusRank[left.status] - statusRank[right.status];
      }
      return (left.response_time_ms ?? Number.MAX_SAFE_INTEGER) - (right.response_time_ms ?? Number.MAX_SAFE_INTEGER);
    }),
  };
}

export async function getModelDetailInsights(model: Model): Promise<ModelDetailInsights> {
  try {
    const [adminModelsResult, channelsResult] = await Promise.all([
      getAllModelsMeta(0, 300),
      getAllChannels(0, 200),
    ]);

    const adminMeta =
      adminModelsResult.data?.items?.find((item) => item.model_name === model.id || item.model_name === model.model_name) ||
      null;
    const channels = channelsResult.data?.items || [];
    const matchedChannels = findMatchedChannels(model, adminMeta, channels);

    return {
      benchmark: {
        source: 'reference',
        metrics: inferBenchmarkMetrics(model),
      },
      runtime: buildRuntimeInsights(matchedChannels),
    };
  } catch {
    return {
      benchmark: {
        source: 'reference',
        metrics: inferBenchmarkMetrics(model),
      },
      runtime: {
        health: {
          status: 'unknown',
          online_channels: 0,
          degraded_channels: 0,
          offline_channels: 0,
          total_channels: 0,
          checked_at: null,
        },
        latency: {
          best_ms: null,
          median_ms: null,
          p95_ms: null,
          worst_ms: null,
          sample_size: 0,
        },
        channels: [],
      },
    };
  }
}
