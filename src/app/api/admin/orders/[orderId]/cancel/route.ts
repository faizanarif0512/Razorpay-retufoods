import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth/admin';
import {
  getOrderById,
  adminCancelOrder,
  createOrderRefund,
  getRefundsByOrderId,
} from '@/lib/db/service';
import { createRazorpayRefund } from '@/lib/payments/razorpay';
import {
  sendOrderCancelledEmail,
  sendOrderRefundedEmails,
} from '@/lib/notifications/email';

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
    const { reason, restock } = body;

    const order = getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    if (order.fulfilment_status === 'cancelled') {
      return NextResponse.json({ success: false, error: 'Order is already cancelled' }, { status: 400 });
    }

    const cancellationReason = reason || 'Cancelled by store administrator';
    const shouldRestock = restock !== false;

    // Check if order is prepaid (paid or partially refunded)
    const isPrepaid = order.payment_status === 'paid' || order.payment_status === 'partially_refunded';

    if (isPrepaid) {
      if (!order.razorpay_payment_id) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot process automated refund: No Razorpay payment ID on record for this prepaid order.',
          },
          { status: 400 }
        );
      }

      const existingRefunds = getRefundsByOrderId(orderId);
      const alreadyRefundedPaise = existingRefunds
        .filter((r) => r.status === 'processed')
        .reduce((sum, r) => sum + r.amount_paise, 0);

      const refundableAmountPaise = Math.max(0, order.total_paise - alreadyRefundedPaise);

      if (refundableAmountPaise > 0) {
        // 1. Trigger Razorpay Refund API
        const refundResult = await createRazorpayRefund({
          paymentId: order.razorpay_payment_id,
          amountPaise: refundableAmountPaise,
          notes: {
            order_reference: order.order_reference,
            reason: cancellationReason,
            admin_email: admin.email,
          },
        });

        if (!refundResult.success) {
          return NextResponse.json(
            {
              success: false,
              error: refundResult.error || 'Failed to execute refund via Razorpay API. Order was not cancelled.',
            },
            { status: 502 }
          );
        }

        // 2. Record refund and update order state to refunded and cancelled
        const refund = createOrderRefund({
          orderId: order.id,
          razorpayRefundId: refundResult.refundId,
          razorpayPaymentId: order.razorpay_payment_id,
          amountPaise: refundableAmountPaise,
          reason: cancellationReason,
          initiatedBy: 'admin',
          restock: shouldRestock,
          notes: `Admin cancellation by ${admin.email}. Razorpay refund: ${refundResult.refundId}`,
        });

        // 3. Ensure fulfilment status is marked cancelled in orders table
        const updated = adminCancelOrder(orderId, {
          reason: cancellationReason,
          restock: false, // Stock was already restored by createOrderRefund if restock=true
          adminEmail: admin.email,
        });

        // 4. Send cancellation and refund confirmation emails
        try {
          await sendOrderRefundedEmails(order, refund);
        } catch (emailErr) {
          console.error('[EMAIL ERROR ON ADMIN CANCEL REFUND]:', emailErr);
        }

        return NextResponse.json({
          success: true,
          message: `Order ${order.order_reference} cancelled. Full refund of ₹${(refundableAmountPaise / 100).toFixed(2)} processed via Razorpay.${shouldRestock ? ' Inventory stock restored.' : ''}`,
          order: updated,
          refund,
        });
      }
    }

    // Non-prepaid or already fully refunded: cancel order and restore stock if requested
    const updated = adminCancelOrder(orderId, {
      reason: cancellationReason,
      restock: shouldRestock,
      adminEmail: admin.email,
    });

    // Notify customer
    try {
      await sendOrderCancelledEmail(updated, cancellationReason);
    } catch (emailErr) {
      console.error('[EMAIL ERROR ON ADMIN CANCEL]:', emailErr);
    }

    return NextResponse.json({
      success: true,
      message: `Order ${order.order_reference} has been set to cancelled.${shouldRestock ? ' Inventory stock restored.' : ''}`,
      order: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
