import { NextRequest, NextResponse } from 'next/server';

// 共享存储引用（实际应用中应使用数据库）
const apiKeys: Map<string, any> = new Map();

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  
  if (apiKeys.has(id)) {
    apiKeys.delete(id);
    return NextResponse.json({ success: true });
  }
  
  return NextResponse.json({ error: '未找到' }, { status: 404 });
}
