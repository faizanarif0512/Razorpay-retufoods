import { NextRequest, NextResponse } from 'next/server';
import { checkPincode, NOT_SERVICEABLE_MESSAGE } from '@/lib/db/pincodes';
import { getCustomerFromRequest } from '@/lib/auth/customer';
import {
  getSubscriptionsByCustomer,
  getSubscriptionById,
  getOrdersForSubscription,
  updateSubscriptionAddress,
  setSubscriptionFlags,
  cycleTotalPaise,
} from '@/lib/db/subscriptions';
import {
  cancelRazorpaySubscription,
  pauseRazorpaySubscription,
  resumeRazorpaySubscription,
} from '@/lib/payments/razorpay';
import { sendSubscriptionCancelledEmail } from '@/lib/notifications/email';

export async function GET(req: NextRequest) {
  const customer = await getCustomerFromRequest(req);
  if (!customer) return NextResponse.json({ success: false, error: 'Please sign in' }, { status: 401 });
  try {
    const subs = await getSubscriptionsByCustomer(customer.id);
    const withOrders = await Promise.all(
      subs.map(async (s) => ({
        ...s,
        cycle_total_paise: s.plan ? cycleTotalPaise(s.plan) : null,
        orders: (await getOrdersForSubscription(s.id)).map((o) => ({
          id: o.id,
          order_reference: o.order_reference,
          total_paise: o.total_paise,
          fulfilment_status: o.fulfilment_status,
          created_at: o.created_at,
        })),
      }))
    );
    return NextResponse.json({ success: true, subscriptions: withOrders });
  } catch (err: any) {
    console.error('[CUSTOMER SUBSCRIPTIONS ERROR]', err);
    return NextResponse.json({ success: false, error: 'Could not load subscriptions' }, { status: 500 });
  }
}

// action: cancel | pause | resume | address
export async function POST(req: NextRequest) {
  const customer = await getCustomerFromRequest(req);
  if (!customer) return NextResponse.json({ success: false, error: 'Please sign in' }, { status: 401 });

  try {
    const { subscriptionId, action, address } = await req.json();
    const sub = await getSubscriptionById(subscriptionId);
    if (!sub || sub.customer_id !== customer.id || !sub.razorpay_subscription_id) {
      return NextResponse.json({ success: false, error: 'Subscription not found' }, { status: 404 });
    }
    const rzpId = sub.razorpay_subscription_id;

    if (action === 'cancel') {
      if (['cancelled', 'completed', 'expired'].includes(sub.status)) {
        return NextResponse.json({ success: false, error: 'This subscription has already ended' }, { status: 400 });
      }
      // Ends after the current cycle so the customer keeps the box they've paid for
      const atCycleEnd = sub.status === 'active';
      await cancelRazorpaySubscription(rzpId, atCycleEnd);
      const updated = await setSubscriptionFlags(sub.id, atCycleEnd ? { cancel_at_cycle_end: true } : { status: 'cancelled' });
      sendSubscriptionCancelledEmail({
        customer_name: sub.customer_name,
        customer_email: sub.customer_email,
        planName: sub.plan?.name || 'subscription',
        cycleTotalPaise: sub.plan ? cycleTotalPaise(sub.plan) : 0,
        nextChargeAt: sub.next_charge_at,
        atCycleEnd,
      }).catch(console.error);
      return NextResponse.json({ success: true, subscription: updated });
    }

    if (action === 'pause') {
      if (sub.status !== 'active') {
        return NextResponse.json({ success: false, error: 'Only an active subscription can be paused' }, { status: 400 });
      }
      await pauseRazorpaySubscription(rzpId);
      return NextResponse.json({ success: true, subscription: await setSubscriptionFlags(sub.id, { status: 'paused' }) });
    }

    if (action === 'resume') {
      if (sub.status !== 'paused') {
        return NextResponse.json({ success: false, error: 'This subscription is not paused' }, { status: 400 });
      }
      await resumeRazorpaySubscription(rzpId);
      return NextResponse.json({ success: true, subscription: await setSubscriptionFlags(sub.id, { status: 'active' }) });
    }

    if (action === 'address') {
      const a = address || {};
      if (!a.name?.trim() || !a.address_line1?.trim() || !a.city?.trim() || !a.state?.trim()) {
        return NextResponse.json({ success: false, error: 'Please complete the delivery address' }, { status: 400 });
      }
      if (!/^\d{6}$/.test((a.postal_code || '').trim()) || (a.phone || '').replace(/\D/g, '').length < 10) {
        return NextResponse.json({ success: false, error: 'Valid PIN code and phone number are required' }, { status: 400 });
      }
      const pin = await checkPincode(a.postal_code);
      if (!pin.serviceable) {
        return NextResponse.json({ success: false, error: NOT_SERVICEABLE_MESSAGE }, { status: 400 });
      }
      return NextResponse.json({ success: true, subscription: await updateSubscriptionAddress(sub.id, a) });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('[CUSTOMER SUBSCRIPTION ACTION ERROR]', err);
    const message = err?.error?.description || err?.message || 'Could not update the subscription';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
