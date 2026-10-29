import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth/admin';
import {
  getOrderById,
  rejectOrderCancellation,
  adminCancelOrder,
  createOrderRefund,
} from '@/lib/db/service';
import { createRazorpayRefund } from '@/lib/payments/razorpay';
import {
  sendCustomerCancellationRejectedEmail,
  sendOrderRefundedEmails,
  sendOrderCancelledEmail,
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
    const { action, reason, amountPaise, restock } = body;

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ success: false, error: 'Action must be approve or reject' }, { status: 400 });
    }

    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    if (order.cancellation_status !== 'requested' && action === 'reject') {
      return NextResponse.json(
        { success: false, error: 'No active cancellation request to reject on this order.' },
        { status: 400 }
      );
    }

    // --- REJECT PATH ---
    if (action === 'reject') {
      const rejectionReason = reason || 'Order has already been prepared for cold-chain transit and cannot be cancelled.';
      const updated = await rejectOrderCancellation(orderId, rejectionReason, admin.email);

      try {
        await sendCustomerCancellationRejectedEmail(updated, rejectionReason);
      } catch (emailErr) {
        console.error('[EMAIL ERROR ON CANCELLATION REJECTION]:', emailErr);
      }

      return NextResponse.json({
        success: true,
        message: `Cancellation request for order ${order.order_reference} has been rejected. Customer has been notified.`,
        order: updated,
      });
    }

    // --- APPROVE PATH ---
    const shouldRestock = restock !== false;
    const approvalReason = reason || order.cancellation_reason || 'Cancellation approved by store administrator';

    // If order was paid via Razorpay, trigger Razorpay Refund API
    if (order.payment_status === 'paid' || order.payment_status === 'partially_refunded') {
      if (!order.razorpay_payment_id) {
        return NextResponse.json(
          { success: false, error: 'Cannot process automated refund: No Razorpay payment ID on record.' },
          { status: 400 }
        );
      }

      const targetAmountPaise = amountPaise ? Number(amountPaise) : order.total_paise;

      // 1. Trigger Razorpay Refund API
      const refundResult = await createRazorpayRefund({
        paymentId: order.razorpay_payment_id,
        amountPaise: targetAmountPaise,
        notes: {
          order_reference: order.order_reference,
          reason: approvalReason,
          admin_email: admin.email,
        },
      });

      if (!refundResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: refundResult.error || 'Failed to execute refund via Razorpay API. Please check Razorpay keys or payment status.',
          },
          { status: 502 }
        );
      }

      // 2. Record refund and update order state to refunded and cancelled
      const refund = await createOrderRefund({
        orderId: order.id,
        razorpayRefundId: refundResult.refundId,
        razorpayPaymentId: order.razorpay_payment_id,
        amountPaise: targetAmountPaise,
        reason: approvalReason,
        initiatedBy: 'admin',
        restock: shouldRestock,
        notes: `Cancellation approved by ${admin.email}. Razorpay refund reference: ${refundResult.refundId}`,
      });

      // 3. Send branded refund confirmation emails to customer and admin
      try {
        await sendOrderRefundedEmails(order, refund);
      } catch (emailErr) {
        console.error('[EMAIL ERROR ON APPROVED REFUND]:', emailErr);
      }

      const updated = await getOrderById(order.id);
      return NextResponse.json({
        success: true,
        message: `Cancellation approved! Refund of ₹${(targetAmountPaise / 100).toFixed(2)} processed via Razorpay.${shouldRestock ? ' Inventory stock restored.' : ''}`,
        order: updated,
        refund,
      });
    } else {
      // Order was unpaid or pending: simply cancel order and restock
      const updated = await adminCancelOrder(orderId, {
        reason: approvalReason,
        restock: shouldRestock,
        adminEmail: admin.email,
      });

      try {
        await sendOrderCancelledEmail(updated, approvalReason);
      } catch (emailErr) {
        console.error('[EMAIL ERROR ON UNPAID CANCEL]:', emailErr);
      }

      return NextResponse.json({
        success: true,
        message: `Cancellation approved! Order set to cancelled.${shouldRestock ? ' Inventory stock restored.' : ''}`,
        order: updated,
      });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
