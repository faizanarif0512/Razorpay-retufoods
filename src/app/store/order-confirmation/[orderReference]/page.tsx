import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { CheckCircle2, ShieldCheck, Download, Printer, Truck, ArrowRight, AlertTriangle } from 'lucide-react';
import { getOrderByReference, getInvoiceByOrderId } from '@/lib/db/service';

export const dynamic = 'force-dynamic';

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderReference: string }>;
}) {
  const { orderReference } = await params;
  const order = await getOrderByReference(orderReference);

  if (!order) {
    notFound();
  }

  const invoice = await getInvoiceByOrderId(order.id);
  const isPaid = order.payment_status === 'paid';

  return (
    <div className="bg-retu-warm-white/40 min-h-[85vh] py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Confirmation Card */}
        <div className="bg-white rounded-3xl border border-retu-border p-8 sm:p-12 shadow-sm space-y-8">
          
          {/* Status Header */}
          <div className="text-center space-y-3 pb-8 border-b border-retu-border">
            {isPaid ? (
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mx-auto">
                <AlertTriangle className="w-10 h-10" />
              </div>
            )}

            <span className="text-xs font-bold uppercase tracking-widest text-retu-pink">
              DancingEarth Food Private Limited
            </span>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-retu-charcoal tracking-tight">
              {isPaid ? 'Payment Verified & Order Confirmed' : 'Order Awaiting Payment Verification'}
            </h1>

            <p className="text-sm text-gray-600 max-w-lg mx-auto">
              Thank you, <strong>{order.customer_name}</strong>! Your order reference is{' '}
              <span className="font-mono font-bold text-retu-charcoal bg-gray-100 px-2 py-0.5 rounded">
                {order.order_reference}
              </span>
              . An order confirmation and invoice receipt have been sent to <strong>{order.customer_email}</strong>.
            </p>
          </div>

          {/* Key Order Meta Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-retu-warm-white text-xs">
            <div>
              <p className="text-gray-500">Order Reference</p>
              <p className="font-bold text-retu-charcoal text-sm mt-0.5">{order.order_reference}</p>
            </div>
            <div>
              <p className="text-gray-500">Payment Status</p>
              <p className={`font-bold text-sm mt-0.5 capitalize ${isPaid ? 'text-emerald-700' : 'text-amber-700'}`}>
                {order.payment_status}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Fulfilment Status</p>
              <p className="font-bold text-retu-charcoal text-sm mt-0.5 capitalize">
                {order.fulfilment_status}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Total Paid</p>
              <p className="font-black text-retu-charcoal text-sm mt-0.5">
                ₹{(order.total_paise / 100).toFixed(0)}
              </p>
            </div>
          </div>

          {/* Line items */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-retu-charcoal">Purchased Products</h3>
            <div className="divide-y divide-gray-100 border border-retu-border rounded-xl p-4 bg-gray-50/50">
              {(order.items || []).map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded bg-white shrink-0 overflow-hidden border border-gray-200">
                      <Image
                        src={item.image_url || '/images/products/mibiotics-mango.png'}
                        alt={item.product_name}
                        fill
                        className="object-contain p-1"
                      />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-retu-charcoal">{item.product_name}</h4>
                      <p className="text-[11px] text-gray-500">
                        {item.variant_name} · Qty: {item.quantity}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-xs text-retu-charcoal">
                    ₹{(item.total_price_paise / 100).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping & Payment Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-retu-border text-xs text-gray-600">
            <div className="space-y-1">
              <h4 className="font-bold text-retu-charcoal uppercase tracking-wider text-[11px]">
                Cold-Chain Delivery Address
              </h4>
              <p>{order.customer_name}</p>
              <p>{order.shipping_address_line1}</p>
              {order.shipping_address_line2 && <p>{order.shipping_address_line2}</p>}
              <p>{order.shipping_city}, {order.shipping_state} - {order.shipping_postal_code}</p>
              <p>Phone: {order.customer_phone}</p>
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-retu-charcoal uppercase tracking-wider text-[11px]">
                Payment & Invoice Details
              </h4>
              <p>Gateway: Razorpay Standard Checkout</p>
              <p>Razorpay Order ID: <code className="font-mono">{order.razorpay_order_id || 'N/A'}</code></p>
              <p>Payment ID: <code className="font-mono">{order.razorpay_payment_id || 'Verified'}</code></p>
              {invoice && (
                <p>Tax Invoice: <strong className="text-retu-charcoal">{invoice.invoice_number}</strong></p>
              )}
            </div>
          </div>

          {/* Actions & Invoice Link */}
          <div className="pt-6 border-t border-retu-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {invoice ? (
                <a
                  href={`/api/invoices/${order.id}?format=pdf`}
                  download={`Tax-Invoice-${invoice.invoice_number}.pdf`}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Invoice (PDF)</span>
                </a>
              ) : null}

              <Link
                href="/store/account/orders"
                className="px-4 py-2.5 border border-retu-border hover:bg-gray-50 text-retu-charcoal rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <span>View Order History</span>
              </Link>
            </div>

            <Link
              href="/store"
              className="px-6 py-2.5 bg-retu-charcoal hover:bg-black text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-sm w-full sm:w-auto justify-center"
            >
              <span>Back to Store</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Care note */}
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Next Steps for Your Order</p>
              <p className="mt-0.5 text-emerald-800">
                Our operations team in Bengaluru and Coimbatore is packing your order in insulated cold-chain boxes. You will receive courier SMS tracking updates as soon as the dispatch is registered.
                Need help? Contact <a href="mailto:faizan.loyola@gmail.com" className="underline font-semibold">faizan.loyola@gmail.com</a> or call 011-69269668.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
