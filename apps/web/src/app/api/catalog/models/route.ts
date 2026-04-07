import { NextRequest } from 'next/server';
import { listModelCatalog } from '@/services/catalog/model-catalog.service';
import { ok } from '@/server/api/responses';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '100', 10);
  const category = searchParams.get('category');

  const models = await listModelCatalog({
    limit: Number.isNaN(limit) ? 100 : limit,
    category,
  });

  return ok(models);
}
