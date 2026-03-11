import { NextRequest, NextResponse } from 'next/server';

// 模拟 API 密钥存储
const apiKeys: Map<string, any> = new Map();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get('search');
  
  let result = Array.from(apiKeys.values());
  
  if (search) {
    result = result.filter((k) => k.user_id === search);
  }
  
  return NextResponse.json({ data: result });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    apiKeys.set(body.id, body);
    return NextResponse.json(body);
  } catch {
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}
