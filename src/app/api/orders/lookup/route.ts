import { NextRequest, NextResponse } from 'next/server';
import { getOrdersByCustomerEmail } from '@/lib/db/service';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ success: false, error: 'Valid email required' }, { status: 400 });
    }

    const orders = getOrdersByCustomerEmail(email.trim());
    return NextResponse.json({ success: true, orders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
