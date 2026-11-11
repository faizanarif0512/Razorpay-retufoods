import { NextRequest, NextResponse } from 'next/server';
import { getCustomerFromRequest } from '@/lib/auth/customer';
import { verifySubscriptionSignature, fetchRazorpaySubscription } from '@/lib/payments/razorpay';
import {
  getSubscriptionById,
  syncSubscriptionFromRazorpay,
  createSubscriptionCycleOrder,
  cycleTotalPaise,
} from '@/lib/db/subscriptions';
import { getInvoiceByOrderId } from '@/lib/db/service';
import { sendOrderPaidEmails, sendSubscriptionStartedEmail } from '@/lib/notifications/email';

// Called by the browser after Razorpay Checkout completes. The first charge happens here, so
// we create the first cycle order straight away; the webhook for the same payment is a no-op.
export async function POST(req: NextRequest) {
  try {
    const customer = await getCustomerFromRequest(req);
    if (!customer) return NextResponse.json({ success: false, error: 'Please sign in again.' }, { status: 401 });

    const { subscriptionId, razorpayPaymentId, razorpaySubscriptionId, razorpaySignature } = await req.json();
    const sub = await getSubscriptionById(subscriptionId);
    if (!sub || sub.customer_id !== customer.id || sub.razorpay_subscription_id !== razorpaySubscriptionId) {
      return NextResponse.json({ success: false, error: 'Subscription not found' }, { status: 404 });
    }

    if (!verifySubscriptionSignature({ razorpaySubscriptionId, razorpayPaymentId, razorpaySignature })) {
      return NextResponse.json({ success: false, error: 'Payment verification failed' }, { status: 400 });
    }

    const entity = await fetchRazorpaySubscription(razorpaySubscriptionId);
    const synced = await syncSubscriptionFromRazorpay(sub, entity, entity?.status === 'active' ? 'active' : 'authenticated');
    const { order, created } = await createSubscriptionCycleOrder(synced, razorpayPaymentId);

    if (created) {
      const invoice = await getInvoiceByOrderId(order.id);
      sendOrderPaidEmails(order, invoice?.invoice_number || 'INV-PENDING').catch(console.error);
      sendSubscriptionStartedEmail({
        customer_name: synced.customer_name,
        customer_email: synced.customer_email,
        planName: synced.plan?.name || 'subscription',
        cycleTotalPaise: synced.plan ? cycleTotalPaise(synced.plan) : order.total_paise,
        nextChargeAt: synced.next_charge_at,
      }).catch(console.error);
    }

    return NextResponse.json({ success: true, orderReference: order.order_reference, subscriptionId: synced.id });
  } catch (err: any) {
    console.error('[SUBSCRIPTION VERIFY ERROR]', err);
    return NextResponse.json({ success: false, error: err?.message || 'Could not confirm the subscription' }, { status: 500 });
  }
}
