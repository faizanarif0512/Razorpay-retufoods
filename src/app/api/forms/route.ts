import { NextRequest, NextResponse } from 'next/server';

// Saves the Wait List and Where Are You forms to Supabase. The service role key stays on the server;
// the tables have row level security with no public access.
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Simple per-instance throttle: 5 submissions per IP every 10 minutes
const hits = new Map<string, number[]>();
function throttled(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function POST(req: NextRequest) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ success: false, error: 'Form storage is not configured.' }, { status: 500 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
  if (throttled(ip)) {
    return NextResponse.json({ success: false, error: 'Too many submissions. Please try again later.' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request.' }, { status: 400 });
  }

  // Hidden honeypot field: bots fill it, people don't
  if (clean(body.website, 100)) return NextResponse.json({ success: true });

  const name = clean(body.name, 120);
  const email = clean(body.email, 200).toLowerCase();
  const phone = clean(body.phone, 30);
  if (!name || !EMAIL.test(email)) {
    return NextResponse.json({ success: false, error: 'Please enter your name and a valid email.' }, { status: 400 });
  }

  let table: string;
  let row: Record<string, string | null>;
  if (body.form === 'waitlist') {
    const address = clean(body.address, 1000);
    if (phone.length < 6 || !address) {
      return NextResponse.json({ success: false, error: 'Please enter your phone number and address.' }, { status: 400 });
    }
    table = 'waitlist_signups';
    row = { name, email, phone, address };
  } else if (body.form === 'location') {
    const pin = clean(body.pin, 6);
    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json({ success: false, error: 'Please enter a valid 6-digit PIN code.' }, { status: 400 });
    }
    table = 'location_requests';
    row = { name, email, phone: phone || null, pin_code: pin, comments: clean(body.comments, 2000) || null };
  } else {
    return NextResponse.json({ success: false, error: 'Unknown form.' }, { status: 400 });
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  });

  if (res.status === 409 && table === 'waitlist_signups') {
    return NextResponse.json({ success: true, message: 'You’re already on the list — we’ll be in touch at launch.' });
  }
  if (!res.ok) {
    console.error('[FORM SAVE ERROR]', table, res.status, await res.text());
    return NextResponse.json({ success: false, error: 'Could not save your details. Please try again.' }, { status: 502 });
  }
  return NextResponse.json({ success: true });
}
