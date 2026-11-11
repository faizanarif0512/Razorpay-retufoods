import { NextRequest, NextResponse } from 'next/server';
import { getCustomerFromRequest } from '@/lib/auth/customer';
import { listAddresses, createAddress } from '@/lib/db/addresses';

export async function GET(req: NextRequest) {
  const customer = await getCustomerFromRequest(req);
  if (!customer) return NextResponse.json({ success: false, error: 'Please sign in' }, { status: 401 });
  try {
    return NextResponse.json({ success: true, addresses: await listAddresses(customer.id) });
  } catch (err: any) {
    console.error('[ADDRESSES ERROR]', err);
    return NextResponse.json({ success: false, error: 'Could not load addresses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const customer = await getCustomerFromRequest(req);
  if (!customer) return NextResponse.json({ success: false, error: 'Please sign in' }, { status: 401 });
  try {
    const address = await createAddress(customer.id, await req.json());
    return NextResponse.json({ success: true, address });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Could not save address' }, { status: 400 });
  }
}
