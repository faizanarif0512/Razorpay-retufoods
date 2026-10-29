import { NextRequest, NextResponse } from 'next/server';
import { getOrdersByCustomerEmail } from '@/lib/db/service';
import { getCustomerFromRequest } from '@/lib/auth/customer';

// Order history lookup is limited to the signed-in customer's own email address.
export async function POST(req: NextRequest) {
  try {
    const customer = await getCustomerFromRequest(req);
    if (!customer) {
      return NextResponse.json({ success: false, error: 'Please sign in to view your orders' }, { status: 401 });
    }

    const orders = await getOrdersByCustomerEmail(customer.email);
    return NextResponse.json({ success: true, orders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
