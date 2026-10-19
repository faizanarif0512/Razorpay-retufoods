import { NextRequest, NextResponse } from 'next/server';
import { getCustomerFromRequest } from '@/lib/auth/customer';
import { getOrderById, requestOrderCancellation } from '@/lib/db/service';
import { sendCustomerCancellationRequestedEmail, sendAdminCancellationRequestAlert } from '@/lib/notifications/email';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const customer = getCustomerFromRequest(req);
    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Please sign in to your customer account.' },
        { status: 401 }
      );
    }

    const { orderId } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = body.reason || 'Customer requested pre-dispatch cancellation';

    const order = getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    // Verify order belongs to this customer
    const isOwner =
      (order.customer_id && order.customer_id === customer.id) ||
      order.customer_email.toLowerCase() === customer.email.toLowerCase();

    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to cancel this order.' },
        { status: 403 }
      );
    }

    // Check payment status
    if (order.payment_status !== 'paid') {
      return NextResponse.json(
        { success: false, error: `Order cannot be refunded because payment status is ${order.payment_status}.` },
        { status: 400 }
      );
    }

    // Check fulfilment status (only pre-dispatch can be cancelled)
    if (order.fulfilment_status === 'shipped' || order.fulfilment_status === 'delivered') {
      return NextResponse.json(
        {
          success: false,
          error:
            'This order has already been dispatched in an insulated cold-chain package and cannot be cancelled self-service. Please contact customer support at faizan.loyola@gmail.com.',
        },
        { status: 400 }
      );
    }

    if (order.fulfilment_status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'This order has already been cancelled.' },
        { status: 400 }
      );
    }

    if (order.cancellation_status === 'requested') {
      return NextResponse.json(
        { success: false, error: 'A cancellation request is already pending review for this order.' },
        { status: 400 }
      );
    }

    // 1. Record cancellation request in database (Intimation before admin review)
    const updatedOrder = requestOrderCancellation(order.id, reason);

    // 2. Send intimation email to customer and alert email to admin
    try {
      await sendCustomerCancellationRequestedEmail(updatedOrder, reason);
      await sendAdminCancellationRequestAlert(updatedOrder, reason);
    } catch (emailErr) {
      console.error('[EMAIL ERROR ON CANCELLATION REQUEST]:', emailErr);
    }

    return NextResponse.json({
      success: true,
      message: `Your cancellation request for order ${order.order_reference} has been submitted for review. Our team will verify cold-chain dispatch status and notify you once approved.`,
      order: updatedOrder,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
