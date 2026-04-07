import { NextResponse } from 'next/server';

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init);
}

export function fail(error: string, status: number = 400, extra?: Record<string, unknown>) {
  return NextResponse.json(
    {
      success: false,
      error,
      ...extra,
    },
    { status }
  );
}
