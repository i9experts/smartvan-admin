import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch('http://72.61.119.165:3002/Admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ message: data.message ?? 'Login failed', error: 'Unauthorized', statusCode: 401 }, { status: 401 });
    }
    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ message: 'Server error', error: e.message }, { status: 500 });
  }
}
