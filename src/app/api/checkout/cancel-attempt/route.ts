import { NextRequest, NextResponse } from 'next/server';
import { getOrderById, markOrderPaymentFailed } from '@/lib/db/service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { orderId, reason, errorCode } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Order ID required' }, { status: 400 });
    }

    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    // Only restore if order has not been paid
    if (order.payment_status === 'paid') {
      return NextResponse.json({ success: true, message: 'Order is already paid' });
    }

    const updated = await markOrderPaymentFailed(
      orderId,
      errorCode || 'CHECKOUT_ABANDONED',
      reason || 'Customer closed Razorpay popup or payment was declined'
    );

    return NextResponse.json({
      success: true,
      message: 'Stock restored and payment attempt recorded as failed.',
      order: updated,
    });
  } catch (err: any) {
    console.error('Cancel attempt error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
