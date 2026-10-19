import { NextRequest, NextResponse } from 'next/server';
import { getCustomerFromRequest } from '@/lib/auth/customer';
import { getOrdersByCustomerId } from '@/lib/db/service';

export async function GET(req: NextRequest) {
  try {
    const customer = getCustomerFromRequest(req);
    if (!customer) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const orders = getOrdersByCustomerId(customer.id);
    return NextResponse.json({
      success: true,
      orders,
      customer,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
