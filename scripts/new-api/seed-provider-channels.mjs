import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const catalogPath = path.resolve(__dirname, '../../packages/model-catalog/catalog.json');
const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'));
const channelSeeds = catalog.channels;

const baseUrl = process.env.NEW_API_BASE_URL || 'http://localhost:3001';
const accessToken = process.env.NEW_API_ACCESS_TOKEN;
const userId = process.env.NEW_API_USER_ID || '1';
const upsert = process.env.NEW_API_CHANNEL_UPSERT === '1';

if (!accessToken) {
  console.error('Missing NEW_API_ACCESS_TOKEN');
  process.exit(1);
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    'New-Api-User': String(userId),
  };
}

async function api(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...getHeaders(),
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${path}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || `API failed for ${path}`);
  }
  return data.data;
}

function normalizeListResult(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function buildChannelPayload(seed) {
  const key = process.env[seed.envKey];
  if (!key) return null;

  const baseUrlValue = process.env[seed.envBaseUrl];
  const payload = {
    type: seed.type,
    name: seed.name,
    key,
    models: seed.models.join(','),
    group: seed.group,
    status: 1,
    priority: 0,
    weight: 0,
    test_model: seed.testModel,
  };

  if (baseUrlValue) {
    payload.base_url = baseUrlValue;
  }

  return payload;
}

async function createOrUpdateChannels() {
  const existing = normalizeListResult(await api('/api/channel/?page_size=1000'));
  const existingByName = new Map(existing.map((channel) => [channel.name, channel]));

  const created = [];
  const updated = [];
  const skipped = [];

  for (const seed of channelSeeds) {
    const payload = buildChannelPayload(seed);
    if (!payload) {
      skipped.push({ provider: seed.provider, reason: `missing ${seed.envKey}` });
      continue;
    }

    const existingChannel = existingByName.get(seed.name);
    if (!existingChannel) {
      await api('/api/channel/', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'single',
          channel: payload,
        }),
      });
      created.push(seed.name);
      continue;
    }

    if (!upsert) {
      skipped.push({ provider: seed.provider, reason: `channel ${seed.name} already exists` });
      continue;
    }

    await api('/api/channel/', {
      method: 'PUT',
      body: JSON.stringify({
        id: existingChannel.id,
        ...payload,
      }),
    });
    updated.push(seed.name);
  }

  await api('/api/channel/fix', {
    method: 'POST',
    body: JSON.stringify({}),
  });

  return { created, updated, skipped };
}

async function main() {
  console.log(`Seeding provider channels into ${baseUrl}`);
  const result = await createOrUpdateChannels();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
