import { NextRequest, NextResponse } from 'next/server';
import { getOrderByReference, getInvoiceByOrderId } from '@/lib/db/service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderReference: string }> }
) {
  try {
    const { orderReference } = await params;
    if (!orderReference) {
      return NextResponse.json({ success: false, error: 'Order reference required' }, { status: 400 });
    }

    const order = getOrderByReference(orderReference);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const invoice = getInvoiceByOrderId(order.id);

    return NextResponse.json({
      success: true,
      order,
      invoice,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
