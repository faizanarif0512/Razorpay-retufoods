import { NextRequest, NextResponse } from 'next/server';
import { getActivePlans, cycleTotalPaise, isFirstTimeBuyer, hasLiveSubscription } from '@/lib/db/subscriptions';
import { getCustomerFromRequest } from '@/lib/auth/customer';
import { getSupabase } from '@/lib/db/supabase';

// Plans for the subscribe page, plus what the signed-in customer is allowed to buy
export async function GET(req: NextRequest) {
  try {
    const plans = await getActivePlans();
    const variantIds = [...new Set(plans.map((p) => p.variant_id))];
    const { data: variants } = await getSupabase()
      .from('product_variants')
      .select('id, name, stock_quantity, price_paise, product:products(name, image_url)')
      .in('id', variantIds.length ? variantIds : ['none']);
    const byId = new Map((variants || []).map((v: any) => [v.id, v]));

    const customer = await getCustomerFromRequest(req);
    const eligibility = customer
      ? {
          signedIn: true,
          firstTimeBuyer: await isFirstTimeBuyer({ customerId: customer.id, email: customer.email, phone: customer.phone || '' }),
          hasSubscription: await hasLiveSubscription(customer.id),
        }
      : { signedIn: false, firstTimeBuyer: null, hasSubscription: false };

    return NextResponse.json({
      success: true,
      plans: plans.map((p) => {
        const v: any = byId.get(p.variant_id);
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          interval_weeks: p.interval_weeks,
          packs_per_cycle: p.packs_per_cycle,
          price_paise: p.price_paise,
          shipping_paise: p.shipping_paise,
          cycle_total_paise: cycleTotalPaise(p),
          per_pack_paise: Math.round(p.price_paise / p.packs_per_cycle),
          variant_name: v?.name,
          product_name: v?.product?.name,
          image_url: v?.product?.image_url,
          in_stock: (v?.stock_quantity ?? 0) >= p.packs_per_cycle,
        };
      }),
      trial: (() => {
        const v: any = byId.get(plans[0]?.variant_id);
        return v ? { variant_id: v.id, price_paise: v.price_paise, name: v.name, in_stock: v.stock_quantity > 0 } : null;
      })(),
      customer: customer
        ? {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address_line1: customer.address_line1,
            address_line2: customer.address_line2,
            city: customer.city,
            state: customer.state,
            postal_code: customer.postal_code,
          }
        : null,
      eligibility,
    });
  } catch (err: any) {
    console.error('[PLANS ERROR]', err);
    return NextResponse.json({ success: false, error: 'Could not load plans' }, { status: 500 });
  }
}
