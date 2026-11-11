import { NextRequest, NextResponse } from 'next/server';
import { getCustomerFromRequest } from '@/lib/auth/customer';
import { updateAddress, deleteAddress } from '@/lib/db/addresses';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const customer = await getCustomerFromRequest(req);
  if (!customer) return NextResponse.json({ success: false, error: 'Please sign in' }, { status: 401 });
  try {
    const { id } = await params;
    const address = await updateAddress(customer.id, id, await req.json());
    return NextResponse.json({ success: true, address });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Could not update address' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const customer = await getCustomerFromRequest(req);
  if (!customer) return NextResponse.json({ success: false, error: 'Please sign in' }, { status: 401 });
  try {
    const { id } = await params;
    await deleteAddress(customer.id, id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Could not delete address' }, { status: 400 });
  }
}
