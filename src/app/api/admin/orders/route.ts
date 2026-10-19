import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, SESSION_COOKIE_NAME } from '@/lib/auth/admin';
import { getAllOrdersAdmin, updateOrderFulfilment, getOrderById } from '@/lib/db/service';
import { sendOrderFulfilmentEmail } from '@/lib/notifications/email';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    const orders = getAllOrdersAdmin(status, search);
    return NextResponse.json({ success: true, orders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId, fulfilment_status, carrier, tracking_number } = await req.json();

    if (!orderId || !fulfilment_status) {
      return NextResponse.json({ success: false, error: 'Order ID and fulfilment status required' }, { status: 400 });
    }

    updateOrderFulfilment(orderId, fulfilment_status, carrier, tracking_number);

    // Fetch updated order and trigger transactional fulfilment email
    const order = getOrderById(orderId);
    if (order && (fulfilment_status === 'shipped' || fulfilment_status === 'delivered')) {
      sendOrderFulfilmentEmail(order, fulfilment_status, carrier, tracking_number).catch(console.error);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

