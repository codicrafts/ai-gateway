#!/usr/bin/env node

import process from 'node:process';

const APP_URL =
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:3000';

const PROCESSOR_SECRET = process.env.RUNTIME_SYNC_PROCESSOR_SECRET || '';
const LIMIT = Number(process.env.RUNTIME_SYNC_PROCESSOR_LIMIT || '10');
const ENTITY_TYPE = process.env.RUNTIME_SYNC_ENTITY_TYPE || 'usage_pull';

async function main() {
  const url = new URL('/api/runtime-sync/jobs/process', APP_URL);
  const headers = {
    'Content-Type': 'application/json',
  };

  if (PROCESSOR_SECRET) {
    headers.Authorization = `Bearer ${PROCESSOR_SECRET}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      entity_type: ENTITY_TYPE,
      limit: Number.isFinite(LIMIT) && LIMIT > 0 ? LIMIT : 10,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload?.success) {
    console.error('Runtime sync processor failed.');
    console.error(JSON.stringify(payload, null, 2));
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        appUrl: APP_URL,
        processed: payload?.data?.processed ?? 0,
        completed: payload?.data?.completed ?? 0,
        failed: payload?.data?.failed ?? 0,
        skipped: payload?.data?.skipped ?? 0,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
