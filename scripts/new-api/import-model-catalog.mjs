import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const catalogPath = path.resolve(__dirname, '../../packages/model-catalog/catalog.json');
const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'));
const vendorSeeds = catalog.vendors;
const modelSeeds = catalog.models;

const baseUrl = process.env.NEW_API_BASE_URL || 'http://localhost:3001';
const accessToken = process.env.NEW_API_ACCESS_TOKEN;
const userId = process.env.NEW_API_USER_ID || '1';

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

async function ensureVendors() {
  const existing = normalizeListResult(await api('/api/vendors/?page_size=1000'));
  const vendorByName = new Map(existing.map((vendor) => [vendor.name, vendor]));

  for (const vendor of vendorSeeds) {
    if (vendorByName.has(vendor.name)) continue;
    await api('/api/vendors/', {
      method: 'POST',
      body: JSON.stringify({
        name: vendor.name,
        description: vendor.description,
        icon: vendor.icon,
        status: 1,
      }),
    });
  }

  const refreshed = normalizeListResult(await api('/api/vendors/?page_size=1000'));
  return new Map(refreshed.map((vendor) => [vendor.name, vendor]));
}

async function upsertModels(vendorByName) {
  const existing = normalizeListResult(await api('/api/models/?page_size=1000'));
  const modelByName = new Map(existing.map((model) => [model.model_name, model]));

  let created = 0;
  let updated = 0;

  for (const model of modelSeeds) {
    const vendor = vendorByName.get(model.vendor_name);
    if (!vendor) {
      throw new Error(`Vendor not found after sync: ${model.vendor_name}`);
    }

    const payload = {
      model_name: model.model_name,
      description: model.description,
      tags: (model.capabilities_zh || []).join(','),
      vendor_id: vendor.id,
      endpoints: JSON.stringify(model.endpoints || {}),
      status: 1,
      sync_official: 0,
      name_rule: 0,
    };

    const existingModel = modelByName.get(model.model_name);
    if (existingModel) {
      await api('/api/models/', {
        method: 'PUT',
        body: JSON.stringify({
          id: existingModel.id,
          ...payload,
        }),
      });
      updated += 1;
    } else {
      await api('/api/models/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      created += 1;
    }
  }

  return { created, updated, total: modelSeeds.length };
}

async function main() {
  console.log(`Syncing vendors/models into ${baseUrl}`);
  const vendorByName = await ensureVendors();
  const result = await upsertModels(vendorByName);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
