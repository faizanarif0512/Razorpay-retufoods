import { NextRequest, NextResponse } from 'next/server';
import { getOrderById, markOrderPaid, getInvoiceByOrderId } from '@/lib/db/service';
import { verifyPaymentSignature } from '@/lib/payments/razorpay';
import { sendOrderPaidEmails } from '@/lib/notifications/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

    if (!orderId || !razorpayOrderId || !razorpayPaymentId) {
      return NextResponse.json(
        { success: false, error: 'Missing required payment verification parameters' },
        { status: 400 }
      );
    }

    const order = getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    // Verify order association
    if (order.razorpay_order_id && order.razorpay_order_id !== razorpayOrderId) {
      return NextResponse.json(
        { success: false, error: 'Razorpay order ID mismatch' },
        { status: 400 }
      );
    }

    // If order was already paid, return success idempotently
    if (order.payment_status === 'paid') {
      return NextResponse.json({
        success: true,
        orderReference: order.order_reference,
        message: 'Order already verified',
      });
    }

    // Cryptographically verify signature
    const isValid = verifyPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature: razorpaySignature || '',
    });

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Cryptographic signature verification failed' },
        { status: 400 }
      );
    }

    // Update order status to PAID and trigger invoice generation
    const updatedOrder = markOrderPaid(order.id, razorpayPaymentId, razorpaySignature);
    const invoice = getInvoiceByOrderId(order.id);

    // Send confirmation emails in background
    sendOrderPaidEmails(updatedOrder, invoice?.invoice_number || 'INV-PENDING').catch((err) => {
      console.error('Failed to send confirmation email:', err);
    });

    return NextResponse.json({
      success: true,
      orderReference: updatedOrder.order_reference,
      invoiceNumber: invoice?.invoice_number,
    });
  } catch (err: any) {
    console.error('Payment verification error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
}
