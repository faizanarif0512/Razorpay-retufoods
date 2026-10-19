'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Package,
  Clock,
  ShieldCheck,
  ArrowRight,
  Download,
  Truck,
  AlertCircle,
  Loader2,
  User,
  LogOut,
  RotateCcw,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Order } from '@/lib/db/service';

export default function OrderHistoryPage() {
  const [customer, setCustomer] = useState<{ id: string; name: string; email: string; phone: string } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cancellation modal state
  const [selectedCancelOrder, setSelectedCancelOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('Ordered by mistake');
  const [customReason, setCustomReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);

  // Manual lookup state (if guest/unauthenticated lookup is used)
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

  useEffect(() => {
    async function loadCustomerAndOrders() {
      try {
        const authRes = await fetch('/api/customer/me');
        if (authRes.ok) {
          const authData = await authRes.json();
          if (authData.authenticated && authData.customer) {
            setCustomer(authData.customer);

            // Fetch authenticated orders
            setLoadingOrders(true);
            const ordersRes = await fetch('/api/customer/orders');
            if (ordersRes.ok) {
              const ordersData = await ordersRes.json();
              setOrders(ordersData.orders || []);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching customer account orders', err);
      } finally {
        setCheckingAuth(false);
        setLoadingOrders(false);
      }
    }
    loadCustomerAndOrders();
  }, []);

  const handleManualLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lookupEmail.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setLookupLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/orders/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: lookupEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to retrieve orders');
      }
      setOrders(data.orders || []);
    } catch (err: any) {
      setError(err.message || 'Lookup failed');
      setOrders([]);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/customer/logout', { method: 'POST' });
      setCustomer(null);
      setOrders([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmCancellation = async () => {
    if (!selectedCancelOrder) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const reasonToSend = cancelReason === 'Other' ? customReason || 'Other reason' : cancelReason;
      const res = await fetch(`/api/customer/orders/${selectedCancelOrder.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reasonToSend }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Cancellation request failed');
      }

      setCancelSuccess(data.message);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === selectedCancelOrder.id
            ? {
                ...o,
                cancellation_status: 'requested',
                cancellation_reason: reasonToSend,
                cancellation_requested_at: new Date().toISOString(),
              }
            : o
        )
      );
      setTimeout(() => {
        setSelectedCancelOrder(null);
        setCancelSuccess(null);
      }, 4000);
    } catch (err: any) {
      setCancelError(err.message || 'Failed to submit cancellation request');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="bg-retu-warm-white/40 min-h-[85vh] py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-retu-pink">Customer Account</span>
          <h1 className="text-3xl font-extrabold text-retu-charcoal tracking-tight mt-1">
            Order History & Tracking
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-2">
            View your permanent orders, cold-chain shipment dispatches, and download official GST tax invoices.
          </p>
        </div>

        {/* Authenticated Customer Banner */}
        {checkingAuth ? (
          <div className="bg-white rounded-2xl border border-retu-border p-6 shadow-sm mb-10 max-w-xl mx-auto text-center flex items-center justify-center gap-2 text-xs text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin text-retu-pink" />
            <span>Verifying customer account...</span>
          </div>
        ) : customer ? (
          <div className="bg-white rounded-2xl border border-retu-border p-5 shadow-sm mb-10 max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-retu-charcoal text-white flex items-center justify-center font-bold text-sm">
                {customer.name.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-bold text-retu-charcoal">{customer.name}</p>
                <p className="text-[11px] text-gray-500">{customer.email} · {customer.phone}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-red-600 font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-retu-border p-6 shadow-sm mb-10 max-w-xl mx-auto text-center space-y-4">
            <User className="w-8 h-8 text-retu-pink mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-retu-charcoal">Sign In to Your Permanent Account</h3>
              <p className="text-xs text-gray-500 mt-1">
                Log in to see all your past orders, delivery tracking, and downloaded invoices.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-1">
              <Link
                href="/store/account/login?redirect=/store/account/orders"
                className="px-5 py-2.5 bg-retu-charcoal text-white text-xs font-bold rounded-xl hover:bg-black transition-colors"
              >
                Sign In to Account
              </Link>
              <Link
                href="/store/account/register?redirect=/store/account/orders"
                className="px-5 py-2.5 bg-retu-warm-white text-retu-charcoal border border-retu-border text-xs font-bold rounded-xl hover:bg-white transition-colors"
              >
                Create Account
              </Link>
            </div>

            <div className="pt-4 border-t border-retu-border">
              <p className="text-[11px] text-gray-400 mb-2">Or quickly search by email address:</p>
              <form onSubmit={handleManualLookup} className="flex gap-2">
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={lookupEmail}
                  onChange={(e) => setLookupEmail(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-retu-border rounded-lg text-xs"
                />
                <button
                  type="submit"
                  disabled={lookupLoading}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg text-xs font-semibold hover:bg-black disabled:opacity-50"
                >
                  {lookupLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Find'}
                </button>
              </form>
              {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
            </div>
          </div>
        )}

        {/* Orders Results */}
        {loadingOrders ? (
          <div className="text-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-retu-pink mx-auto mb-2" />
            <p className="text-xs text-gray-500">Loading your order history...</p>
          </div>
        ) : orders.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-retu-border">
              <h2 className="text-sm font-bold text-retu-charcoal uppercase tracking-wider">
                Your Orders ({orders.length})
              </h2>
              <span className="text-xs text-gray-500">Ordered by date</span>
            </div>

            {orders.map((order) => {
              const dateStr = new Date(order.created_at).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-retu-border p-6 shadow-sm hover:shadow-md transition-shadow space-y-4"
                >
                  {/* Order Card Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
                    <div>
                      <span className="text-xs text-gray-500">Reference:</span>{' '}
                      <span className="font-mono font-bold text-retu-charcoal text-sm">
                        {order.order_reference}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          order.payment_status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.payment_status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        Payment: {order.payment_status}
                      </span>

                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          order.fulfilment_status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.fulfilment_status === 'shipped'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        Dispatch: {order.fulfilment_status}
                      </span>
                    </div>
                  </div>

                  {/* Order Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
                    <div>
                      <p className="text-gray-400">Order Placed</p>
                      <p className="font-semibold text-retu-charcoal">{dateStr}</p>
                    </div>

                    <div>
                      <p className="text-gray-400">Total Amount</p>
                      <p className="font-bold text-retu-charcoal text-sm">
                        ₹{(order.total_paise / 100).toFixed(2)}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-400">Shipped To</p>
                      <p className="font-semibold text-retu-charcoal truncate">
                        {order.shipping_city}, {order.shipping_state}
                      </p>
                    </div>
                  </div>

                  {/* Items Ordered List */}
                  <div className="pt-2 border-t border-gray-100 space-y-2">
                    {(order.items || []).map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="font-medium text-retu-charcoal">
                            {item.product_name} ({item.variant_name})
                          </span>
                          <span className="text-gray-400">× {item.quantity}</span>
                        </div>
                        <span className="font-semibold text-gray-700">
                          ₹{(item.total_price_paise / 100).toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Cold-Chain Tracking if available */}
                  {order.tracking_number && (
                    <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>
                          <strong>Tracking:</strong> {order.tracking_carrier || 'Cold-Chain Express'} :{' '}
                          <code>{order.tracking_number}</code>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Cancellation Request Pending Notice */}
                  {order.cancellation_status === 'requested' && (
                    <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                          <p className="font-bold text-amber-900">Cancellation & Refund Request Under Review</p>
                          <p className="text-[11px] text-amber-700 mt-0.5">
                            Reason: {order.cancellation_reason || 'Customer request'} · An intimation email has been dispatched to your inbox. Our admin team will verify cold-chain fulfillment and process your refund upon approval.
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-amber-800 text-[11px] bg-white/80 px-2.5 py-1 rounded-md border border-amber-200 self-start sm:self-auto">
                        Pending Admin Approval
                      </span>
                    </div>
                  )}

                  {/* Cancellation Rejected Notice */}
                  {order.cancellation_status === 'rejected' && (
                    <div className="p-3 bg-rose-50/90 rounded-xl border border-rose-200 text-xs text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <div>
                          <p className="font-bold text-rose-900">Cancellation Request Not Approved</p>
                          <p className="text-[11px] text-rose-700 mt-0.5">
                            {order.cancellation_admin_notes || 'This shipment has already been packed and dispatched under cold-chain refrigeration.'}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-rose-800 text-[11px] bg-white/80 px-2.5 py-1 rounded-md border border-rose-200 self-start sm:self-auto">
                        Active for Delivery
                      </span>
                    </div>
                  )}

                  {/* Direct Admin Cancellation (No refund or unpaid) */}
                  {order.fulfilment_status === 'cancelled' && order.payment_status !== 'refunded' && (
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-gray-500 shrink-0" />
                      <div>
                        <p className="font-bold text-gray-800">Order Cancelled</p>
                        <p className="text-[11px] text-gray-600">This order was cancelled by the store administrator.</p>
                      </div>
                    </div>
                  )}

                  {/* Refund Notice if order has been refunded */}
                  {order.payment_status === 'refunded' && (
                    <div className="p-3 bg-red-50/90 rounded-xl border border-red-200 text-xs text-red-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <RotateCcw className="w-4 h-4 text-red-600 shrink-0" />
                        <div>
                          <p className="font-bold text-red-800">Order Cancelled & Refund Initiated</p>
                          {order.refunds && order.refunds[0] && (
                            <p className="text-[11px] text-red-700 mt-0.5">
                              Razorpay Refund Ref: <code>{order.refunds[0].razorpay_refund_id || 'Processed'}</code>
                              {order.refunds[0].reason ? ` · Reason: ${order.refunds[0].reason}` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="font-bold text-red-800 text-xs bg-white/80 px-2.5 py-1 rounded-md border border-red-200 self-start sm:self-auto">
                        Refund: ₹{(order.total_paise / 100).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {/* Card actions */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-gray-100">
                    <Link
                      href={`/store/order-confirmation/${order.order_reference}`}
                      className="font-bold text-retu-charcoal hover:text-retu-pink flex items-center gap-1 transition-colors"
                    >
                      <span>View Full Order Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    <div className="flex items-center gap-2">
                      {order.payment_status === 'paid' &&
                        !order.cancellation_status &&
                        (order.fulfilment_status === 'pending' ||
                          order.fulfilment_status === 'confirmed' ||
                          order.fulfilment_status === 'processing') && (
                          <button
                            onClick={() => {
                              setSelectedCancelOrder(order);
                              setCancelError(null);
                              setCancelSuccess(null);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-amber-800 hover:text-white hover:bg-amber-700 border border-amber-300 hover:border-amber-700 rounded-lg font-semibold transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Request Cancellation</span>
                          </button>
                        )}

                      {order.cancellation_status === 'requested' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Review in Progress</span>
                        </span>
                      )}

                      {order.payment_status === 'paid' && (
                        <a
                          href={`/api/invoices/${order.id}?format=pdf`}
                          download
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-retu-warm-white hover:bg-retu-charcoal hover:text-white border border-retu-border rounded-lg font-semibold text-retu-charcoal transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Tax Invoice (PDF)</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : customer ? (
          <div className="bg-white rounded-2xl border border-retu-border p-12 text-center max-w-md mx-auto space-y-4">
            <Package className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="text-base font-bold text-retu-charcoal">No Orders Placed Yet</h3>
            <p className="text-xs text-gray-500">
              When you purchase mi-biotics™ gut shots, your verified orders and shipment tracking will appear here permanently.
            </p>
            <div className="pt-2">
              <Link
                href="/store/products"
                className="inline-flex items-center gap-2 px-6 py-3 bg-retu-charcoal text-white rounded-xl text-xs font-bold hover:bg-black transition-colors"
              >
                <span>Shop mi-biotics™ Collection</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : null}

      </div>

      {/* Customer Pre-Dispatch Cancellation Modal */}
      {selectedCancelOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl border border-gray-100">
            <div className="flex justify-between items-start pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  Pre-Dispatch Review
                </span>
                <h3 className="text-lg font-black text-retu-charcoal">
                  Request Cancellation ({selectedCancelOrder.order_reference})
                </h3>
              </div>
              <button
                onClick={() => setSelectedCancelOrder(null)}
                disabled={cancelling}
                className="p-1 text-gray-400 hover:text-black rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cancelSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-emerald-900 text-sm">Cancellation Request Received</h4>
                <p className="text-xs text-emerald-800 leading-relaxed">{cancelSuccess}</p>
                <p className="text-[11px] text-emerald-700">An intimation email has been dispatched to your inbox.</p>
              </div>
            ) : (
              <>
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-2">
                  <p className="font-bold text-amber-900">Cold-Chain Review & Refund Policy</p>
                  <p className="text-amber-800 leading-relaxed">
                    Because mi-biotics™ is an active live probiotic shipped in cold-chain containers, cancellation requests are verified against warehouse dispatch status before issuing a refund.
                  </p>
                  <p className="font-semibold text-amber-900 pt-1">
                    Refund Amount: ₹{(selectedCancelOrder.total_paise / 100).toFixed(2)} (via Razorpay to original payment method upon approval)
                  </p>
                </div>

                {cancelError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{cancelError}</span>
                  </div>
                )}

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Reason for Cancellation</label>
                    <select
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-black"
                    >
                      <option value="Ordered by mistake">Ordered by mistake</option>
                      <option value="Change of travel plans or delivery address">Change of travel plans or delivery address</option>
                      <option value="Want to switch to a different pack or flavor">Want to switch to a different pack or flavor</option>
                      <option value="Found an alternate product">Found an alternate product</option>
                      <option value="Other">Other reason</option>
                    </select>
                  </div>

                  {cancelReason === 'Other' && (
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Please specify</label>
                      <textarea
                        rows={2}
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        placeholder="Briefly describe the reason for cancellation..."
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-black"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setSelectedCancelOrder(null)}
                    disabled={cancelling}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-black rounded-lg"
                  >
                    Keep Order
                  </button>

                  <button
                    onClick={handleConfirmCancellation}
                    disabled={cancelling}
                    className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    {cancelling ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Submitting Request...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Submit Cancellation Request</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
