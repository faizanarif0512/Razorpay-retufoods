'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Lock, Loader2, AlertCircle, User, CheckCircle2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import RazorpayPaymentModal from '@/components/checkout/RazorpayPaymentModal';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotalPaise, clearCart } = useCart();

  // Customer Authentication state
  const [customer, setCustomer] = useState<{
    id: string;
    name: string;
    email: string;
    phone: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
  } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isExistingAccount, setIsExistingAccount] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_password: '',
    shipping_address_line1: '',
    shipping_address_line2: '',
    shipping_city: '',
    shipping_state: 'Karnataka',
    shipping_postal_code: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active Razorpay Modal State
  const [razorpayData, setRazorpayData] = useState<{
    orderId: string;
    orderReference: string;
    razorpayOrderId: string;
    amountPaise: number;
    currency: string;
    keyId: string;
    isSimulator: boolean;
    customer: {
      name: string;
      email: string;
      phone: string;
    };
  } | null>(null);

  const FREE_SHIPPING_THRESHOLD_PAISE = 99900;
  const isFreeShipping = subtotalPaise >= FREE_SHIPPING_THRESHOLD_PAISE;
  const shippingPaise = items.length === 0 ? 0 : isFreeShipping ? 0 : 9900;
  const totalPaise = subtotalPaise + shippingPaise;

  // Check if customer is logged in on mount
  useEffect(() => {
    async function checkCustomerAuth() {
      try {
        const res = await fetch('/api/customer/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.customer) {
            setCustomer(data.customer);
            setFormData((prev) => ({
              ...prev,
              customer_name: data.customer.name || '',
              customer_email: data.customer.email || '',
              customer_phone: data.customer.phone || '',
              shipping_address_line1: data.customer.address_line1 || prev.shipping_address_line1,
              shipping_address_line2: data.customer.address_line2 || prev.shipping_address_line2,
              shipping_city: data.customer.city || prev.shipping_city,
              shipping_state: data.customer.state || prev.shipping_state,
              shipping_postal_code: data.customer.postal_code || prev.shipping_postal_code,
            }));
          }
        }
      } catch (err) {
        console.error('Failed to verify customer session', err);
      } finally {
        setCheckingAuth(false);
      }
    }
    checkCustomerAuth();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setError('Your shopping cart is empty');
      return;
    }

    if (!customer && !formData.customer_password) {
      setError('Please create a password (min 6 characters) so your order is tied to your permanent account.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Request order creation & server-side validation
      const res = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.requiresLogin) {
          setIsExistingAccount(true);
        }
        throw new Error(data.error || 'Failed to create order');
      }

      // If account was created/logged in on the fly, update state
      if (data.customer && !customer) {
        setCustomer(data.customer);
      }

      // Step 2: Open Razorpay Checkout modal
      setRazorpayData({
        orderId: data.orderId,
        orderReference: data.orderReference,
        razorpayOrderId: data.razorpayOrderId,
        amountPaise: data.amountPaise,
        currency: data.currency,
        keyId: data.keyId,
        isSimulator: data.isSimulator,
        customer: data.customer,
      });
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Handle Payment Success Verification
  const handlePaymentSuccess = async (paymentId: string, signature: string) => {
    if (!razorpayData) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/checkout/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: razorpayData.orderId,
          razorpayOrderId: razorpayData.razorpayOrderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Payment verification failed on the server');
      }

      // Success: Clear cart & redirect to verified confirmation page
      clearCart();
      router.push(`/store/order-confirmation/${razorpayData.orderReference}`);
    } catch (err: any) {
      setError(err.message || 'Payment verification error. Please contact faizan.loyola@gmail.com.');
    } finally {
      setLoading(false);
      setRazorpayData(null);
    }
  };

  const handlePaymentFailure = async (errorDetails?: any) => {
    if (razorpayData?.orderId) {
      try {
        await fetch('/api/checkout/cancel-attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: razorpayData.orderId,
            reason: errorDetails?.description || 'Payment dismissed or declined',
            errorCode: errorDetails?.code || 'PAYMENT_FAILED',
          }),
        });
      } catch (e) {
        console.error('Failed to notify cancel attempt:', e);
      }
    }
    setError(
      `Payment attempt was cancelled or declined: ${errorDetails?.description || 'Transaction incomplete'}. Your items remain saved in your cart.`
    );
    setRazorpayData(null);
  };

  const handlePaymentClose = async () => {
    if (razorpayData?.orderId) {
      try {
        await fetch('/api/checkout/cancel-attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: razorpayData.orderId,
            reason: 'Customer closed payment window without completing transaction',
          }),
        });
      } catch (e) {
        console.error('Failed to restore stock on modal close:', e);
      }
    }
    setRazorpayData(null);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/customer/logout', { method: 'POST' });
      setCustomer(null);
      setFormData((prev) => ({
        ...prev,
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        customer_password: '',
      }));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-retu-warm-white/50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Header */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/store/products"
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-retu-charcoal transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Continue Shopping</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>256-Bit SSL Encrypted Checkout</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* LEFT COLUMN: Shipping & Customer Account Form */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Customer Account Status Box */}
            {checkingAuth ? (
              <div className="bg-white p-4 rounded-xl border border-retu-border animate-pulse flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                <span className="text-xs text-gray-500">Checking customer account status...</span>
              </div>
            ) : customer ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-emerald-950">Signed in as {customer.name}</p>
                      <span className="px-2 py-0.5 bg-emerald-200/60 text-emerald-800 text-[10px] font-bold rounded-full">
                        Permanent Account
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800 mt-0.5">{customer.email} · {customer.phone}</p>
                    <p className="text-[11px] text-emerald-700 mt-1">
                      This order will be permanently linked to your account for tracking and tax invoice downloads.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs text-emerald-900 underline font-semibold hover:text-black"
                >
                  Switch Account
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-retu-border p-5 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-retu-border mb-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-retu-pink" />
                    <span className="text-xs font-bold uppercase tracking-wider text-retu-charcoal">
                      Customer Account Required
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsExistingAccount(!isExistingAccount)}
                    className="text-xs font-semibold text-retu-pink hover:underline"
                  >
                    {isExistingAccount ? 'Need a new account? Register' : 'Already have an account? Sign In'}
                  </button>
                </div>
                <p className="text-xs text-gray-600">
                  {isExistingAccount
                    ? 'Enter your account email and password below. Your saved details and past order history will be synchronized.'
                    : 'A permanent customer account will be created with your order. You can log in anytime to track live refrigerated dispatches and download GST tax invoices.'}
                </p>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Checkout Notice</p>
                  <p className="mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Main Form */}
            <form onSubmit={handleFormSubmit} className="space-y-6">
              
              {/* Contact Information */}
              <div className="bg-white rounded-2xl border border-retu-border p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-retu-charcoal uppercase tracking-wider border-b border-retu-border pb-3">
                  1. Contact Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      name="customer_name"
                      required
                      placeholder="e.g. Priyanshu Sharma"
                      value={formData.customer_name}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-retu-border rounded-lg text-xs text-retu-charcoal focus:bg-white focus:outline-none focus:border-retu-charcoal transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      name="customer_email"
                      required
                      placeholder="name@example.com"
                      value={formData.customer_email}
                      onChange={handleInputChange}
                      disabled={!!customer}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-retu-border rounded-lg text-xs text-retu-charcoal focus:bg-white focus:outline-none focus:border-retu-charcoal transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number (10 Digits) *</label>
                    <input
                      type="tel"
                      name="customer_phone"
                      required
                      placeholder="e.g. 9876543210"
                      value={formData.customer_phone}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-retu-border rounded-lg text-xs text-retu-charcoal focus:bg-white focus:outline-none focus:border-retu-charcoal transition-colors"
                    />
                  </div>

                  {!customer && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        {isExistingAccount ? 'Account Password *' : 'Create Account Password *'}
                      </label>
                      <input
                        type="password"
                        name="customer_password"
                        required={!customer}
                        minLength={6}
                        placeholder="Minimum 6 characters"
                        value={formData.customer_password}
                        onChange={handleInputChange}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-retu-border rounded-lg text-xs text-retu-charcoal focus:bg-white focus:outline-none focus:border-retu-charcoal transition-colors"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">
                        Stored securely forever for account access.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Cold-Chain Shipping Address */}
              <div className="bg-white rounded-2xl border border-retu-border p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-retu-charcoal uppercase tracking-wider border-b border-retu-border pb-3">
                  2. Cold-Chain Delivery Address
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Street Address / House / Flat No. *</label>
                    <input
                      type="text"
                      name="shipping_address_line1"
                      required
                      placeholder="e.g. Flat 402, Green Heights, 12th Main Road"
                      value={formData.shipping_address_line1}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-retu-border rounded-lg text-xs text-retu-charcoal focus:bg-white focus:outline-none focus:border-retu-charcoal transition-colors"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Landmark / Locality (Optional)</label>
                    <input
                      type="text"
                      name="shipping_address_line2"
                      placeholder="e.g. Near Metro Station / Behind Supermarket"
                      value={formData.shipping_address_line2}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-retu-border rounded-lg text-xs text-retu-charcoal focus:bg-white focus:outline-none focus:border-retu-charcoal transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">City *</label>
                    <input
                      type="text"
                      name="shipping_city"
                      required
                      placeholder="e.g. Bengaluru / Coimbatore"
                      value={formData.shipping_city}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-retu-border rounded-lg text-xs text-retu-charcoal focus:bg-white focus:outline-none focus:border-retu-charcoal transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">State *</label>
                    <select
                      name="shipping_state"
                      value={formData.shipping_state}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-retu-border rounded-lg text-xs text-retu-charcoal focus:bg-white focus:outline-none focus:border-retu-charcoal transition-colors"
                    >
                      <option value="Karnataka">Karnataka</option>
                      <option value="Tamil Nadu">Tamil Nadu</option>
                      <option value="Maharashtra">Maharashtra</option>
                      <option value="Delhi">Delhi</option>
                      <option value="Telangana">Telangana</option>
                      <option value="Kerala">Kerala</option>
                      <option value="Gujarat">Gujarat</option>
                      <option value="Andhra Pradesh">Andhra Pradesh</option>
                      <option value="Haryana">Haryana</option>
                      <option value="West Bengal">West Bengal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">PIN Code *</label>
                    <input
                      type="text"
                      name="shipping_postal_code"
                      required
                      maxLength={6}
                      placeholder="e.g. 560038"
                      value={formData.shipping_postal_code}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-retu-border rounded-lg text-xs text-retu-charcoal focus:bg-white focus:outline-none focus:border-retu-charcoal transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Country</label>
                    <input
                      type="text"
                      disabled
                      value="India"
                      className="w-full px-3.5 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-xs text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Order Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Special Delivery Notes (Optional)</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="e.g. Call upon arrival; refrigerate package immediately upon delivery."
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-retu-border rounded-lg text-xs text-retu-charcoal focus:bg-white focus:outline-none focus:border-retu-charcoal transition-colors"
                />
              </div>

              {/* Submit to Payment */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-retu-charcoal text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-md active:scale-98 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Reserving Stock & Connecting Razorpay...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Pay ₹{(totalPaise / 100).toFixed(2)} Securely via Razorpay</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-6 text-[11px] text-gray-500 pt-2">
                <span>✓ UPI, Credit / Debit Cards, NetBanking</span>
                <span>✓ Server Signature Verification</span>
                <span>✓ Instant Tax Invoice</span>
              </div>
            </form>
          </div>

          {/* RIGHT COLUMN: Order Summary & Cold-Chain Badges */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Items Summary Box */}
            <div className="bg-white rounded-2xl border border-retu-border p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-retu-border">
                <h3 className="text-sm font-bold text-retu-charcoal uppercase tracking-wider">
                  Order Summary ({items.length} {items.length === 1 ? 'item' : 'items'})
                </h3>
                <Link href="/store/cart" className="text-xs text-retu-pink hover:underline font-semibold">
                  Edit Cart
                </Link>
              </div>

              {/* Item List */}
              <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.variantId} className="py-3 flex items-center gap-3">
                    <div className="relative w-12 h-12 bg-retu-warm-white rounded-lg border border-retu-border shrink-0 overflow-hidden">
                      <Image
                        src={item.imageUrl || '/images/products/mibiotics-mango.png'}
                        alt={item.productName}
                        fill
                        className="object-contain p-1"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-retu-charcoal truncate">{item.productName}</h4>
                      <p className="text-[11px] text-gray-500">{item.variantName} × {item.quantity}</p>
                    </div>
                    <div className="text-right text-xs font-bold text-retu-charcoal shrink-0">
                      ₹{((item.unitPricePaise * item.quantity) / 100).toFixed(0)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pricing Breakdown */}
              <div className="pt-3 border-t border-retu-border space-y-2 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal (MRP inclusive of GST)</span>
                  <span className="font-semibold text-retu-charcoal">₹{(subtotalPaise / 100).toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-gray-600">
                  <span>Cold-Chain Insulated Shipping</span>
                  {isFreeShipping ? (
                    <span className="font-bold text-emerald-600 uppercase text-[11px]">Free Delivery</span>
                  ) : (
                    <span className="font-semibold text-retu-charcoal">₹{(shippingPaise / 100).toFixed(2)}</span>
                  )}
                </div>

                {!isFreeShipping && (
                  <p className="text-[10px] text-gray-500 italic">
                    Add ₹{((FREE_SHIPPING_THRESHOLD_PAISE - subtotalPaise) / 100).toFixed(0)} more for free delivery.
                  </p>
                )}

                <div className="pt-3 border-t border-retu-border flex justify-between items-baseline text-sm font-extrabold text-retu-charcoal">
                  <span>Total Payable</span>
                  <span className="text-xl text-retu-charcoal">₹{(totalPaise / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Cold Chain Transit Guarantee */}
            <div className="p-5 bg-retu-charcoal text-white rounded-2xl shadow-sm space-y-3 text-xs">
              <div className="flex items-center gap-2 text-retu-pink">
                <ShieldCheck className="w-4 h-4" />
                <span className="font-bold uppercase tracking-wider text-[11px]">Cold-Chain Protocol</span>
              </div>
              <p className="text-gray-300 leading-relaxed text-xs">
                mi-biotics™ contains living, scientifically validated cultures (LGG® & Wellmune®) in a fermented millet matrix. Shipped strictly in refrigerated insulated boxes with reusable cold gel packs.
              </p>
              <div className="pt-1 border-t border-gray-700/80 text-[11px] text-gray-400 flex items-center justify-between">
                <span>Dispatches from Bengaluru</span>
                <span>Target: 2°C to 8°C</span>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* RAZORPAY MODAL (Standard Hosted or Interactive Simulator) */}
      {razorpayData && (
        <RazorpayPaymentModal
          orderId={razorpayData.orderId}
          orderReference={razorpayData.orderReference}
          razorpayOrderId={razorpayData.razorpayOrderId}
          amountPaise={razorpayData.amountPaise}
          currency={razorpayData.currency}
          keyId={razorpayData.keyId}
          isSimulator={razorpayData.isSimulator}
          customer={razorpayData.customer}
          onSuccess={handlePaymentSuccess}
          onFailure={handlePaymentFailure}
          onClose={handlePaymentClose}
        />
      )}
    </div>
  );
}
