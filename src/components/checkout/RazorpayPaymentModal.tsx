'use client';

import React, { useEffect } from 'react';
import { ShieldCheck, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface RazorpayModalProps {
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
  onSuccess: (paymentId: string, signature: string) => void;
  onFailure: (error: string) => void;
  onClose: () => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function RazorpayPaymentModal({
  orderId,
  orderReference,
  razorpayOrderId,
  amountPaise,
  currency,
  keyId,
  isSimulator,
  customer,
  onSuccess,
  onFailure,
  onClose,
}: RazorpayModalProps) {
  useEffect(() => {
    // If not simulator and not placeholder key, load Razorpay script
    if (!isSimulator && keyId && !keyId.includes('placeholder')) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        try {
          const rzp = new window.Razorpay({
            key: keyId,
            amount: amountPaise,
            currency: currency || 'INR',
            name: 'Retü Foods',
            description: `mi-biotics™ Order ${orderReference}`,
            image: '/images/brand/retu-logo.png',
            order_id: razorpayOrderId,
            prefill: {
              name: customer.name,
              email: customer.email,
              contact: customer.phone,
            },
            theme: {
              color: '#171717',
            },
            handler: function (response: any) {
              onSuccess(response.razorpay_payment_id, response.razorpay_signature);
            },
            modal: {
              ondismiss: function () {
                onClose();
              },
            },
          });
          rzp.open();
        } catch (err: any) {
          console.error('Failed to open Razorpay modal:', err);
        }
      };
      document.body.appendChild(script);

      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    }
  }, [isSimulator, keyId, amountPaise, currency, customer, orderReference, razorpayOrderId, onSuccess, onClose]);

  // When in Test Mode Simulator or placeholder keys:
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-retu-border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 bg-retu-charcoal text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm">Razorpay Checkout</h3>
              <p className="text-[11px] text-gray-300">
                {isSimulator ? 'Test Mode Simulator Active' : 'Secure Payment Gateway'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-gray-700">
          <div className="p-3 bg-retu-warm-white rounded-lg border border-retu-border space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-500">Merchant:</span>
              <strong className="text-retu-charcoal">DancingEarth Food Pvt Ltd (Retü Foods)</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Order Reference:</span>
              <strong className="text-retu-charcoal">{orderReference}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Razorpay Order ID:</span>
              <code className="text-[11px] font-mono text-gray-600">{razorpayOrderId}</code>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-gray-200 text-sm">
              <span className="font-bold text-gray-700">Total Payable:</span>
              <span className="text-lg font-black text-retu-charcoal">
                ₹{(amountPaise / 100).toFixed(0)}
              </span>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-xs">
              <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
              Razorpay Sandbox / Test Mode
            </p>
            <p className="text-[11px] text-blue-700">
              Select an outcome below to test the server-side payment verification pipeline, order creation, invoice generation, and email notifications.
            </p>
          </div>

          {/* Test Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                const simulatedPaymentId = `pay_test_${Date.now()}`;
                const simulatedSig = `sig_test_${Date.now()}`;
                onSuccess(simulatedPaymentId, simulatedSig);
              }}
              className="w-full py-3 bg-emerald-600 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-sm active:scale-98 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simulate Successful Payment (Test Success)</span>
            </button>

            <button
              onClick={() => {
                onFailure('Payment failed due to simulated user cancellation or card decline');
              }}
              className="w-full py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg font-semibold text-xs hover:bg-red-100 transition-colors"
            >
              Simulate Payment Failure
            </button>

            <button
              onClick={onClose}
              className="w-full py-2 bg-gray-100 text-gray-600 rounded-lg font-medium text-xs hover:bg-gray-200 transition-colors"
            >
              Cancel & Return to Cart
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
