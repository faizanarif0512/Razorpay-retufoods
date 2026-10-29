import { NextRequest, NextResponse } from 'next/server';
import {
  isWebhookProcessed,
  recordWebhookEvent,
  markWebhookProcessed,
  getOrderByRazorpayOrderId,
  getOrderByRazorpayPaymentId,
  markOrderPaid,
  markOrderPaymentFailed,
  getInvoiceByOrderId,
  createOrderRefund,
  getRefundByRazorpayRefundId,
} from '@/lib/db/service';
import { verifyWebhookSignature } from '@/lib/payments/razorpay';
import { sendOrderPaidEmails, sendOrderRefundedEmails } from '@/lib/notifications/email';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing x-razorpay-signature header' }, { status: 400 });
    }

    // Verify raw webhook HMAC signature
    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    // Razorpay sends the unique event id only in this header; it keeps retries idempotent
    const eventId = req.headers.get('x-razorpay-event-id') || event.event_id || event.id || `evt_${Date.now()}`;
    const eventType = event.event;

    // Check idempotency: If event was already processed, respond 200 immediately
    if (await isWebhookProcessed(eventId)) {
      return NextResponse.json({ status: 'ok', message: 'Event already processed' });
    }

    // Record webhook event in DB
    await recordWebhookEvent(eventId, eventType, event);

    // Process event
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderEntity = event.payload?.order?.entity;
      const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
      const razorpayPaymentId = paymentEntity?.id;

      if (razorpayOrderId) {
        const internalOrder = await getOrderByRazorpayOrderId(razorpayOrderId);
        if (internalOrder && internalOrder.payment_status !== 'paid') {
          const updated = await markOrderPaid(internalOrder.id, razorpayPaymentId || 'webhook_captured');
          const invoice = await getInvoiceByOrderId(internalOrder.id);
          sendOrderPaidEmails(updated, invoice?.invoice_number || 'INV-PENDING').catch(console.error);
        }
      }
    } else if (eventType === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const errorCode = paymentEntity?.error_code;
      const errorDescription = paymentEntity?.error_description;

      if (razorpayOrderId) {
        const internalOrder = await getOrderByRazorpayOrderId(razorpayOrderId);
        if (internalOrder && internalOrder.payment_status !== 'paid') {
          await markOrderPaymentFailed(internalOrder.id, errorCode, errorDescription);
        }
      }
    } else if (
      eventType === 'refund.processed' ||
      eventType === 'refund.created' ||
      eventType === 'payment.refunded'
    ) {
      const refundEntity = event.payload?.refund?.entity;
      const paymentEntity = event.payload?.payment?.entity;
      const razorpayPaymentId = refundEntity?.payment_id || paymentEntity?.id;
      const razorpayRefundId = refundEntity?.id || event.payload?.refund_id;
      const amountPaise = refundEntity?.amount || paymentEntity?.amount_refunded;
      const notes = refundEntity?.notes || paymentEntity?.notes;

      if (razorpayPaymentId) {
        const internalOrder = await getOrderByRazorpayPaymentId(razorpayPaymentId);
        if (internalOrder) {
          const existing = razorpayRefundId ? await getRefundByRazorpayRefundId(razorpayRefundId) : null;
          if (!existing) {
            const refund = await createOrderRefund({
              orderId: internalOrder.id,
              razorpayRefundId: razorpayRefundId || `rfnd_hook_${eventId}`,
              razorpayPaymentId,
              amountPaise: amountPaise || internalOrder.total_paise,
              reason: notes?.reason || 'Refund processed via Razorpay Dashboard',
              initiatedBy: 'webhook',
              restock: internalOrder.fulfilment_status !== 'shipped' && internalOrder.fulfilment_status !== 'delivered',
              notes: `Synchronized from Razorpay webhook event: ${eventType}`,
            });
            sendOrderRefundedEmails(internalOrder, refund).catch(console.error);
          }
        }
      }
    }

    await markWebhookProcessed(eventId);
    return NextResponse.json({ status: 'ok' });
  } catch (err: any) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: err.message || 'Webhook processing failed' }, { status: 500 });
  }
}
