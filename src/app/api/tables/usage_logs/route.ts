import { NextRequest, NextResponse } from 'next/server';

// 模拟使用记录
const usageLogs: any[] = [];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get('search');
  const limit = parseInt(searchParams.get('limit') || '10');
  
  let result = usageLogs;
  
  if (search) {
    result = result.filter((l) => l.user_id === search);
  }
  
  return NextResponse.json({ data: result.slice(0, limit) });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    usageLogs.unshift(body);
    return NextResponse.json(body);
  } catch {
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}
