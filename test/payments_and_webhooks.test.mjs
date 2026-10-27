import test from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';

process.env.DATABASE_TYPE = 'sqlite';
process.env.SQLITE_DB_PATH = './data/retufoods_test.db';
process.env.RAZORPAY_KEY_SECRET = 'test_secret_key_12345';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret_67890';
process.env.ADMIN_SESSION_SECRET = 'test_admin_session_secret_32_characters_minimum!';

import {
  createRazorpayOrder,
  createRazorpayRefund,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from '../src/lib/payments/razorpay.ts';

import {
  createOrderWithReservation,
  attachRazorpayOrderId,
  getOrderById,
  markOrderPaid,
  recordWebhookEvent,
  isWebhookProcessed,
  markWebhookProcessed,
  getOrdersByCustomerEmail,
  createOrderRefund,
  getRefundsByOrderId,
  getVariantById,
  markOrderPaymentFailed,
  requestOrderCancellation,
  rejectOrderCancellation,
  adminCancelOrder,
} from '../src/lib/db/service.ts';

import {
  createAdminToken,
  verifyAdminToken,
  authenticateAdminCredentials,
} from '../src/lib/auth/admin.ts';

import { generateInvoicePdfBuffer } from '../src/lib/invoices/pdf.ts';

test('Payment, Webhooks, Idempotency and Security tests', async (t) => {
  await t.test('Should generate a Razorpay order with exact payable amount and currency', async () => {
    const res = await createRazorpayOrder({
      amountPaise: 54000,
      currency: 'INR',
      receipt: 'RETU-TEST-001',
    });

    assert.ok(res.razorpayOrderId);
    assert.strictEqual(res.amountPaise, 54000);
    assert.strictEqual(res.currency, 'INR');
  });

  await t.test('Should cryptographically verify valid payment signatures and reject invalid ones', () => {
    const orderId = 'order_test_98765';
    const paymentId = 'pay_test_54321';

    // Generate valid HMAC signature with configured secret
    const validSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const isValid = verifyPaymentSignature({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: validSignature,
    });
    assert.strictEqual(isValid, true, 'Valid HMAC signature must be accepted');

    // Tampered payment ID
    const isTampered = verifyPaymentSignature({
      razorpayOrderId: orderId,
      razorpayPaymentId: 'pay_tampered_id',
      razorpaySignature: validSignature,
    });
    assert.strictEqual(isTampered, false, 'Tampered payment ID must be rejected');

    // Tampered signature
    const isWrongSig = verifyPaymentSignature({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: 'deadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678',
    });
    assert.strictEqual(isWrongSig, false, 'Invalid signature must be rejected');
  });

  await t.test('Should cryptographically verify raw webhook body signatures', () => {
    const rawBody = JSON.stringify({ event: 'payment.captured', id: 'evt_123' });
    const validWebhookSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    assert.strictEqual(
      verifyWebhookSignature(rawBody, validWebhookSig),
      true,
      'Authentic raw webhook signature must pass'
    );

    assert.strictEqual(
      verifyWebhookSignature(rawBody, 'invalid_signature_hex'),
      false,
      'Invalid webhook signature must fail'
    );
  });

  await t.test('Should handle webhook events idempotently and prevent duplicate processing', async () => {
    const eventId = `evt_dedup_${Date.now()}`;
    assert.strictEqual(isWebhookProcessed(eventId), false);

    await recordWebhookEvent(eventId, 'payment.captured', { test: true });
    await markWebhookProcessed(eventId);

    // After processing, must be recognized as processed
    assert.strictEqual(isWebhookProcessed(eventId), true);

    // Duplicate event recording must not throw
    await recordWebhookEvent(eventId, 'payment.captured', { test: true });
    assert.strictEqual(isWebhookProcessed(eventId), true);
  });

  await t.test('Should enforce customer order separation by email', async () => {
    const emailA = `cust_a_${Date.now()}@example.com`;
    const emailB = `cust_b_${Date.now()}@example.com`;

    await createOrderWithReservation({
      customer_name: 'Customer A',
      customer_email: emailA,
      customer_phone: '9999999991',
      shipping_address_line1: 'Road A',
      shipping_city: 'Bengaluru',
      shipping_state: 'Karnataka',
      shipping_postal_code: '560038',
      items: [{ variant_id: 'var_mango_6p', quantity: 1 }],
    });

    const ordersA = await getOrdersByCustomerEmail(emailA);
    const ordersB = await getOrdersByCustomerEmail(emailB);

    assert.strictEqual(ordersA.length, 1);
    assert.strictEqual(ordersB.length, 0, 'Customer B must not see Customer A orders');
  });

  await t.test('Should generate and verify admin session tokens securely', () => {
    const session = {
      adminId: 'admin_test_01',
      email: 'admin@retufoods.com',
      role: 'admin',
      name: 'Administrator',
    };

    const token = createAdminToken(session);
    assert.ok(token);

    const verified = verifyAdminToken(token);
    assert.ok(verified);
    assert.strictEqual(verified.email, 'admin@retufoods.com');
    assert.strictEqual(verified.role, 'admin');

    // Tampered token
    const tampered = token.slice(0, -4) + 'abcd';
    assert.strictEqual(verifyAdminToken(tampered), null);
  });

  await t.test('Should generate valid PDF buffer for tax invoices with proper headers', async () => {
    const mockOrder = {
      order_reference: 'RETU-26-PDF01',
      customer_name: 'Test Customer',
      customer_email: 'faizan.loyola@gmail.com',
      customer_phone: '9876543210',
      shipping_address_line1: '123 Test Street',
      shipping_city: 'Bengaluru',
      shipping_state: 'Karnataka',
      shipping_postal_code: '560038',
      razorpay_payment_id: 'pay_test_pdf_01',
      items: [
        {
          product_name: 'mi-biotics Alphonso Mango',
          variant_name: '7-Day Starter Pack',
          sku: 'MB-MNG-7P',
          quantity: 1,
          unit_price_paise: 149900,
          total_price_paise: 149900,
        },
      ],
    };

    const mockInvoice = {
      invoice_number: 'RETU-INV-2026-9999',
      invoice_date: '2026-10-11',
      company_name: 'DancingEarth Food Private Limited',
      company_address: 'Bengaluru, India',
      gstin: 'CONSUMER',
      customer_name: 'Test Customer',
      customer_email: 'faizan.loyola@gmail.com',
      customer_address: '123 Test Street, Bengaluru',
      subtotal_paise: 149900,
      tax_paise: 0,
      shipping_paise: 0,
      total_paise: 149900,
    };

    const pdfBuffer = await generateInvoicePdfBuffer(mockOrder, mockInvoice);
    assert.ok(pdfBuffer instanceof Buffer);
    assert.ok(pdfBuffer.length > 500, 'PDF buffer should be substantial');
    assert.strictEqual(pdfBuffer.slice(0, 4).toString('utf-8'), '%PDF', 'PDF buffer must start with %PDF magic header');
  });

  await t.test('Should execute order refund atomically, restock inventory, and update order status', async () => {
    // 1. Create paid order with reserved variant
    const { order } = await createOrderWithReservation({
      customer_name: 'Refund Test Customer',
      customer_email: `refund_${Date.now()}@example.com`,
      customer_phone: '9876543210',
      shipping_address_line1: '456 Probiotic Way',
      shipping_city: 'Bengaluru',
      shipping_state: 'Karnataka',
      shipping_postal_code: '560038',
      items: [{ variant_id: 'var_mango_6p', quantity: 2 }],
    });

    const initialVariant = await getVariantById('var_mango_6p');
    const initialStock = initialVariant.stock_quantity;

    await attachRazorpayOrderId(order.id, 'order_rzp_mock_123');
    await markOrderPaid(order.id, 'pay_rzp_mock_123');

    // 2. Issue full refund with restock = true
    const refund = await createOrderRefund({
      orderId: order.id,
      razorpayRefundId: 'rfnd_test_999',
      razorpayPaymentId: 'pay_rzp_mock_123',
      amountPaise: order.total_paise,
      reason: 'Customer cancelled prior to courier dispatch',
      initiatedBy: 'customer',
      restock: true,
      notes: 'Automated test refund',
    });

    assert.ok(refund.id);
    assert.strictEqual(refund.amount_paise, order.total_paise);
    assert.strictEqual(refund.status, 'processed');
    assert.strictEqual(refund.restocked, 1);

    // 3. Verify order was transitioned to refunded and cancelled
    const updatedOrder = await getOrderById(order.id);
    assert.strictEqual(updatedOrder.payment_status, 'refunded');
    assert.strictEqual(updatedOrder.fulfilment_status, 'cancelled');

    // 4. Verify inventory was restored
    const restockedVariant = await getVariantById('var_mango_6p');
    assert.strictEqual(
      restockedVariant.stock_quantity,
      initialStock + 2,
      'Stock quantity should be increased by quantity of cancelled items'
    );

    // 5. Verify refund is linked to order
    const refunds = await getRefundsByOrderId(order.id);
    assert.strictEqual(refunds.length, 1);
    assert.strictEqual(refunds[0].razorpay_refund_id, 'rfnd_test_999');
  });

  await t.test('Should handle Razorpay refund simulation safely in test mode', async () => {
    const res = await createRazorpayRefund({
      paymentId: 'pay_simulated_777',
      amountPaise: 149900,
      notes: { order_reference: 'RETU-26-TESTREFUND' },
    });

    assert.ok(res.success, 'Test refund should succeed');
    assert.ok(res.refundId.startsWith('rfnd_'), 'Refund ID should follow Razorpay format');
  });

  await t.test('Should restore inventory stock when payment fails or is abandoned', async () => {
    const initialVariant = await getVariantById('var_mango_6p');
    const initialStock = initialVariant.stock_quantity;

    // 1. Create order reserving 3 units
    const { order } = await createOrderWithReservation({
      customer_name: 'Fail Test User',
      customer_email: `fail_${Date.now()}@retufoods.com`,
      customer_phone: '9876543210',
      shipping_address_line1: 'Test Lab',
      shipping_city: 'Bengaluru',
      shipping_state: 'Karnataka',
      shipping_postal_code: '560038',
      items: [{ variant_id: 'var_mango_6p', quantity: 3 }],
    });

    // Verify stock was deducted upon reservation
    const reservedVariant = await getVariantById('var_mango_6p');
    assert.strictEqual(reservedVariant.stock_quantity, initialStock - 3);

    // 2. Mark order payment as failed / dismissed
    const failedOrder = await markOrderPaymentFailed(order.id, 'BAD_REQUEST', 'Customer dismissed modal');
    assert.ok(failedOrder);
    assert.strictEqual(failedOrder.payment_status, 'failed');
    assert.strictEqual(failedOrder.fulfilment_status, 'cancelled');
    assert.strictEqual(failedOrder.stock_restored, 1);

    // 3. Verify stock is restored
    const restoredVariant = await getVariantById('var_mango_6p');
    assert.strictEqual(restoredVariant.stock_quantity, initialStock, 'Stock must be fully restored upon payment failure');

    // 4. Calling markOrderPaymentFailed a second time must NOT double-restock
    await markOrderPaymentFailed(order.id, 'REPEAT_FAILURE', 'Second check');
    const idempotentVariant = await getVariantById('var_mango_6p');
    assert.strictEqual(idempotentVariant.stock_quantity, initialStock, 'Stock must not be double-restocked');
  });

  await t.test('Should support customer cancellation request and approval pipeline', async () => {
    // 1. Create a paid order
    const { order } = await createOrderWithReservation({
      customer_name: 'Pipeline Test',
      customer_email: `pipeline_${Date.now()}@retufoods.com`,
      customer_phone: '9876543210',
      shipping_address_line1: '456 MG Road',
      shipping_city: 'Bengaluru',
      shipping_state: 'Karnataka',
      shipping_postal_code: '560001',
      items: [{ variant_id: 'var_mango_6p', quantity: 1 }],
    });
    await markOrderPaid(order.id, 'pay_pipe_test_123');

    // 2. Customer requests cancellation
    const requested = await requestOrderCancellation(order.id, 'Ordered by mistake');
    assert.strictEqual(requested.cancellation_status, 'requested');
    assert.strictEqual(requested.cancellation_reason, 'Ordered by mistake');
    assert.strictEqual(requested.payment_status, 'paid', 'Payment status remains paid until admin approves');

    // 3. Admin rejects cancellation (e.g. cold-chain transit already started)
    const rejected = await rejectOrderCancellation(order.id, 'Package already with refrigerated courier', 'admin@retufoods.com');
    assert.strictEqual(rejected.cancellation_status, 'rejected');
    assert.strictEqual(rejected.cancellation_admin_notes, 'Package already with refrigerated courier');
    assert.strictEqual(rejected.fulfilment_status, 'confirmed', 'Order remains active for delivery');

    // 4. Admin direct cancellation on another order
    const adminCancel = await adminCancelOrder(order.id, {
      reason: 'Admin cancelled order manually',
      restock: true,
      adminEmail: 'admin@retufoods.com',
    });
    assert.strictEqual(adminCancel.fulfilment_status, 'cancelled');
    assert.strictEqual(adminCancel.stock_restored, 1);
  });

  await t.test('Should automatically generate refund and restore stock on admin cancellation of prepaid order', async () => {
    // 1. Create a prepaid order
    const { order } = await createOrderWithReservation({
      customer_name: 'Prepaid Admin Cancel Test',
      customer_email: `admin_cancel_${Date.now()}@retufoods.com`,
      customer_phone: '9876543210',
      shipping_address_line1: '789 Indiranagar 100ft Rd',
      shipping_city: 'Bengaluru',
      shipping_state: 'Karnataka',
      shipping_postal_code: '560038',
      items: [{ variant_id: 'var_mango_6p', quantity: 1 }],
    });

    const initialStock = (await getVariantById('var_mango_6p')).stock_quantity;
    const paymentId = 'pay_admin_cancel_test_123';
    await attachRazorpayOrderId(order.id, 'order_rzp_cancel_test_123');
    await markOrderPaid(order.id, paymentId);

    // 2. Simulate admin cancelling prepaid order with automated refund
    const refundRes = await createRazorpayRefund({
      paymentId: paymentId,
      amountPaise: order.total_paise,
      notes: { order_reference: order.order_reference, reason: 'Out of stock at local depot' },
    });
    assert.ok(refundRes.success);

    const refund = await createOrderRefund({
      orderId: order.id,
      razorpayRefundId: refundRes.refundId,
      razorpayPaymentId: paymentId,
      amountPaise: order.total_paise,
      reason: 'Out of stock at local depot',
      initiatedBy: 'admin',
      restock: true,
      notes: 'Admin cancelled order with automated refund',
    });

    const cancelledOrder = await adminCancelOrder(order.id, {
      reason: 'Out of stock at local depot',
      restock: false,
      adminEmail: 'admin@retufoods.com',
    });

    // 3. Verify final state
    assert.strictEqual(cancelledOrder.payment_status, 'refunded');
    assert.strictEqual(cancelledOrder.fulfilment_status, 'cancelled');
    assert.strictEqual(cancelledOrder.cancellation_status, 'approved');

    // 4. Verify inventory was restored back
    const finalStock = (await getVariantById('var_mango_6p')).stock_quantity;
    assert.strictEqual(finalStock, initialStock + 1);

    // 5. Verify refund record is persisted
    const recordedRefunds = await getRefundsByOrderId(order.id);
    assert.strictEqual(recordedRefunds.length, 1);
    assert.strictEqual(recordedRefunds[0].amount_paise, order.total_paise);
  });
});
