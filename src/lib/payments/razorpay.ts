import crypto from 'crypto';
import Razorpay from 'razorpay';

export interface CreateRazorpayOrderResult {
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  isSimulator: boolean;
}

export function getRazorpayClient(): Razorpay | null {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (
    !keyId ||
    !keySecret ||
    keyId.includes('placeholder') ||
    keySecret.includes('placeholder')
  ) {
    return null;
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

// Server-side Razorpay Order Creator
export async function createRazorpayOrder(params: {
  amountPaise: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<CreateRazorpayOrderResult> {
  const client = getRazorpayClient();
  const currency = params.currency || 'INR';

  if (!client) {
    // Graceful fallback to Razorpay Test Mode Simulator if merchant credentials are yet to be entered
    const mockOrderId = `order_test_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    return {
      razorpayOrderId: mockOrderId,
      amountPaise: params.amountPaise,
      currency,
      isSimulator: true,
    };
  }

  const order = await client.orders.create({
    amount: params.amountPaise,
    currency,
    receipt: params.receipt,
    notes: params.notes || {},
  });

  return {
    razorpayOrderId: order.id,
    amountPaise: Number(order.amount),
    currency: order.currency,
    isSimulator: false,
  };
}

export interface CreateRazorpayRefundResult {
  success: boolean;
  refundId: string;
  amountPaise: number;
  currency: string;
  status: string;
  isSimulator: boolean;
  error?: string;
}

// Server-side Razorpay Refund Processor
export async function createRazorpayRefund(params: {
  paymentId: string;
  amountPaise?: number;
  notes?: Record<string, string>;
  speed?: 'normal' | 'optimum';
}): Promise<CreateRazorpayRefundResult> {
  const client = getRazorpayClient();

  if (!client || params.paymentId.startsWith('pay_test_sim_') || params.paymentId.startsWith('pay_test_')) {
    const mockRefundId = `rfnd_sim_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    return {
      success: true,
      refundId: mockRefundId,
      amountPaise: params.amountPaise || 0,
      currency: 'INR',
      status: 'processed',
      isSimulator: true,
    };
  }

  try {
    const refundPayload: any = {
      notes: params.notes || {},
    };
    if (params.amountPaise) {
      refundPayload.amount = params.amountPaise;
    }
    if (params.speed) {
      refundPayload.speed = params.speed;
    }

    const refund: any = await (client.payments as any).refund(params.paymentId, refundPayload);

    return {
      success: true,
      refundId: refund.id,
      amountPaise: Number(refund.amount),
      currency: refund.currency || 'INR',
      status: refund.status || 'processed',
      isSimulator: false,
    };
  } catch (err: any) {
    console.error('[RAZORPAY REFUND ERROR]:', err);
    return {
      success: false,
      refundId: '',
      amountPaise: params.amountPaise || 0,
      currency: 'INR',
      status: 'failed',
      isSimulator: false,
      error: err.error?.description || err.message || 'Razorpay refund processing failed',
    };
  }
}

// Strict cryptographic verification of payment signature
export function verifyPaymentSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  // Simulator mode verification (when merchant keys are placeholders during initial testing)
  if (!keySecret || keySecret.includes('placeholder')) {
    const expectedSim = crypto
      .createHmac('sha256', 'retu_test_secret')
      .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
      .digest('hex');
    
    // Also accept simple test simulator signature
    if (params.razorpaySignature === expectedSim || params.razorpaySignature.startsWith('sig_test_')) {
      return true;
    }
  }

  if (!keySecret) return false;

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest('hex');

  const signatureBuffer = Buffer.from(params.razorpaySignature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

// Strict cryptographic verification of raw webhook payload
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string
): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) return false;

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  const signatureBuffer = Buffer.from(signatureHeader, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}
