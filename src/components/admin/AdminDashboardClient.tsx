'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  CreditCard,
  LogOut,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Truck,
  Edit2,
  Check,
  RefreshCw,
  Download,
  ShieldCheck,
  Send,
  RotateCcw,
  X,
  AlertCircle,
} from 'lucide-react';
import { Order, Product } from '@/lib/db/service';

interface AdminDashboardClientProps {
  initialStats: any;
  initialOrders: Order[];
  initialProducts: Product[];
  adminEmail: string;
}

export default function AdminDashboardClient({
  initialStats,
  initialOrders,
  initialProducts,
  adminEmail,
}: AdminDashboardClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'products' | 'payments'>('overview');

  // Orders State
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [carrierInput, setCarrierInput] = useState('');
  const [trackingInput, setTrackingInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Admin Direct Cancellation State
  const [showAdminCancelModal, setShowAdminCancelModal] = useState<Order | null>(null);
  const [adminCancelReason, setAdminCancelReason] = useState('Cancelled by store administrator');
  const [adminCancelRestock, setAdminCancelRestock] = useState(true);
  const [adminCancelSubmitting, setAdminCancelSubmitting] = useState(false);

  // Cancellation Decision State (Customer Request Approval/Rejection)
  const [cancellationDecisionModal, setCancellationDecisionModal] = useState<{
    order: Order;
    action: 'approve' | 'reject';
  } | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [decisionRestock, setDecisionRestock] = useState(true);
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);

  // Refund State
  const [showRefundPanel, setShowRefundPanel] = useState(false);
  const [refundAmountInput, setRefundAmountInput] = useState('');
  const [refundReasonInput, setRefundReasonInput] = useState('Customer pre-dispatch cancellation');
  const [refundRestockCheckbox, setRefundRestockCheckbox] = useState(true);
  const [refunding, setRefunding] = useState(false);

  // Products State
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editPricePaise, setEditPricePaise] = useState<number>(0);
  const [editStock, setEditStock] = useState<number>(0);

  // Webhook Simulator State
  const [simOrderId, setSimOrderId] = useState(initialOrders[0]?.razorpay_order_id || '');
  const [simLoading, setSimLoading] = useState(false);
  const [simOutput, setSimOutput] = useState<string | null>(null);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  const refreshOrders = async () => {
    try {
      const url = `/api/admin/orders?status=${orderStatusFilter}&search=${encodeURIComponent(orderSearch)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateFulfilment = async (orderId: string, newStatus: Order['fulfilment_status']) => {
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          fulfilment_status: newStatus,
          carrier: carrierInput || undefined,
          tracking_number: trackingInput || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage(`Order updated to ${newStatus}`);
        setTimeout(() => setStatusMessage(null), 3000);
        refreshOrders();
        if (selectedOrder) {
          setSelectedOrder({
            ...selectedOrder,
            fulfilment_status: newStatus,
            tracking_carrier: carrierInput || selectedOrder.tracking_carrier,
            tracking_number: trackingInput || selectedOrder.tracking_number,
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleProcessRefund = async (orderId: string) => {
    if (!selectedOrder) return;
    setRefunding(true);
    try {
      const amountPaise = refundAmountInput ? Math.round(parseFloat(refundAmountInput) * 100) : selectedOrder.total_paise;
      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountPaise,
          reason: refundReasonInput || 'Admin processed refund',
          restock: refundRestockCheckbox,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage(`Refund of ₹${(amountPaise / 100).toFixed(2)} processed successfully via Razorpay`);
        setTimeout(() => setStatusMessage(null), 3000);
        refreshOrders();
        setShowRefundPanel(false);
        setSelectedOrder({
          ...selectedOrder,
          payment_status: 'refunded',
          fulfilment_status: 'cancelled',
          refunds: [data.refund],
        });
      } else {
        alert(data.error || 'Refund failed');
      }
    } catch (e: any) {
      alert(e.message || 'Refund error');
    } finally {
      setRefunding(false);
    }
  };

  const handleAdminDirectCancel = async (orderId: string) => {
    setAdminCancelSubmitting(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: adminCancelReason || 'Cancelled by store administrator',
          restock: adminCancelRestock,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage(data.message);
        setTimeout(() => setStatusMessage(null), 3500);
        setShowAdminCancelModal(null);
        refreshOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(data.order);
        }
      } else {
        alert(data.error || 'Failed to cancel order');
      }
    } catch (e: any) {
      alert(e.message || 'Error cancelling order');
    } finally {
      setAdminCancelSubmitting(false);
    }
  };

  const handleCancellationDecision = async (orderId: string, action: 'approve' | 'reject') => {
    setDecisionSubmitting(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/cancellation-decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reason: decisionReason,
          restock: decisionRestock,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage(data.message);
        setTimeout(() => setStatusMessage(null), 3500);
        setCancellationDecisionModal(null);
        setDecisionReason('');
        refreshOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(data.order);
        }
      } else {
        alert(data.error || 'Decision failed');
      }
    } catch (e: any) {
      alert(e.message || 'Decision error');
    } finally {
      setDecisionSubmitting(false);
    }
  };

  const handleSaveVariant = async (variantId: string) => {
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'variant',
          id: variantId,
          data: {
            price_paise: editPricePaise,
            stock_quantity: editStock,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingVariantId(null);
        // Refresh product list
        const pRes = await fetch('/api/admin/products');
        const pData = await pRes.json();
        if (pData.success) setProducts(pData.products);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSimulateWebhook = async (eventType: string) => {
    setSimLoading(true);
    setSimOutput(null);
    try {
      const simulatedEvent = {
        event_id: `evt_test_${Date.now()}`,
        event: eventType,
        payload: {
          payment: {
            entity: {
              id: `pay_sim_${Date.now()}`,
              order_id: simOrderId,
              status: eventType === 'payment.captured' ? 'captured' : 'failed',
              amount: 54000,
              currency: 'INR',
              error_code: eventType === 'payment.failed' ? 'BAD_REQUEST_ERROR' : null,
              error_description: eventType === 'payment.failed' ? 'Simulated bank decline' : null,
            },
          },
        },
      };

      const res = await fetch('/api/webhooks/razorpay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': 'simulated_test_sig',
        },
        body: JSON.stringify(simulatedEvent),
      });
      const data = await res.json();
      setSimOutput(`Webhook Processed Response: ${JSON.stringify(data, null, 2)}`);
      refreshOrders();
    } catch (err: any) {
      setSimOutput(`Webhook Failed: ${err.message}`);
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-retu-warm-white/40 pb-16">
      
      {/* Top Admin Header */}
      <div className="bg-white border-b border-retu-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-base text-retu-charcoal tracking-tight">Retü Foods</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-retu-charcoal text-white uppercase tracking-wider">
              Admin Portal
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="text-gray-500 hidden sm:inline">{adminEmail}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-retu-border text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-8 text-xs font-bold border-t border-gray-100">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'overview'
                ? 'border-retu-charcoal text-retu-charcoal'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard Overview</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('orders');
              refreshOrders();
            }}
            className={`py-3 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'orders'
                ? 'border-retu-charcoal text-retu-charcoal'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Orders Management</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'products'
                ? 'border-retu-charcoal text-retu-charcoal'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Products & Inventory</span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'payments'
                ? 'border-retu-charcoal text-retu-charcoal'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Razorpay Testing & Webhooks</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{statusMessage}</span>
          </div>
        </div>
      )}

      {/* Main Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* ================= OVERVIEW TAB ================= */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            
            {/* Cancellation Requests Action Callout */}
            {initialStats.cancellationRequestsCount > 0 && (
              <div className="p-5 bg-amber-50 rounded-2xl border-2 border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-sm shrink-0">
                    {initialStats.cancellationRequestsCount}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-amber-950 text-sm">
                      {initialStats.cancellationRequestsCount} Cancellation & Refund {initialStats.cancellationRequestsCount === 1 ? 'Request' : 'Requests'} Awaiting Review
                    </h4>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Customers requested cancellation. Verify cold-chain dispatch status before approving Razorpay refund or declining.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setOrderStatusFilter('cancellation_requested');
                    setActiveTab('orders');
                    fetch(`/api/admin/orders?status=cancellation_requested&search=${encodeURIComponent(orderSearch)}`)
                      .then((r) => r.json())
                      .then((d) => d.success && setOrders(d.orders));
                  }}
                  className="px-4 py-2 bg-amber-800 text-white font-bold text-xs rounded-xl hover:bg-amber-900 transition-colors whitespace-nowrap"
                >
                  Review Requests
                </button>
              </div>
            )}

            {/* KPI Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 bg-white rounded-2xl border border-retu-border shadow-xs">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Reconciled Sales</span>
                <p className="text-2xl font-black text-retu-charcoal mt-1">
                  ₹{((initialStats.grossSalesPaise || 0) / 100).toFixed(0)}
                </p>
                <p className="text-[10px] text-emerald-600 mt-1 font-medium">Verified Paid Revenue</p>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-retu-border shadow-xs">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total Orders</span>
                <p className="text-2xl font-black text-retu-charcoal mt-1">
                  {initialStats.totalOrders || 0}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">{initialStats.pendingOrders || 0} pending payment</p>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-retu-border shadow-xs">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Awaiting Dispatch</span>
                <p className="text-2xl font-black text-retu-charcoal mt-1">
                  {initialStats.awaitingFulfilment || 0}
                </p>
                <p className="text-[10px] text-amber-600 mt-1 font-medium">Paid orders to pack</p>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-retu-border shadow-xs">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Low Stock Alerts</span>
                <p className="text-2xl font-black text-retu-charcoal mt-1">
                  {initialStats.lowStockVariants?.length || 0}
                </p>
                <p className="text-[10px] text-red-500 mt-1 font-medium">Variants under 15 units</p>
              </div>
            </div>

            {/* Low stock alerts callout if any */}
            {initialStats.lowStockVariants?.length > 0 && (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
                <h3 className="font-bold text-xs text-amber-900 flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Inventory Threshold Warning: The following items need restock</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {initialStats.lowStockVariants.map((v: any) => (
                    <div key={v.id} className="p-2 bg-white rounded-lg border border-amber-100 flex justify-between">
                      <span className="text-gray-700 font-medium">{v.product_name} ({v.variant_name})</span>
                      <strong className="text-red-600">{v.stock_quantity} left</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Orders List */}
            <div className="bg-white rounded-2xl border border-retu-border shadow-xs overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-sm text-retu-charcoal">Recent Customer Orders</h3>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs font-bold text-retu-pink hover:underline"
                >
                  View All Orders →
                </button>
              </div>

              <div className="divide-y divide-gray-100">
                {(initialStats.recentOrders || []).map((o: any) => (
                  <div key={o.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-retu-charcoal">{o.order_reference}</strong>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          o.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {o.payment_status}
                        </span>
                      </div>
                      <p className="text-gray-500 mt-0.5">{o.customer_name} ({o.customer_email})</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="font-bold text-retu-charcoal">₹{(o.total_paise / 100).toFixed(0)}</span>
                      <span className="text-gray-400 capitalize">{o.fulfilment_status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ================= ORDERS TAB ================= */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            
            {/* Filter and Search Bar */}
            <div className="p-4 bg-white rounded-2xl border border-retu-border flex flex-col sm:flex-row gap-4 items-center justify-between shadow-xs">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by ref, email, phone or payment ID..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && refreshOrders()}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-retu-border rounded-lg text-xs focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={orderStatusFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setOrderStatusFilter(val);
                    fetch(`/api/admin/orders?status=${val}&search=${encodeURIComponent(orderSearch)}`)
                      .then((r) => r.json())
                      .then((d) => d.success && setOrders(d.orders));
                  }}
                  className="px-3 py-2 bg-gray-50 border border-retu-border rounded-lg text-xs font-semibold focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="cancellation_requested">Cancellation Requested</option>
                  <option value="paid">Payment: Paid</option>
                  <option value="pending">Payment: Pending</option>
                  <option value="failed">Payment: Failed</option>
                  <option value="refunded">Payment: Refunded</option>
                  <option value="confirmed">Fulfilment: Confirmed</option>
                  <option value="processing">Fulfilment: Processing</option>
                  <option value="shipped">Fulfilment: Shipped</option>
                  <option value="delivered">Fulfilment: Delivered</option>
                  <option value="cancelled">Fulfilment: Cancelled</option>
                </select>

                <button
                  onClick={refreshOrders}
                  className="p-2 border border-retu-border rounded-lg hover:bg-gray-100 text-gray-600"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-2xl border border-retu-border overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-4">Reference</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Payment</th>
                      <th className="p-4">Fulfilment</th>
                      <th className="p-4">Date</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-400">
                          No orders match the selected filter.
                        </td>
                      </tr>
                    ) : (
                      orders.map((o) => (
                        <tr key={o.id} className="hover:bg-gray-50/50">
                          <td className="p-4 font-bold text-retu-charcoal">{o.order_reference}</td>
                          <td className="p-4">
                            <p className="font-semibold text-retu-charcoal">{o.customer_name}</p>
                            <p className="text-[11px] text-gray-400">{o.customer_email}</p>
                          </td>
                          <td className="p-4 font-extrabold text-retu-charcoal">
                            ₹{(o.total_paise / 100).toFixed(0)}
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                o.payment_status === 'paid'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : o.payment_status === 'refunded'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {o.payment_status}
                              </span>
                              {o.cancellation_status === 'requested' && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                                  Cancellation Requested
                                </span>
                              )}
                              {o.cancellation_status === 'rejected' && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  Request Declined
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`capitalize font-semibold ${
                              o.fulfilment_status === 'cancelled' ? 'text-red-600 font-bold' : 'text-gray-600'
                            }`}>
                              {o.fulfilment_status}
                            </span>
                          </td>
                          <td className="p-4 text-gray-400">
                            {new Date(o.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedOrder(o);
                                setCarrierInput(o.tracking_carrier || 'Blue Dart Cold-Chain');
                                setTrackingInput(o.tracking_number || '');
                              }}
                              className="px-3 py-1 bg-retu-charcoal text-white rounded text-[11px] font-semibold hover:bg-black"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selected Order Modal Drawer */}
            {selectedOrder && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-start pb-4 border-b border-gray-100">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-retu-pink">Order Details</span>
                      <h3 className="text-xl font-black text-retu-charcoal">{selectedOrder.order_reference}</h3>
                    </div>
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="p-1 text-gray-400 hover:text-black rounded"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Customer & Address */}
                  <div className="p-4 bg-retu-warm-white rounded-xl text-xs space-y-1">
                    <p><strong>Customer:</strong> {selectedOrder.customer_name} ({selectedOrder.customer_email}, {selectedOrder.customer_phone})</p>
                    <p><strong>Address:</strong> {selectedOrder.shipping_address_line1}, {selectedOrder.shipping_city}, {selectedOrder.shipping_state} - {selectedOrder.shipping_postal_code}</p>
                    <p><strong>Razorpay Payment ID:</strong> {selectedOrder.razorpay_payment_id || 'Awaiting Payment'}</p>
                  </div>

                  {/* Customer Cancellation Request Banner */}
                  {selectedOrder.cancellation_status === 'requested' && (
                    <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 text-amber-900">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        <div>
                          <h4 className="font-extrabold text-sm text-amber-900">
                            Cancellation & Refund Requested by Customer
                          </h4>
                          <p className="text-[11px] text-amber-800">
                            Submitted: {selectedOrder.cancellation_requested_at ? new Date(selectedOrder.cancellation_requested_at).toLocaleString('en-IN') : 'Recently'}
                          </p>
                        </div>
                      </div>

                      <div className="bg-white/90 p-3 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1">
                        <p><strong>Customer Stated Reason:</strong> &ldquo;{selectedOrder.cancellation_reason || 'Pre-dispatch cancellation'}&rdquo;</p>
                        <p className="text-[11px] text-gray-600">
                          Verify cold-chain dispatch status. If the insulated package has not left the warehouse, approve and issue a full refund via Razorpay. If already in transit, reject the request with explanation.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setCancellationDecisionModal({ order: selectedOrder, action: 'approve' });
                            setDecisionReason(selectedOrder.cancellation_reason || 'Cancellation approved by admin');
                            setDecisionRestock(true);
                          }}
                          className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>Approve & Issue Razorpay Refund</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCancellationDecisionModal({ order: selectedOrder, action: 'reject' });
                            setDecisionReason('Order is already packaged and in cold-chain transit.');
                          }}
                          className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <X className="w-4 h-4" />
                          <span>Reject Request</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Rejection Notice if request was rejected */}
                  {selectedOrder.cancellation_status === 'rejected' && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
                      <p className="font-bold text-rose-800">Customer Cancellation Request Declined</p>
                      <p className="text-rose-700 text-[11px]">
                        Admin note sent to customer: {selectedOrder.cancellation_admin_notes || 'Shipment in transit'}
                      </p>
                    </div>
                  )}

                  {/* Items */}
                  <div className="space-y-2 text-xs">
                    <h4 className="font-bold text-gray-700">Line Items:</h4>
                    {(selectedOrder.items || []).map((item) => (
                      <div key={item.id} className="flex justify-between border-b border-gray-100 pb-1">
                        <span>{item.quantity}× {item.product_name} ({item.variant_name})</span>
                        <span className="font-bold">₹{(item.total_price_paise / 100).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Update Fulfilment Status */}
                  <div className="p-4 bg-gray-50 rounded-xl space-y-3 text-xs">
                    <h4 className="font-bold text-gray-800">Update Dispatch & Fulfilment</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-gray-500 mb-1">Carrier Name</label>
                        <input
                          type="text"
                          value={carrierInput}
                          onChange={(e) => setCarrierInput(e.target.value)}
                          className="w-full p-2 bg-white border border-gray-200 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-gray-500 mb-1">Tracking Number / AWB</label>
                        <input
                          type="text"
                          value={trackingInput}
                          onChange={(e) => setTrackingInput(e.target.value)}
                          className="w-full p-2 bg-white border border-gray-200 rounded text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        onClick={() => handleUpdateFulfilment(selectedOrder.id, 'processing')}
                        className="flex-1 min-w-[90px] py-2 bg-blue-50 text-blue-700 font-bold rounded hover:bg-blue-100"
                      >
                        Set Processing
                      </button>
                      <button
                        onClick={() => handleUpdateFulfilment(selectedOrder.id, 'shipped')}
                        className="flex-1 min-w-[90px] py-2 bg-amber-50 text-amber-700 font-bold rounded hover:bg-amber-100"
                      >
                        Set Shipped
                      </button>
                      <button
                        onClick={() => handleUpdateFulfilment(selectedOrder.id, 'delivered')}
                        className="flex-1 min-w-[90px] py-2 bg-emerald-50 text-emerald-700 font-bold rounded hover:bg-emerald-100"
                      >
                        Set Delivered
                      </button>
                      <button
                        onClick={() => {
                          setShowAdminCancelModal(selectedOrder);
                          setAdminCancelReason('Cancelled by store administrator');
                          setAdminCancelRestock(true);
                        }}
                        className="flex-1 min-w-[90px] py-2 bg-rose-50 text-rose-700 font-bold rounded hover:bg-rose-100 transition-colors"
                      >
                        Set Cancelled
                      </button>
                    </div>
                  </div>

                  {/* Refund Notice if order has been refunded */}
                  {selectedOrder.payment_status === 'refunded' && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-1">
                      <p className="font-bold text-red-800">Order Cancelled & Refund Processed</p>
                      {selectedOrder.refunds && selectedOrder.refunds[0] && (
                        <p className="text-red-700 leading-relaxed">
                          Razorpay Refund ID: <code>{selectedOrder.refunds[0].razorpay_refund_id || 'Processed'}</code>
                          <br />
                          Reason: {selectedOrder.refunds[0].reason || 'N/A'} (Initiated by: {selectedOrder.refunds[0].initiated_by})
                        </p>
                      )}
                    </div>
                  )}

                  {/* Razorpay Refund & Cancellation Panel (Active for paid orders) */}
                  {(selectedOrder.payment_status === 'paid' || selectedOrder.payment_status === 'partially_refunded') && (
                    <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl space-y-3 text-xs">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5 font-bold text-rose-900">
                          <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                          <span>Razorpay Refund & Cancellation</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowRefundPanel(!showRefundPanel);
                            setRefundAmountInput(((selectedOrder.total_paise || 0) / 100).toFixed(2));
                            setRefundReasonInput('Customer pre-dispatch cancellation');
                          }}
                          className="text-[11px] font-bold text-rose-700 hover:text-rose-900 underline"
                        >
                          {showRefundPanel ? 'Hide Controls' : 'Open Refund Form'}
                        </button>
                      </div>

                      {showRefundPanel && (
                        <div className="space-y-3 pt-2 border-t border-rose-200">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1">Refund Amount (INR)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={refundAmountInput}
                                onChange={(e) => setRefundAmountInput(e.target.value)}
                                className="w-full p-2 bg-white border border-rose-300 rounded text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1">Reason</label>
                              <input
                                type="text"
                                value={refundReasonInput}
                                onChange={(e) => setRefundReasonInput(e.target.value)}
                                placeholder="e.g. Cancelled, Damaged seal"
                                className="w-full p-2 bg-white border border-rose-300 rounded text-xs"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="restockToggle"
                              checked={refundRestockCheckbox}
                              onChange={(e) => setRefundRestockCheckbox(e.target.checked)}
                              className="rounded text-rose-600"
                            />
                            <label htmlFor="restockToggle" className="text-gray-700">
                              Restock variant inventory back to store catalogue
                            </label>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleProcessRefund(selectedOrder.id)}
                            disabled={refunding}
                            className="w-full py-2 bg-rose-600 text-white rounded font-bold hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-xs"
                          >
                            {refunding ? 'Processing with Razorpay...' : 'Execute Refund via Razorpay API'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Invoice action */}
                  <div className="flex justify-between items-center pt-2">
                    <a
                      href={`/api/invoices/${selectedOrder.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-retu-charcoal hover:underline flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Official Tax Invoice</span>
                    </a>

                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded text-xs font-bold hover:bg-gray-300"
                    >
                      Close
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* Cancellation Decision Modal (Approve & Refund vs Reject) */}
            {cancellationDecisionModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl border border-gray-100">
                  <div className="flex justify-between items-start pb-3 border-b border-gray-100">
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        cancellationDecisionModal.action === 'approve' ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {cancellationDecisionModal.action === 'approve' ? 'Approve Cancellation' : 'Decline Request'}
                      </span>
                      <h3 className="text-lg font-black text-retu-charcoal">
                        {cancellationDecisionModal.action === 'approve'
                          ? `Approve & Refund ${cancellationDecisionModal.order.order_reference}`
                          : `Reject Request for ${cancellationDecisionModal.order.order_reference}`}
                      </h3>
                    </div>
                    <button
                      onClick={() => setCancellationDecisionModal(null)}
                      disabled={decisionSubmitting}
                      className="p-1 text-gray-400 hover:text-black rounded"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {cancellationDecisionModal.action === 'approve' ? (
                    <div className="space-y-4 text-xs">
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-emerald-950">
                        <p className="font-bold">Automated Razorpay Refund Execution</p>
                        <p className="text-[11px] text-emerald-800">
                          Approving will immediately trigger Razorpay Refund API for ₹{(cancellationDecisionModal.order.total_paise / 100).toFixed(2)}, set order status to Refunded & Cancelled, and dispatch a confirmation email to {cancellationDecisionModal.order.customer_email}.
                        </p>
                      </div>

                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Approval Note / Audit Reason</label>
                        <input
                          type="text"
                          value={decisionReason}
                          onChange={(e) => setDecisionReason(e.target.value)}
                          placeholder="e.g. Approved pre-dispatch cancellation"
                          className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="decisionRestockCheckbox"
                          checked={decisionRestock}
                          onChange={(e) => setDecisionRestock(e.target.checked)}
                          className="rounded text-emerald-600"
                        />
                        <label htmlFor="decisionRestockCheckbox" className="text-gray-700">
                          Restock reserved inventory units back to catalogue
                        </label>
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setCancellationDecisionModal(null)}
                          disabled={decisionSubmitting}
                          className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-black"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleCancellationDecision(cancellationDecisionModal.order.id, 'approve')
                          }
                          disabled={decisionSubmitting}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                        >
                          {decisionSubmitting ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Processing with Razorpay...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Execute Refund & Cancel</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 text-xs">
                      <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-rose-950">
                        <p className="font-bold">Decline Cancellation Request</p>
                        <p className="text-[11px] text-rose-800">
                          The order will remain active for cold-chain fulfillment. The reason you enter below will be dispatched to the customer via email.
                        </p>
                      </div>

                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Reason for Rejection *</label>
                        <textarea
                          rows={3}
                          value={decisionReason}
                          onChange={(e) => setDecisionReason(e.target.value)}
                          placeholder="e.g. Order has already been packed with cooling refrigerant gel packs and handed over to courier."
                          className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setCancellationDecisionModal(null)}
                          disabled={decisionSubmitting}
                          className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-black"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleCancellationDecision(cancellationDecisionModal.order.id, 'reject')
                          }
                          disabled={decisionSubmitting || !decisionReason.trim()}
                          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                        >
                          {decisionSubmitting ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Updating Order...</span>
                            </>
                          ) : (
                            <>
                              <X className="w-3.5 h-3.5" />
                              <span>Decline Request & Notify Customer</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Admin Direct Cancellation Modal */}
            {showAdminCancelModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl border border-gray-100">
                  <div className="flex justify-between items-start pb-3 border-b border-gray-100">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                        Admin Direct Action
                      </span>
                      <h3 className="text-lg font-black text-retu-charcoal">
                        Set Order Cancelled: {showAdminCancelModal.order_reference}
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowAdminCancelModal(null)}
                      disabled={adminCancelSubmitting}
                      className="p-1 text-gray-400 hover:text-black rounded"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4 text-xs">
                    {(showAdminCancelModal.payment_status === 'paid' || showAdminCancelModal.payment_status === 'partially_refunded') ? (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-emerald-950">
                        <p className="font-bold">Automated Razorpay Refund</p>
                        <p className="text-[11px] text-emerald-800 leading-relaxed">
                          This order is prepaid (₹{(showAdminCancelModal.total_paise / 100).toFixed(2)}). Cancelling will automatically invoke the Razorpay Refund API, credit the customer&apos;s original payment method, and dispatch full refund confirmation emails.
                        </p>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-rose-950">
                        <p className="font-bold">Direct Cancellation Policy</p>
                        <p className="text-[11px] text-rose-800">
                          This action sets the order fulfilment status to Cancelled and dispatches a cancellation notification email to {showAdminCancelModal.customer_email}.
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Cancellation Reason</label>
                      <input
                        type="text"
                        value={adminCancelReason}
                        onChange={(e) => setAdminCancelReason(e.target.value)}
                        placeholder="e.g. Unserviceable PIN code, Customer phone unreachable"
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="adminRestockToggle"
                        checked={adminCancelRestock}
                        onChange={(e) => setAdminCancelRestock(e.target.checked)}
                        className="rounded text-rose-600"
                      />
                      <label htmlFor="adminRestockToggle" className="text-gray-700">
                        Restock reserved inventory units back to catalogue
                      </label>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAdminCancelModal(null)}
                        disabled={adminCancelSubmitting}
                        className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-black"
                      >
                        Keep Active
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdminDirectCancel(showAdminCancelModal.id)}
                        disabled={adminCancelSubmitting}
                        className={`px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 text-white ${
                          showAdminCancelModal.payment_status === 'paid' || showAdminCancelModal.payment_status === 'partially_refunded'
                            ? 'bg-emerald-600 hover:bg-emerald-700'
                            : 'bg-rose-600 hover:bg-rose-700'
                        }`}
                      >
                        {adminCancelSubmitting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>
                              {showAdminCancelModal.payment_status === 'paid' || showAdminCancelModal.payment_status === 'partially_refunded'
                                ? 'Processing Refund...'
                                : 'Cancelling...'}
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>
                              {showAdminCancelModal.payment_status === 'paid' || showAdminCancelModal.payment_status === 'partially_refunded'
                                ? 'Confirm Cancel & Issue Refund'
                                : 'Confirm Set Cancelled'}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ================= PRODUCTS & INVENTORY TAB ================= */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="p-4 bg-white rounded-2xl border border-retu-border shadow-xs">
              <h3 className="font-bold text-sm text-retu-charcoal">Catalogue Management & Real-Time Stock</h3>
              <p className="text-xs text-gray-500 mt-1">
                Edit selling prices and adjust inventory quantities directly. Changes take effect on the storefront immediately.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {products.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl border border-retu-border p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-2">
                    <div>
                      <h4 className="font-bold text-base text-retu-charcoal">{p.name}</h4>
                      <p className="text-xs text-gray-400">Slug: <code>{p.slug}</code> · Flavour: {p.flavor}</p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active on Storefront
                    </span>
                  </div>

                  {/* Variants table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="text-gray-400 uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="pb-2">Pack Name</th>
                          <th className="pb-2">SKU</th>
                          <th className="pb-2">Selling Price</th>
                          <th className="pb-2">Stock Inventory</th>
                          <th className="pb-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {(p.variants || []).map((v) => {
                          const isEditing = editingVariantId === v.id;
                          return (
                            <tr key={v.id} className="hover:bg-gray-50/50">
                              <td className="py-3 font-semibold">{v.name}</td>
                              <td className="py-3 font-mono text-gray-500">{v.sku}</td>
                              <td className="py-3">
                                {isEditing ? (
                                  <div className="flex items-center gap-1">
                                    <span>₹</span>
                                    <input
                                      type="number"
                                      value={editPricePaise / 100}
                                      onChange={(e) => setEditPricePaise(Math.round(parseFloat(e.target.value) * 100))}
                                      className="w-20 p-1 border rounded text-xs"
                                    />
                                  </div>
                                ) : (
                                  <span className="font-bold text-retu-charcoal">₹{(v.price_paise / 100).toFixed(0)}</span>
                                )}
                              </td>
                              <td className="py-3">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={editStock}
                                    onChange={(e) => setEditStock(parseInt(e.target.value, 10))}
                                    className="w-16 p-1 border rounded text-xs"
                                  />
                                ) : (
                                  <span className={`font-bold ${v.stock_quantity <= 15 ? 'text-red-600' : 'text-gray-700'}`}>
                                    {v.stock_quantity} units
                                  </span>
                                )}
                              </td>
                              <td className="py-3 text-right">
                                {isEditing ? (
                                  <div className="flex justify-end gap-1">
                                    <button
                                      onClick={() => handleSaveVariant(v.id)}
                                      className="px-2 py-1 bg-emerald-600 text-white rounded font-bold text-[11px]"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingVariantId(null)}
                                      className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-[11px]"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setEditingVariantId(v.id);
                                      setEditPricePaise(v.price_paise);
                                      setEditStock(v.stock_quantity);
                                    }}
                                    className="p-1 text-gray-400 hover:text-black"
                                    title="Edit Price/Stock"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= PAYMENTS & TESTING TAB ================= */}
        {activeTab === 'payments' && (
          <div className="space-y-6 max-w-3xl">
            <div className="p-6 bg-white rounded-2xl border border-retu-border shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-retu-pink" />
                <h3 className="font-bold text-base text-retu-charcoal">Razorpay Integration & Testing Suite</h3>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Test the complete server-side payment lifecycle: Order generation, cryptographic signature verification, idempotency checks, and webhook event reconciliation.
              </p>
            </div>

            {/* Webhook Simulator */}
            <div className="p-6 bg-white rounded-2xl border border-retu-border shadow-xs space-y-4 text-xs">
              <h4 className="font-bold text-sm text-gray-800">Simulate Razorpay Webhook Events</h4>
              <p className="text-gray-500">
                Send simulated webhook payloads to <code>/api/webhooks/razorpay</code> to test idempotency and auto-reconciliation of pending orders.
              </p>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Razorpay Order ID to target:</label>
                <input
                  type="text"
                  placeholder="e.g. order_test_..."
                  value={simOrderId}
                  onChange={(e) => setSimOrderId(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg font-mono text-xs"
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() => handleSimulateWebhook('payment.captured')}
                  disabled={simLoading || !simOrderId}
                  className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Simulate payment.captured</span>
                </button>

                <button
                  onClick={() => handleSimulateWebhook('payment.failed')}
                  disabled={simLoading || !simOrderId}
                  className="px-4 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Simulate payment.failed</span>
                </button>
              </div>

              {simOutput && (
                <pre className="p-4 bg-gray-900 text-emerald-400 rounded-xl overflow-x-auto text-[11px] font-mono mt-4">
                  {simOutput}
                </pre>
              )}
            </div>

            {/* Checklist */}
            <div className="p-6 bg-retu-warm-white rounded-2xl border border-retu-border space-y-3 text-xs text-gray-700">
              <h4 className="font-bold text-sm text-retu-charcoal">Production Go-Live Checklist</h4>
              <ul className="space-y-1.5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Atomic concurrency-safe stock reservation implemented</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Server-side HMAC-SHA256 payment signature verification active</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Webhook event ID deduplication and idempotency active</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Automated tax invoice generation with registered legal company details</span>
                </li>
              </ul>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
