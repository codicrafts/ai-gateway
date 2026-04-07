import { NextRequest } from 'next/server';
import { getDocsReference } from '@/services/docs/docs-reference.service';
import { fail, ok } from '@/server/api/responses';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const reference = await getDocsReference(request.nextUrl.origin);
    return ok(reference);
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取动态文档失败';
    return fail(message, 500);
  }
}
