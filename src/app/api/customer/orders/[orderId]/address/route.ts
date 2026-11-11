import { NextRequest, NextResponse } from 'next/server';
import { getCustomerFromRequest } from '@/lib/auth/customer';
import { getOrderById } from '@/lib/db/service';
import { addressChangeRule, applyOrderAddress, listAddresses, validateAddress } from '@/lib/db/addresses';
import { sendAddressChangedAlert } from '@/lib/notifications/email';

// Changes the delivery address of one order. Body: { addressId } (saved address) or { address }.
// Subscription boxes are better re-addressed on the subscription itself, which also updates this box.
export async function POST(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const customer = await getCustomerFromRequest(req);
  if (!customer) return NextResponse.json({ success: false, error: 'Please sign in' }, { status: 401 });

  try {
    const { orderId } = await params;
    const order = await getOrderById(orderId);
    const owns = order && (order.customer_id === customer.id || order.customer_email.toLowerCase() === customer.email.toLowerCase());
    if (!order || !owns) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });

    const rule = addressChangeRule(order);
    if (!rule.allowed) return NextResponse.json({ success: false, error: rule.reason }, { status: 409 });

    const body = await req.json();
    let raw = body.address;
    if (body.addressId) {
      raw = (await listAddresses(customer.id)).find((a) => a.id === body.addressId);
      if (!raw) return NextResponse.json({ success: false, error: 'Saved address not found' }, { status: 404 });
    }
    const address = await validateAddress(raw || {}, true);

    await applyOrderAddress(order, address, `customer:${customer.id}`);
    const updated = await getOrderById(orderId);
    sendAddressChangedAlert(updated!, order).catch(console.error);
    return NextResponse.json({ success: true, order: { ...updated, address_change: addressChangeRule(updated!) } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Could not change the address' }, { status: 400 });
  }
}
