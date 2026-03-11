import { NextRequest, NextResponse } from 'next/server';

// 模拟用户数据存储（生产环境应使用数据库）
const users: Map<string, any> = new Map();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get('search');
  
  if (search) {
    // 按邮箱搜索
    const found = Array.from(users.values()).filter(
      (u) => u.email === search || u.email?.includes(search)
    );
    return NextResponse.json({ data: found });
  }
  
  return NextResponse.json({ data: Array.from(users.values()) });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 检查邮箱是否已存在
    const existing = Array.from(users.values()).find((u) => u.email === body.email);
    if (existing) {
      return NextResponse.json({ error: '邮箱已存在' }, { status: 400 });
    }
    
    // 保存用户
    users.set(body.id, body);
    
    return NextResponse.json(body);
  } catch (error) {
    return NextResponse.json({ error: '创建用户失败' }, { status: 500 });
  }
}
