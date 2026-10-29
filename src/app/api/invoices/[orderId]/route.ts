import { NextRequest, NextResponse } from 'next/server';
import { getOrderById, getInvoiceByOrderId } from '@/lib/db/service';
import { generateInvoicePdfBuffer } from '@/lib/invoices/pdf';
import { canAccessOrder } from '@/lib/auth/customer';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }
    if (!(await canAccessOrder(req, order))) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const invoice = await getInvoiceByOrderId(orderId);
    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not yet generated (order pending payment)' },
        { status: 404 }
      );
    }

    // Customer-entered fields go into HTML below, so escape them to prevent stored XSS
    const esc = (v: unknown) =>
      String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
    const safeInvoice = Object.fromEntries(Object.entries(invoice).map(([k, v]) => [k, typeof v === 'string' ? esc(v) : v])) as typeof invoice;
    const safeOrder = {
      ...order,
      order_reference: esc(order.order_reference),
      customer_phone: esc(order.customer_phone),
      razorpay_payment_id: order.razorpay_payment_id ? esc(order.razorpay_payment_id) : order.razorpay_payment_id,
      items: (order.items || []).map((i) => ({ ...i, product_name: esc(i.product_name), variant_name: esc(i.variant_name), sku: esc(i.sku) })),
    };

    const url = new URL(req.url);
    const format = url.searchParams.get('format');

    // Deliver PDF directly
    if (format === 'pdf') {
      const pdfBuffer = await generateInvoicePdfBuffer(order, invoice);
      return new Response(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Tax-Invoice-${invoice.invoice_number}.pdf"`,
          'Cache-Control': 'no-cache',
        },
      });
    }

    const acceptHeader = req.headers.get('accept') || '';
    if (acceptHeader.includes('application/json')) {
      return NextResponse.json({
        success: true,
        invoice,
        order,
      });
    }

    // Render printable tax invoice HTML
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Tax Invoice ${safeInvoice.invoice_number} - Retü Foods</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #171717;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            line-height: 1.5;
            font-size: 13px;
          }
          .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #171717;
            padding-bottom: 20px;
            margin-bottom: 24px;
          }
          .title {
            font-size: 24px;
            font-weight: 900;
            margin: 0;
            color: #171717;
          }
          .badge {
            display: inline-block;
            background: #10B981;
            color: #ffffff;
            font-weight: bold;
            font-size: 11px;
            padding: 3px 8px;
            border-radius: 4px;
            text-transform: uppercase;
            margin-top: 6px;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-bottom: 24px;
          }
          .section-title {
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #777777;
            margin-bottom: 6px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 24px 0;
          }
          th {
            background: #F7F5F0;
            text-align: left;
            padding: 10px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 1px solid #EAEAEA;
          }
          td {
            padding: 12px 10px;
            border-bottom: 1px solid #EAEAEA;
          }
          .text-right { text-align: right; }
          .total-box {
            margin-left: auto;
            width: 280px;
            margin-top: 16px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
          }
          .grand-total {
            border-top: 2px solid #171717;
            margin-top: 8px;
            padding-top: 8px;
            font-size: 16px;
            font-weight: 900;
          }
          .footer-note {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #EAEAEA;
            font-size: 11px;
            color: #777777;
          }
          .print-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #171717;
            color: #ffffff;
            border: none;
            padding: 10px 20px;
            font-weight: bold;
            border-radius: 6px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }
          @media print {
            .print-btn { display: none; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div style="display: flex; gap: 10px; margin-bottom: 20px;" class="print-btn">
          <a href="?format=pdf" style="display: inline-block; background: #10B981; color: #ffffff; text-decoration: none; padding: 10px 20px; font-weight: bold; border-radius: 6px; box-shadow: 0 4px 12px rgba(16,185,129,0.25);">Download Official PDF</a>
          <button onclick="window.print()" style="background: #171717; color: #ffffff; border: none; padding: 10px 20px; font-weight: bold; border-radius: 6px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">Print Invoice</button>
        </div>

        <div class="invoice-header">
          <div>
            <h1 class="title">TAX INVOICE</h1>
            <p style="margin: 4px 0 0 0; color: #777;">Retü Foods: mi-biotics™</p>
            <div class="badge">PAID IN FULL</div>
          </div>
          <div class="text-right">
            <p style="margin: 0;"><strong>Invoice #:</strong> ${safeInvoice.invoice_number}</p>
            <p style="margin: 4px 0 0 0;"><strong>Date:</strong> ${safeInvoice.invoice_date}</p>
            <p style="margin: 4px 0 0 0;"><strong>Order Ref:</strong> ${safeOrder.order_reference}</p>
          </div>
        </div>

        <div class="grid">
          <div>
            <div class="section-title">Billed By (Seller)</div>
            <p style="margin: 0;"><strong>${safeInvoice.company_name}</strong></p>
            <p style="margin: 2px 0 0 0; color: #555;">${safeInvoice.company_address}</p>
            <p style="margin: 4px 0 0 0;"><strong>GSTIN:</strong> ${safeInvoice.gstin || 'CONSUMER / B2C'}</p>
            <p style="margin: 2px 0 0 0;">Phone: 011-69269668 | ${process.env.INVOICE_SUPPORT_EMAIL || 'faizan.loyola@gmail.com'}</p>
          </div>

          <div>
            <div class="section-title">Billed To (Customer)</div>
            <p style="margin: 0;"><strong>${safeInvoice.customer_name}</strong></p>
            <p style="margin: 2px 0 0 0; color: #555;">${safeInvoice.customer_address}</p>
            <p style="margin: 4px 0 0 0;">Email: ${safeInvoice.customer_email}</p>
            <p style="margin: 2px 0 0 0;">Mobile: ${safeOrder.customer_phone}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Description of Goods</th>
              <th>SKU</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Total (INR)</th>
            </tr>
          </thead>
          <tbody>
            ${(safeOrder.items || [])
              .map(
                (item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>
                  <strong>${item.product_name}</strong><br/>
                  <span style="color: #777; font-size: 11px;">${item.variant_name}</span>
                </td>
                <td style="font-family: monospace;">${item.sku}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">₹${(item.unit_price_paise / 100).toFixed(2)}</td>
                <td class="text-right">₹${(item.total_price_paise / 100).toFixed(2)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="total-box">
          <div class="total-row">
            <span style="color: #555;">Subtotal:</span>
            <span>₹${(invoice.subtotal_paise / 100).toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span style="color: #555;">Refrigerated Delivery (2-8°C):</span>
            <span>₹${(invoice.shipping_paise / 100).toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span style="color: #555;">Taxes & GST (Included):</span>
            <span>₹0.00</span>
          </div>
          <div class="total-row grand-total">
            <span>Total Payable:</span>
            <span>₹${(invoice.total_paise / 100).toFixed(2)}</span>
          </div>
        </div>

        <div class="footer-note">
          <p><strong>Razorpay Payment Reference:</strong> ${safeOrder.razorpay_payment_id || 'Captured'}</p>
          <p>This is a computer-generated tax invoice issued by DancingEarth Food Private Limited. All mi-biotics™ products are manufactured on a dedicated line in Coimbatore, Tamil Nadu under Indian Patent No. 551921.</p>
        </div>
      </body>
      </html>
    `;

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
