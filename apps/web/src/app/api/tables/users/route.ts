import { NextRequest, NextResponse } from 'next/server';
import { createLocalUser, searchAppUsers } from '@/services/account/app-user.service';
import { ok } from '@/server/api/responses';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get('search') || undefined;

  const users = await searchAppUsers(search);
  return ok(users);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if ((!body.email && !body.phone) || !body.password || !body.username) {
      return NextResponse.json({ error: 'Missing required fields', code: 'MISSING_REQUIRED_FIELDS' }, { status: 400 });
    }

    const user = await createLocalUser({
      email: body.email,
      phone: body.phone,
      username: body.username,
      password: body.password,
      balance: body.balance,
    });

    return ok(user, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create user';
    const codeMap: Record<string, { error: string; code: string; status: number }> = {
      邮箱已存在: { error: 'Email already exists', code: 'EMAIL_ALREADY_EXISTS', status: 400 },
      手机号已存在: { error: 'Phone already exists', code: 'PHONE_ALREADY_EXISTS', status: 400 },
      请提供邮箱或手机号: { error: 'Email or phone is required', code: 'IDENTIFIER_REQUIRED', status: 400 },
    };
    const mapped = codeMap[message] ?? { error: 'Failed to create user', code: 'CREATE_USER_FAILED', status: 500 };
    return NextResponse.json(
      { error: mapped.error, code: mapped.code },
      { status: mapped.status }
    );
  }
}
