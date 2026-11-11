import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth/admin';
import { getOrderById } from '@/lib/db/service';
import { getOrderBatches, listBatches, setItemBatches, allocateOrderBatches } from '@/lib/db/batches';

// Order lines with their batch allocation, plus the batches each line could draw from
export async function GET(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const { orderId } = await params;
    const order = await getOrderById(orderId);
    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    const allocations = await getOrderBatches(orderId);
    const variantIds = [...new Set((order.items || []).map((i) => i.variant_id))];
    const batches = (await Promise.all(variantIds.map((v) => listBatches(v)))).flat();
    return NextResponse.json({
      success: true,
      items: (order.items || []).map((i) => ({ id: i.id, variant_id: i.variant_id, name: `${i.product_name} — ${i.variant_name}`, quantity: i.quantity })),
      allocations,
      batches,
    });
  } catch (err: any) {
    console.error('[ORDER BATCHES ERROR]', err);
    return NextResponse.json({ success: false, error: 'Could not load batches' }, { status: 500 });
  }
}

// { order_item_id, allocations: [{ batch_id, quantity }] } replaces one line's allocation,
// or { auto: true } fills any unassigned units first-expiry-first-out
export async function POST(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const { orderId } = await params;
    const order = await getOrderById(orderId);
    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    if (order.fulfilment_status === 'shipped' || order.fulfilment_status === 'delivered') {
      return NextResponse.json({ success: false, error: 'This order has left the warehouse; its batches are final.' }, { status: 409 });
    }
    const body = await req.json();
    if (body.auto) {
      const short = await allocateOrderBatches(orderId);
      return NextResponse.json({ success: true, unallocated: short, allocations: await getOrderBatches(orderId) });
    }
    const line = (order.items || []).find((i) => i.id === body.order_item_id);
    if (!line) return NextResponse.json({ success: false, error: 'Order line not found' }, { status: 404 });
    const allocations = (Array.isArray(body.allocations) ? body.allocations : [])
      .map((a: any) => ({ batch_id: String(a.batch_id), quantity: Math.floor(Number(a.quantity)) }))
      .filter((a: any) => a.quantity > 0);
    await setItemBatches(line.id, allocations);
    console.log(`[BATCHES] ${admin.email} set batches for ${order.order_reference} line ${line.id}`, allocations);
    return NextResponse.json({ success: true, allocations: await getOrderBatches(orderId) });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Could not save batches' }, { status: 400 });
  }
}
