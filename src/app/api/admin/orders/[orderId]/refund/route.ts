import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth/admin';
import { getOrderById, createOrderRefund, getRefundsByOrderId } from '@/lib/db/service';
import { createRazorpayRefund } from '@/lib/payments/razorpay';
import { sendOrderRefundedEmails } from '@/lib/notifications/email';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    const { orderId } = await params;
    const body = await req.json().catch(() => ({}));
    const { amountPaise, reason, restock } = body;

    const order = getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    if (order.payment_status !== 'paid' && order.payment_status !== 'partially_refunded') {
      return NextResponse.json(
        { success: false, error: `Cannot refund order with payment status: ${order.payment_status}` },
        { status: 400 }
      );
    }

    // Determine refund amount
    const existingRefunds = getRefundsByOrderId(orderId);
    const alreadyRefundedPaise = existingRefunds
      .filter((r) => r.status === 'processed')
      .reduce((sum, r) => sum + r.amount_paise, 0);

    const maxRefundablePaise = Math.max(0, order.total_paise - alreadyRefundedPaise);

    if (maxRefundablePaise <= 0) {
      return NextResponse.json(
        { success: false, error: 'Order has already been refunded in full.' },
        { status: 400 }
      );
    }

    const targetAmountPaise = amountPaise ? Math.min(Number(amountPaise), maxRefundablePaise) : maxRefundablePaise;

    if (targetAmountPaise <= 0) {
      return NextResponse.json(
        { success: false, error: 'Refund amount must be greater than zero.' },
        { status: 400 }
      );
    }

    if (!order.razorpay_payment_id) {
      return NextResponse.json(
        { success: false, error: 'No Razorpay payment ID found on this order to issue refund against.' },
        { status: 400 }
      );
    }

    const refundReason = reason || 'Admin approved refund';
    const shouldRestock = restock !== false;

    // 1. Trigger Razorpay Refund API
    const refundResult = await createRazorpayRefund({
      paymentId: order.razorpay_payment_id,
      amountPaise: targetAmountPaise,
      notes: {
        order_reference: order.order_reference,
        admin_email: admin.email,
        reason: refundReason,
      },
    });

    if (!refundResult.success) {
      return NextResponse.json(
        { success: false, error: refundResult.error || 'Razorpay refund API call failed.' },
        { status: 502 }
      );
    }

    // 2. Record refund and update order state in database
    const refund = createOrderRefund({
      orderId: order.id,
      razorpayRefundId: refundResult.refundId,
      razorpayPaymentId: order.razorpay_payment_id,
      amountPaise: targetAmountPaise,
      reason: refundReason,
      initiatedBy: 'admin',
      restock: shouldRestock,
      notes: `Admin refund issued by ${admin.email}. Restocked: ${shouldRestock ? 'Yes' : 'No'}`,
    });

    // 3. Send email notifications to customer and admin
    try {
      await sendOrderRefundedEmails(order, refund);
    } catch (emailErr) {
      console.error('[EMAIL DISPATCH ERROR ON ADMIN REFUND]:', emailErr);
    }

    return NextResponse.json({
      success: true,
      message: `Refund of ₹${(targetAmountPaise / 100).toFixed(2)} processed successfully via Razorpay.`,
      refund,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
