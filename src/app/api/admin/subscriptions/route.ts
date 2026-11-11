import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth/admin';
import { getAllSubscriptionsAdmin, cycleTotalPaise } from '@/lib/db/subscriptions';

export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const subs = await getAllSubscriptionsAdmin();
    return NextResponse.json({
      success: true,
      subscriptions: subs.map((s) => ({ ...s, cycle_total_paise: s.plan ? cycleTotalPaise(s.plan) : null })),
    });
  } catch (err: any) {
    console.error('[ADMIN SUBSCRIPTIONS ERROR]', err);
    return NextResponse.json({ success: false, error: 'Could not load subscriptions' }, { status: 500 });
  }
}
