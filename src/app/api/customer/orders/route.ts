import { NextRequest, NextResponse } from 'next/server';
import { getCustomerFromRequest } from '@/lib/auth/customer';
import { getOrdersByCustomerId } from '@/lib/db/service';
import { addressChangeRule } from '@/lib/db/addresses';

export async function GET(req: NextRequest) {
  try {
    const customer = await getCustomerFromRequest(req);
    if (!customer) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const orders = await getOrdersByCustomerId(customer.id);
    return NextResponse.json({
      success: true,
      // Each order says whether its delivery address can still be changed, and until when
      orders: orders.map((o) => ({ ...o, address_change: addressChangeRule(o) })),
      customer,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
