import { NextRequest, NextResponse } from 'next/server';
import { getCustomerFromRequest } from '@/lib/auth/customer';
import { updateCustomerProfile } from '@/lib/db/service';
import { getPlanById, createPendingSubscription, cycleTotalPaise, hasLiveSubscription } from '@/lib/db/subscriptions';
import { getSupabase } from '@/lib/db/supabase';

// Starts a subscription checkout: saves a pending subscription and returns the Razorpay
// subscription id that the browser opens in Razorpay Checkout to set up the mandate.
export async function POST(req: NextRequest) {
  try {
    const customer = await getCustomerFromRequest(req);
    if (!customer) {
      return NextResponse.json({ success: false, requiresLogin: true, error: 'Please sign in to subscribe.' }, { status: 401 });
    }

    const body = await req.json();
    const { plan_id, name, phone, address_line1, address_line2, city, state, postal_code } = body || {};

    if (!name?.trim()) return NextResponse.json({ success: false, error: 'Full name is required' }, { status: 400 });
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      return NextResponse.json({ success: false, error: 'Valid 10-digit phone number is required' }, { status: 400 });
    }
    if (!address_line1?.trim() || !city?.trim() || !state?.trim()) {
      return NextResponse.json({ success: false, error: 'Delivery address, city and state are required' }, { status: 400 });
    }
    if (!/^\d{6}$/.test((postal_code || '').trim())) {
      return NextResponse.json({ success: false, error: 'Valid 6-digit PIN code is required' }, { status: 400 });
    }

    const plan = await getPlanById(plan_id);
    if (!plan || !plan.is_active) {
      return NextResponse.json({ success: false, error: 'This plan is not available' }, { status: 400 });
    }

    if (await hasLiveSubscription(customer.id)) {
      return NextResponse.json(
        { success: false, error: 'You already have a subscription. Manage it from My Account → Subscriptions.' },
        { status: 409 }
      );
    }

    const { data: variant } = await getSupabase().from('product_variants').select('stock_quantity, is_active').eq('id', plan.variant_id).single();
    if (!variant || variant.stock_quantity < plan.packs_per_cycle) {
      return NextResponse.json({ success: false, error: 'This plan is temporarily out of stock. Please try again soon.' }, { status: 409 });
    }

    const address = { name, phone, address_line1, address_line2, city, state, postal_code };
    await updateCustomerProfile(customer.id, { name, phone, address_line1, address_line2, city, state, postal_code } as any);
    const { subscription, isSimulator } = await createPendingSubscription(customer, plan, address);

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      razorpaySubscriptionId: subscription.razorpay_subscription_id,
      isSimulator,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      planName: plan.name,
      cycleTotalPaise: cycleTotalPaise(plan),
      customer: { name: name.trim(), email: customer.email, phone: phone.trim() },
    });
  } catch (err: any) {
    console.error('[SUBSCRIPTION CREATE ERROR]', err);
    const message = err?.error?.description || err?.message || 'Could not start the subscription';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
