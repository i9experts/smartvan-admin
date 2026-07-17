import { NextRequest, NextResponse } from 'next/server';

// Server-side env var — falls back to NEXT_PUBLIC_API_URL if a non-public
// API_URL isn't separately set, then to the old VPS IP only as a last resort
// so nothing breaks if an env var is missing during the Railway cutover.
const BACKEND_URL =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://72.61.119.165:3002';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND_URL}/Admin/login`, {
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
