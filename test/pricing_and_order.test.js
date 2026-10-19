const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

// Set env for tests
process.env.DATABASE_TYPE = 'sqlite';
process.env.SQLITE_DB_PATH = './data/retufoods_test.db';

// Require compiled or built services
// In Node 22+, ts-node or direct import via transpiled or tsx/node
const {
  getDb,
  hashPassword,
  verifyPassword,
} = require('../src/lib/db/index.ts');
const {
  getAllProducts,
  getProductBySlug,
  validateCartItems,
  createOrderWithReservation,
  getOrderById,
  getOrderByReference,
  markOrderPaid,
  getInvoiceByOrderId,
  generateOrderReference,
} = require('../src/lib/db/service.ts');

test('Database and Authentication tests', async (t) => {
  await t.test('Should hash and verify passwords correctly', () => {
    const { hash, salt } = hashPassword('MySecureAdminPass123!');
    assert.strictEqual(verifyPassword('MySecureAdminPass123!', hash, salt), true);
    assert.strictEqual(verifyPassword('WrongPass', hash, salt), false);
  });

  await t.test('Should initialize database and load seeded products', () => {
    const db = getDb();
    assert.ok(db, 'DB instance should exist');

    const products = getAllProducts(false);
    assert.ok(products.length >= 3, 'Should have at least 3 products (Mango, Lychee, Duo)');

    const mango = getProductBySlug('mibiotics-mango');
    assert.ok(mango, 'Alphonso Mango product should exist');
    assert.strictEqual(mango.flavor, 'Alphonso Mango');
    assert.ok(mango.variants.length >= 3, 'Mango should have at least 3 pack variants');
  });

  await t.test('Should independently validate cart prices from database and calculate correct totals', () => {
    const mango = getProductBySlug('mibiotics-mango');
    const sixPack = mango.variants.find((v) => v.pack_size === 6);

    // 1 unit of 6-pack (₹540 = 54000 paise) -> Subtotal < ₹999 -> Shipping should be ₹99 (9900 paise)
    const result1 = validateCartItems([{ variant_id: sixPack.id, quantity: 1 }]);
    assert.strictEqual(result1.valid, true);
    assert.strictEqual(result1.subtotal_paise, 54000);
    assert.strictEqual(result1.shipping_paise, 9900);
    assert.strictEqual(result1.total_paise, 63900);

    // 2 units of 6-pack (₹1,080 = 108000 paise) -> Subtotal >= ₹999 -> FREE shipping!
    const result2 = validateCartItems([{ variant_id: sixPack.id, quantity: 2 }]);
    assert.strictEqual(result2.valid, true);
    assert.strictEqual(result2.subtotal_paise, 108000);
    assert.strictEqual(result2.shipping_paise, 0);
    assert.strictEqual(result2.total_paise, 108000);
  });

  await t.test('Should reject invalid items or negative quantities', () => {
    const resNegative = validateCartItems([{ variant_id: 'var_mango_6p', quantity: -2 }]);
    assert.strictEqual(resNegative.valid, false);

    const resNonExistent = validateCartItems([{ variant_id: 'fake_variant_id', quantity: 1 }]);
    assert.strictEqual(resNonExistent.valid, false);
  });

  await t.test('Should create an order atomically, reserve stock, and generate order reference', () => {
    const mango = getProductBySlug('mibiotics-mango');
    const sixPack = mango.variants.find((v) => v.pack_size === 6);
    const initialStock = sixPack.stock_quantity;

    const { order, razorpayAmountPaise } = createOrderWithReservation({
      customer_name: 'Test Customer',
      customer_email: 'customer@test.com',
      customer_phone: '9876543210',
      shipping_address_line1: '123 Indiranagar',
      shipping_city: 'Bengaluru',
      shipping_state: 'Karnataka',
      shipping_postal_code: '560038',
      items: [{ variant_id: sixPack.id, quantity: 2 }],
    });

    assert.ok(order.id);
    assert.ok(order.order_reference.startsWith('RETU-'));
    assert.strictEqual(order.payment_status, 'pending');
    assert.strictEqual(order.fulfilment_status, 'pending');
    assert.strictEqual(razorpayAmountPaise, 108000);

    // Verify stock was atomically decremented
    const updatedMango = getProductBySlug('mibiotics-mango');
    const updatedSixPack = updatedMango.variants.find((v) => v.pack_size === 6);
    assert.strictEqual(updatedSixPack.stock_quantity, initialStock - 2);

    // Verify immutable line items
    const savedOrder = getOrderById(order.id);
    assert.strictEqual(savedOrder.items.length, 1);
    assert.strictEqual(savedOrder.items[0].quantity, 2);
    assert.strictEqual(savedOrder.items[0].unit_price_paise, sixPack.price_paise);
  });

  await t.test('Should mark order as paid and generate tax invoice', () => {
    const mango = getProductBySlug('mibiotics-mango');
    const sixPack = mango.variants.find((v) => v.pack_size === 6);

    const { order } = createOrderWithReservation({
      customer_name: 'Payment Test Customer',
      customer_email: 'paytest@test.com',
      customer_phone: '9876543210',
      shipping_address_line1: '456 MG Road',
      shipping_city: 'Bengaluru',
      shipping_state: 'Karnataka',
      shipping_postal_code: '560001',
      items: [{ variant_id: sixPack.id, quantity: 1 }],
    });

    const paidOrder = markOrderPaid(order.id, 'pay_test_payment_123', 'sig_test_123');
    assert.strictEqual(paidOrder.payment_status, 'paid');
    assert.strictEqual(paidOrder.fulfilment_status, 'confirmed');

    const invoice = getInvoiceByOrderId(order.id);
    assert.ok(invoice, 'Tax invoice should be generated upon payment');
    assert.ok(invoice.invoice_number.startsWith('RETU-INV-'));
    assert.strictEqual(invoice.total_paise, paidOrder.total_paise);
  });
});
