import nodemailer from 'nodemailer';
import { Order, getInvoiceByOrderId } from '../db/service.ts';
import { generateInvoicePdfBuffer } from '../invoices/pdf.ts';

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
}

export async function sendTransactionalEmail(payload: EmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const provider = process.env.EMAIL_PROVIDER || (process.env.SMTP_HOST ? 'smtp' : 'console');
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_FROM || 'orders@retufoods.com';

  // 1. Production SMTP Transport (Universal: Gmail, Hostinger, Zoho, Amazon SES, Brevo, SendGrid, etc.)
  if (provider === 'smtp' || process.env.SMTP_HOST) {
    try {
      const port = Number(process.env.SMTP_PORT || 587);
      const isSecure = process.env.SMTP_SECURE === 'true' || port === 465;

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: port,
        secure: isSecure,
        auth: process.env.SMTP_USER
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
      });

      const info = await transporter.sendMail({
        from: fromAddress,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        attachments: payload.attachments,
      });

      console.log(`[SMTP EMAIL SENT] Subject: "${payload.subject}" to ${payload.to} (Message ID: ${info.messageId})${payload.attachments?.length ? ` [${payload.attachments.length} attachment(s)]` : ''}`);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error('[SMTP EMAIL ERROR]:', err);
      return { success: false, error: err.message };
    }
  }

  // 2. Resend API Transport (Optional fallback)
  if (provider === 'resend') {
    const apiKey = process.env.EMAIL_API_KEY;
    if (!apiKey || apiKey.includes('placeholder')) {
      return { success: false, error: 'Resend API key missing or invalid' };
    }
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.message || 'Resend API error' };
      }
      return { success: true, messageId: data.id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // 3. Console Simulator (Safe fallback when SMTP is not configured)
  console.log('\n======================================================');
  console.log(`[TRANSACTIONAL EMAIL SIMULATOR]`);
  console.log(`To: ${payload.to}`);
  console.log(`From: ${fromAddress}`);
  console.log(`Subject: ${payload.subject}`);
  console.log('------------------------------------------------------');
  console.log(payload.text);
  console.log('======================================================\n');
  return {
    success: true,
    messageId: `sim_${Date.now()}`,
  };
}

export async function sendOrderPaidEmails(order: Order, invoiceNumber: string): Promise<void> {
  const storeUrl = process.env.NEXT_PUBLIC_STORE_URL || 'http://localhost:3000';
  const confirmationUrl = `${storeUrl}/store/order-confirmation/${order.order_reference}`;
  const invoiceDownloadUrl = `${storeUrl}/api/invoices/${order.id}?format=pdf`;
  const totalInr = (order.total_paise / 100).toFixed(2);

  // Generate official Tax Invoice PDF attachment
  const invoice = getInvoiceByOrderId(order.id);
  let pdfAttachment: EmailAttachment | undefined;

  if (invoice) {
    try {
      const pdfBuffer = await generateInvoicePdfBuffer(order, invoice);
      pdfAttachment = {
        filename: `Tax-Invoice-${invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      };
    } catch (pdfErr) {
      console.error('[PDF INVOICE GENERATION ERROR]:', pdfErr);
    }
  }

  // 1. Customer Payment & Confirmation Email
  const customerHtml = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #171717; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="border-bottom: 2px solid #171717; padding-bottom: 12px; margin-bottom: 24px;">
          <h2 style="color: #171717; margin: 0;">Retü Foods: mi-biotics™</h2>
          <p style="margin: 4px 0 0; color: #777777; font-size: 14px;">Order & Payment Confirmation</p>
        </div>

        <p>Dear <strong>${order.customer_name}</strong>,</p>
        <p>Thank you for your order! Your payment of <strong>₹${totalInr}</strong> has been verified successfully.</p>
        
        <div style="background-color: #ECFDF5; border: 1px solid #10B981; border-radius: 8px; padding: 14px 16px; margin: 20px 0;">
          <p style="margin: 0; color: #065F46; font-size: 13px; font-weight: bold;">
            Official Tax Invoice Attached (PDF)
          </p>
          <p style="margin: 4px 0 0; color: #047857; font-size: 12px;">
            Your tax invoice <strong>${invoiceNumber}</strong> has been generated and attached to this email as a PDF. You can also download it anytime from your customer account.
          </p>
        </div>

        <div style="background-color: #F7F5F0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px;"><strong>Order Reference:</strong> ${order.order_reference}</p>
          <p style="margin: 0 0 8px;"><strong>Invoice Number:</strong> ${invoiceNumber}</p>
          <p style="margin: 0 0 8px;"><strong>Payment Status:</strong> Paid (Razorpay: ${order.razorpay_payment_id || 'Verified'})</p>
          <p style="margin: 0;"><strong>Shipping Address:</strong> ${order.shipping_address_line1}, ${order.shipping_city}, ${order.shipping_state} - ${order.shipping_postal_code}</p>
        </div>

        <h3 style="margin-top: 24px; border-bottom: 1px solid #EAEAEA; padding-bottom: 8px;">Items Ordered:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          ${(order.items || [])
            .map(
              (item) => `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #EAEAEA;">
                <strong>${item.product_name}</strong><br/>
                <span style="color: #777; font-size: 13px;">${item.variant_name} (Qty: ${item.quantity})</span>
              </td>
              <td style="padding: 8px 0; text-align: right; border-bottom: 1px solid #EAEAEA;">
                ₹${(item.total_price_paise / 100).toFixed(2)}
              </td>
            </tr>
          `
            )
            .join('')}
        </table>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${confirmationUrl}" style="background-color: #171717; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 8px;">
            View Order Status
          </a>
          <a href="${invoiceDownloadUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Download PDF Invoice
          </a>
        </div>

        <p style="font-size: 13px; color: #777777; margin-top: 32px; border-top: 1px solid #EAEAEA; padding-top: 16px;">
          mi-biotics™ is a live, chilled fermented multi-millet gut shot. Our team in Bengaluru will prepare your chilled package for cold-chain transit.
          Need assistance? Contact our team at <a href="mailto:faizan.loyola@gmail.com">faizan.loyola@gmail.com</a> or 011-69269668.
        </p>
      </body>
    </html>
  `;

  const customerText = `
Retü Foods: mi-biotics™
Order Confirmation: ${order.order_reference}
Invoice: ${invoiceNumber}

Dear ${order.customer_name},

Thank you for your order! Your payment of ₹${totalInr} has been verified successfully.

Your official Tax Invoice (${invoiceNumber}) has been generated and attached to this email as a PDF.

Order Reference: ${order.order_reference}
Status: Paid
Delivery To: ${order.shipping_address_line1}, ${order.shipping_city}, ${order.shipping_state} - ${order.shipping_postal_code}

You can view your order and invoice anytime at:
${confirmationUrl}

Customer Care: faizan.loyola@gmail.com | 011-69269668
DancingEarth Food Private Limited, Bengaluru.
  `;

  await sendTransactionalEmail({
    to: order.customer_email,
    subject: `Order Confirmed: ${order.order_reference} (Tax Invoice Attached) - Retü Foods`,
    html: customerHtml,
    text: customerText,
    attachments: pdfAttachment ? [pdfAttachment] : undefined,
  });

  // 2. Admin Notification Email
  const adminEmail = process.env.EMAIL_ADMIN_NOTIFY || 'faizan.loyola@gmail.com';
  await sendTransactionalEmail({
    to: adminEmail,
    subject: `[NEW ORDER PAID] ${order.order_reference} - ₹${totalInr} by ${order.customer_name} (Invoice Attached)`,
    html: `<p>New paid order received:</p><p>Ref: <strong>${order.order_reference}</strong><br/>Invoice: <strong>${invoiceNumber}</strong><br/>Customer: ${order.customer_name} (${order.customer_email}, ${order.customer_phone})<br/>Amount: ₹${totalInr}<br/>Address: ${order.shipping_city}, ${order.shipping_state}</p><p><em>Official tax invoice PDF is attached to this notification.</em></p>`,
    text: `New paid order: ${order.order_reference}\nInvoice: ${invoiceNumber}\nCustomer: ${order.customer_name} (${order.customer_email})\nAmount: ₹${totalInr}\nCity: ${order.shipping_city}\n\nInvoice PDF is attached.`,
    attachments: pdfAttachment ? [pdfAttachment] : undefined,
  });
}

// Transactional notification for order cancellation and refund
export async function sendOrderRefundedEmails(order: Order, refund: {
  amount_paise: number;
  razorpay_refund_id?: string | null;
  reason?: string | null;
  initiated_by?: string;
  restocked?: number | boolean;
}): Promise<void> {
  const storeUrl = process.env.NEXT_PUBLIC_STORE_URL || 'http://localhost:3000';
  const ordersUrl = `${storeUrl}/store/account/orders`;
  const refundAmountInr = (refund.amount_paise / 100).toFixed(2);
  const totalOrderInr = (order.total_paise / 100).toFixed(2);
  const isPartial = refund.amount_paise < order.total_paise;
  const reasonText = refund.reason || (isPartial ? 'Partial refund processed' : 'Pre-dispatch order cancellation');

  const emailSubject = isPartial
    ? `Customer Refund Receipt: ₹${refundAmountInr} for Order ${order.order_reference} - Retü Foods`
    : `Customer Refund Confirmation: ${order.order_reference} - Retü Foods`;

  const bannerTitle = isPartial
    ? `Partial Refund Initiated: ₹${refundAmountInr}`
    : `Full Refund Initiated: ₹${refundAmountInr}`;

  const headerTitle = isPartial ? 'Partial Refund Confirmation' : 'Refund & Cancellation Confirmation';

  // 1. Customer Cancellation & Refund Email
  const customerHtml = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #171717; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="border-bottom: 2px solid #171717; padding-bottom: 12px; margin-bottom: 24px;">
          <h2 style="color: #171717; margin: 0;">Retü Foods: mi-biotics™</h2>
          <p style="margin: 4px 0 0; color: #777777; font-size: 14px;">${headerTitle}</p>
        </div>

        <p>Dear <strong>${order.customer_name}</strong>,</p>
        <p>
          ${isPartial 
            ? `A partial refund of <strong>₹${refundAmountInr}</strong> has been processed for your order <strong>${order.order_reference}</strong>.`
            : `Your order cancellation and full refund request for order <strong>${order.order_reference}</strong> has been processed successfully.`}
        </p>

        <div style="background-color: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 6px; color: #991B1B; font-weight: bold; font-size: 14px;">
            ${bannerTitle}
          </p>
          <p style="margin: 0; color: #7F1D1D; font-size: 13px;">
            The refund has been submitted via Razorpay back to your original payment method. Depending on your bank, UPI handle, or card issuer, funds typically reflect within 5 to 7 business days.
          </p>
        </div>

        <div style="background-color: #F7F5F0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px;"><strong>Order Reference:</strong> ${order.order_reference}</p>
          <p style="margin: 0 0 8px;"><strong>Total Order Value:</strong> ₹${totalOrderInr}</p>
          <p style="margin: 0 0 8px;"><strong>Refund Amount:</strong> ₹${refundAmountInr}</p>
          <p style="margin: 0 0 8px;"><strong>Razorpay Refund ID:</strong> ${refund.razorpay_refund_id || 'Processed via Razorpay'}</p>
          <p style="margin: 0 0 8px;"><strong>Original Payment ID:</strong> ${order.razorpay_payment_id || 'Captured'}</p>
          <p style="margin: 0;"><strong>Reason:</strong> ${reasonText}</p>
        </div>

        <h3 style="margin-top: 24px; border-bottom: 1px solid #EAEAEA; padding-bottom: 8px;">Order Summary:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          ${(order.items || [])
            .map(
              (item) => `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #EAEAEA;">
                <strong>${item.product_name}</strong><br/>
                <span style="color: #777; font-size: 13px;">${item.variant_name} (Qty: ${item.quantity})</span>
              </td>
              <td style="padding: 8px 0; text-align: right; border-bottom: 1px solid #EAEAEA;">
                ₹${(item.total_price_paise / 100).toFixed(2)}
              </td>
            </tr>
          `
            )
            .join('')}
        </table>

        <p style="font-size: 13px; color: #555555; line-height: 1.6;">
          Because mi-biotics™ is an active refrigerated probiotic beverage, our policy supports full self-service refunds before cold-chain dispatch. If you have questions about your bank statement or need support, our care team is available to assist you.
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${ordersUrl}" style="background-color: #171717; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            View Order History in Account
          </a>
        </div>

        <p style="font-size: 13px; color: #777777; margin-top: 32px; border-top: 1px solid #EAEAEA; padding-top: 16px;">
          Need assistance? Contact our helpline at 011-69269668 or email <a href="mailto:faizan.loyola@gmail.com">faizan.loyola@gmail.com</a>.<br/>
          DancingEarth Food Private Limited, Bengaluru, Karnataka 560038.
        </p>
      </body>
    </html>
  `;

  const customerText = `
Retü Foods: mi-biotics™
${headerTitle}: ${order.order_reference}

Dear ${order.customer_name},

${isPartial
  ? `A partial refund of ₹${refundAmountInr} has been processed for your order ${order.order_reference}.`
  : `Your order cancellation and full refund has been processed for order ${order.order_reference}.`}

Refund Amount: ₹${refundAmountInr}
Order Reference: ${order.order_reference}
Razorpay Refund ID: ${refund.razorpay_refund_id || 'Processed via Razorpay'}
Reason: ${reasonText}

The refund has been submitted via Razorpay back to your original payment method and will reflect in 5 to 7 business days depending on your bank.

You can view your account and order history at:
${ordersUrl}

Customer Care: faizan.loyola@gmail.com | 011-69269668
DancingEarth Food Private Limited, Bengaluru.
  `;

  await sendTransactionalEmail({
    to: order.customer_email,
    subject: emailSubject,
    html: customerHtml,
    text: customerText,
  });

  // 2. Admin Alert Email
  const adminEmail = process.env.EMAIL_ADMIN_NOTIFY || 'faizan.loyola@gmail.com';
  await sendTransactionalEmail({
    to: adminEmail,
    subject: `[ADMIN NOTIFICATION] Order Refunded: ${order.order_reference} - ₹${refundAmountInr} (by ${refund.initiated_by || 'customer'})`,
    html: `
      <p>An order refund has been processed:</p>
      <p>
        <strong>Order Ref:</strong> ${order.order_reference}<br/>
        <strong>Customer:</strong> ${order.customer_name} (${order.customer_email}, ${order.customer_phone})<br/>
        <strong>Refund Type:</strong> ${isPartial ? 'PARTIAL REFUND' : 'FULL CANCELLATION & REFUND'}<br/>
        <strong>Refund Amount:</strong> ₹${refundAmountInr} (Total Order: ₹${totalOrderInr})<br/>
        <strong>Razorpay Refund ID:</strong> ${refund.razorpay_refund_id || 'N/A'}<br/>
        <strong>Initiated By:</strong> ${refund.initiated_by || 'customer'}<br/>
        <strong>Inventory Restocked:</strong> ${refund.restocked ? 'YES (Quantities restored to catalogue)' : 'NO'}<br/>
        <strong>Reason:</strong> ${reasonText}
      </p>
    `,
    text: `Order Refunded: ${order.order_reference}\nCustomer: ${order.customer_name} (${order.customer_email})\nType: ${isPartial ? 'PARTIAL' : 'FULL'}\nAmount: ₹${refundAmountInr}\nRazorpay Refund ID: ${refund.razorpay_refund_id || 'N/A'}\nReason: ${reasonText}\nRestocked: ${refund.restocked ? 'YES' : 'NO'}`,
  });
}

// Transactional notification for order dispatch and delivery status changes
export async function sendOrderFulfilmentEmail(
  order: Order,
  fulfilment_status: 'shipped' | 'delivered' | 'processing' | 'cancelled',
  carrier?: string,
  tracking_number?: string
): Promise<void> {
  const storeUrl = process.env.NEXT_PUBLIC_STORE_URL || 'http://localhost:3000';
  const ordersUrl = `${storeUrl}/store/account/orders`;
  const trackingCarrier = carrier || order.tracking_carrier || 'Cold-Chain Express';
  const trackingNumber = tracking_number || order.tracking_number || 'Dispatched';

  if (fulfilment_status === 'shipped') {
    const customerHtml = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #171717; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="border-bottom: 2px solid #171717; padding-bottom: 12px; margin-bottom: 24px;">
            <h2 style="color: #171717; margin: 0;">Retü Foods: mi-biotics™</h2>
            <p style="margin: 4px 0 0; color: #777777; font-size: 14px;">Cold-Chain Dispatch Notification</p>
          </div>

          <p>Dear <strong>${order.customer_name}</strong>,</p>
          <p>Exciting news! Your mi-biotics™ order <strong>${order.order_reference}</strong> has been packed in insulated cold-packaging and is on its way to you.</p>

          <div style="background-color: #F0FDF4; border: 1px solid #86EFAC; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px; color: #166534; font-weight: bold; font-size: 14px;">
              Shipment In Transit
            </p>
            <p style="margin: 0 0 6px; color: #14532D; font-size: 13px;">
              <strong>Courier Partner:</strong> ${trackingCarrier}
            </p>
            <p style="margin: 0; color: #14532D; font-size: 13px;">
              <strong>AWB / Tracking Number:</strong> ${trackingNumber}
            </p>
          </div>

          <div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 14px 16px; margin: 20px 0;">
            <p style="margin: 0 0 4px; color: #1E40AF; font-size: 13px; font-weight: bold;">
              Important: Cold-Chain Storage Guidance
            </p>
            <p style="margin: 0; color: #1E3A8A; font-size: 12px; line-height: 1.5;">
              mi-biotics™ contains active live cultures from our 7-millet fermentation. Please place the bottles in your refrigerator at 2°C to 4°C immediately upon delivery.
            </p>
          </div>

          <div style="background-color: #F7F5F0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px;"><strong>Delivery Destination:</strong></p>
            <p style="margin: 0; color: #555555; font-size: 13px;">
              ${order.shipping_address_line1}, ${order.shipping_city}, ${order.shipping_state} - ${order.shipping_postal_code}
            </p>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${ordersUrl}" style="background-color: #171717; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Track in Customer Account
            </a>
          </div>

          <p style="font-size: 13px; color: #777777; margin-top: 32px; border-top: 1px solid #EAEAEA; padding-top: 16px;">
            Questions or delivery updates? Contact our Bengaluru dispatch hub at <a href="mailto:faizan.loyola@gmail.com">faizan.loyola@gmail.com</a> or 011-69269668.
          </p>
        </body>
      </html>
    `;

    const customerText = `
Retü Foods: mi-biotics™
Order Dispatched: ${order.order_reference}

Dear ${order.customer_name},

Your mi-biotics™ order has been packed in insulated cold-packaging and dispatched!

Carrier: ${trackingCarrier}
Tracking Number: ${trackingNumber}
Destination: ${order.shipping_address_line1}, ${order.shipping_city}, ${order.shipping_state} - ${order.shipping_postal_code}

Storage Note: mi-biotics™ contains live active cultures. Please refrigerate bottles at 2°C to 4°C immediately upon arrival.

Track order in your account:
${ordersUrl}

Customer Care: faizan.loyola@gmail.com | 011-69269668
    `;

    await sendTransactionalEmail({
      to: order.customer_email,
      subject: `Your Order Has Shipped: ${order.order_reference} (Cold-Chain Transit) - Retü Foods`,
      html: customerHtml,
      text: customerText,
    });

    // Admin copy
    const adminEmail = process.env.EMAIL_ADMIN_NOTIFY || 'faizan.loyola@gmail.com';
    await sendTransactionalEmail({
      to: adminEmail,
      subject: `[ORDER SHIPPED] ${order.order_reference} via ${trackingCarrier} (${trackingNumber})`,
      html: `<p>Order <strong>${order.order_reference}</strong> marked shipped to ${order.customer_name} via ${trackingCarrier} (${trackingNumber}).</p>`,
      text: `Order ${order.order_reference} marked shipped to ${order.customer_name} via ${trackingCarrier} (${trackingNumber}).`,
    });
  } else if (fulfilment_status === 'delivered') {
    const customerHtml = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #171717; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="border-bottom: 2px solid #171717; padding-bottom: 12px; margin-bottom: 24px;">
            <h2 style="color: #171717; margin: 0;">Retü Foods: mi-biotics™</h2>
            <p style="margin: 4px 0 0; color: #777777; font-size: 14px;">Delivery Confirmation</p>
          </div>

          <p>Dear <strong>${order.customer_name}</strong>,</p>
          <p>Your mi-biotics™ gut health package for order <strong>${order.order_reference}</strong> has been delivered!</p>

          <div style="background-color: #ECFDF5; border: 1px solid #10B981; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 6px; color: #065F46; font-weight: bold; font-size: 14px;">
              Package Delivered
            </p>
            <p style="margin: 0; color: #047857; font-size: 13px;">
              Delivered to: ${order.shipping_address_line1}, ${order.shipping_city}, ${order.shipping_state}.
            </p>
          </div>

          <div style="background-color: #F7F5F0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px; color: #171717;">Daily Gut Health Routine:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #444444; font-size: 13px; line-height: 1.7;">
              <li><strong>Storage:</strong> Store bottles refrigerated between 2°C and 4°C immediately.</li>
              <li><strong>Usage:</strong> Drink 1 chilled 30ml shot each morning, ideally on an empty stomach or before breakfast.</li>
              <li><strong>Shake Well:</strong> Gentle settling of fermented prebiotic millet fibres is natural; shake lightly before sipping.</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${ordersUrl}" style="background-color: #171717; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              View Order in Account
            </a>
          </div>

          <p style="font-size: 13px; color: #777777; margin-top: 32px; border-top: 1px solid #EAEAEA; padding-top: 16px;">
            We love hearing your feedback! Share your experience or reach us anytime at <a href="mailto:faizan.loyola@gmail.com">faizan.loyola@gmail.com</a>.<br/>
            DancingEarth Food Private Limited, Bengaluru.
          </p>
        </body>
      </html>
    `;

    const customerText = `
Retü Foods: mi-biotics™
Delivery Confirmation: ${order.order_reference}

Dear ${order.customer_name},

Your mi-biotics™ order ${order.order_reference} has been delivered!

Daily Routine:
1. Store refrigerated at 2°C to 4°C immediately.
2. Drink 1 chilled shot daily in the morning.
3. Shake lightly before consuming.

View order in your account:
${ordersUrl}

Customer Care: faizan.loyola@gmail.com | 011-69269668
    `;

    await sendTransactionalEmail({
      to: order.customer_email,
      subject: `Delivered: Your mi-biotics™ Probiotic Shots Have Arrived - Retü Foods`,
      html: customerHtml,
      text: customerText,
    });
  }
}

// Transactional welcome email when a customer creates a permanent account
export async function sendCustomerWelcomeEmail(customer: {
  name: string;
  email: string;
  phone?: string;
}): Promise<void> {
  const storeUrl = process.env.NEXT_PUBLIC_STORE_URL || 'http://localhost:3000';
  const accountUrl = `${storeUrl}/store/account/orders`;
  const catalogueUrl = `${storeUrl}/store`;

  const customerHtml = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #171717; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="border-bottom: 2px solid #171717; padding-bottom: 12px; margin-bottom: 24px;">
          <h2 style="color: #171717; margin: 0;">Retü Foods: mi-biotics™</h2>
          <p style="margin: 4px 0 0; color: #777777; font-size: 14px;">Welcome to Your Customer Account</p>
        </div>

        <p>Dear <strong>${customer.name}</strong>,</p>
        <p>Welcome to Retü Foods! Your personal account has been created successfully.</p>

        <p>With your account, you can:</p>
        <ul style="color: #444444; font-size: 14px; line-height: 1.8;">
          <li>Track active cold-chain shipments and courier tracking links in real time</li>
          <li>Download official GST Tax Invoices (PDF) anytime</li>
          <li>Access past order history and manage delivery addresses</li>
          <li>Manage pre-dispatch order changes or cancellations seamlessly</li>
        </ul>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${accountUrl}" style="background-color: #171717; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 8px;">
            Go to My Account
          </a>
          <a href="${catalogueUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Explore mi-biotics™
          </a>
        </div>

        <p style="font-size: 13px; color: #777777; margin-top: 32px; border-top: 1px solid #EAEAEA; padding-top: 16px;">
          Need assistance with your account or order? We are here to help at <a href="mailto:faizan.loyola@gmail.com">faizan.loyola@gmail.com</a> or 011-69269668.<br/>
          DancingEarth Food Private Limited, Bengaluru, Karnataka 560038.
        </p>
      </body>
    </html>
  `;

  const customerText = `
Welcome to Retü Foods: mi-biotics™

Dear ${customer.name},

Your customer account has been created successfully.

You can view your order history, download tax invoices, and track shipments anytime at:
${accountUrl}

Customer Care: faizan.loyola@gmail.com | 011-69269668
DancingEarth Food Private Limited, Bengaluru.
  `;

  await sendTransactionalEmail({
    to: customer.email,
    subject: `Welcome to Retü Foods: Your Account is Ready`,
    html: customerHtml,
    text: customerText,
  });

  // Admin alert of new registered customer
  const adminEmail = process.env.EMAIL_ADMIN_NOTIFY || 'faizan.loyola@gmail.com';
  await sendTransactionalEmail({
    to: adminEmail,
    subject: `[NEW CUSTOMER REGISTERED] ${customer.name} (${customer.email})`,
    html: `<p>New customer registered on Retü Foods webstore:</p><p>Name: <strong>${customer.name}</strong><br/>Email: <strong>${customer.email}</strong><br/>Phone: <strong>${customer.phone || 'N/A'}</strong></p>`,
    text: `New customer registered: ${customer.name} (${customer.email}, ${customer.phone || 'N/A'})`,
  });
}

// Transactional notification when customer submits a cancellation request (Intimation before admin decision)
export async function sendCustomerCancellationRequestedEmail(order: Order, reason: string): Promise<void> {
  const storeUrl = process.env.NEXT_PUBLIC_STORE_URL || 'http://localhost:3000';
  const ordersUrl = `${storeUrl}/store/account/orders`;
  const totalInr = (order.total_paise / 100).toFixed(2);

  const customerHtml = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #171717; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="border-bottom: 2px solid #171717; padding-bottom: 12px; margin-bottom: 24px;">
          <h2 style="color: #171717; margin: 0;">Retü Foods: mi-biotics™</h2>
          <p style="margin: 4px 0 0; color: #777777; font-size: 14px;">Cancellation Request Submitted</p>
        </div>

        <p>Dear <strong>${order.customer_name}</strong>,</p>
        <p>We have received your cancellation and refund request for order <strong>${order.order_reference}</strong> (Total: ₹${totalInr}).</p>

        <div style="background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 6px; color: #92400E; font-weight: bold; font-size: 14px;">
            Request Under Admin Review
          </p>
          <p style="margin: 0; color: #78350F; font-size: 13px;">
            Because mi-biotics™ is a fresh, chilled fermented probiotic with limited cold-chain staging, our fulfilment team will verify that your package has not already been sealed for courier dispatch.
          </p>
        </div>

        <div style="background-color: #F7F5F0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px;"><strong>Order Reference:</strong> ${order.order_reference}</p>
          <p style="margin: 0 0 8px;"><strong>Reason Provided:</strong> ${reason}</p>
          <p style="margin: 0;"><strong>Current Status:</strong> Pending Store Approval</p>
        </div>

        <p style="font-size: 13px; color: #555555; line-height: 1.6;">
          You will receive an immediate confirmation email once our team reviews your request. If approved, your refund will be processed directly to your original payment method via Razorpay.
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${ordersUrl}" style="background-color: #171717; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Check Request Status in Account
          </a>
        </div>

        <p style="font-size: 13px; color: #777777; margin-top: 32px; border-top: 1px solid #EAEAEA; padding-top: 16px;">
          Need urgent changes? Contact our helpline at 011-69269668 or email <a href="mailto:faizan.loyola@gmail.com">faizan.loyola@gmail.com</a>.<br/>
          DancingEarth Food Private Limited, Bengaluru, Karnataka 560038.
        </p>
      </body>
    </html>
  `;

  const customerText = `
Retü Foods: mi-biotics™
Cancellation Request Received: ${order.order_reference}

Dear ${order.customer_name},

We have received your cancellation request for order ${order.order_reference} (Total: ₹${totalInr}).

Reason: ${reason}
Status: Pending Store Approval

Because mi-biotics™ is a chilled live probiotic beverage, our dispatch team is checking the cold-chain dispatch status of your package. You will receive an email confirmation once reviewed.

Check status in your account:
${ordersUrl}

Customer Care: faizan.loyola@gmail.com | 011-69269668
DancingEarth Food Private Limited, Bengaluru.
  `;

  await sendTransactionalEmail({
    to: order.customer_email,
    subject: `Cancellation Request Received: ${order.order_reference} - Retü Foods`,
    html: customerHtml,
    text: customerText,
  });
}

// Transactional notification alert to Admin when customer submits a cancellation request
export async function sendAdminCancellationRequestAlert(order: Order, reason: string): Promise<void> {
  const storeUrl = process.env.NEXT_PUBLIC_STORE_URL || 'http://localhost:3000';
  const adminUrl = `${storeUrl}/admin`;
  const totalInr = (order.total_paise / 100).toFixed(2);
  const adminEmail = process.env.EMAIL_ADMIN_NOTIFY || 'faizan.loyola@gmail.com';

  const adminHtml = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #171717; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="border-bottom: 2px solid #DC2626; padding-bottom: 12px; margin-bottom: 24px;">
          <h2 style="color: #DC2626; margin: 0;">Retü Foods CRM Alert</h2>
          <p style="margin: 4px 0 0; color: #777777; font-size: 14px;">Action Required: Customer Cancellation & Refund Request</p>
        </div>

        <p>A customer has submitted a request to cancel and refund an order before dispatch:</p>

        <div style="background-color: #FEF2F2; border: 1px solid #F87171; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px;"><strong>Order Reference:</strong> ${order.order_reference}</p>
          <p style="margin: 0 0 8px;"><strong>Customer:</strong> ${order.customer_name} (${order.customer_email}, ${order.customer_phone})</p>
          <p style="margin: 0 0 8px;"><strong>Order Value:</strong> ₹${totalInr}</p>
          <p style="margin: 0 0 8px;"><strong>Payment Status:</strong> ${order.payment_status} (Razorpay: ${order.razorpay_payment_id || 'N/A'})</p>
          <p style="margin: 0 0 8px;"><strong>Fulfilment Status:</strong> ${order.fulfilment_status}</p>
          <p style="margin: 0;"><strong>Customer's Reason:</strong> ${reason}</p>
        </div>

        <p>Please log in to the Admin CRM to review cold-chain dispatch status and choose an action:</p>
        <ul>
          <li><strong>Approve & Issue Refund:</strong> Cancels order, triggers Razorpay Refund API, and restocks inventory.</li>
          <li><strong>Reject Request:</strong> Keeps order active if goods are already packed or in transit.</li>
        </ul>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${adminUrl}" style="background-color: #DC2626; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Open CRM to Review Request
          </a>
        </div>
      </body>
    </html>
  `;

  const adminText = `
[ACTION REQUIRED] Customer Cancellation Request: ${order.order_reference}

Customer: ${order.customer_name} (${order.customer_email}, ${order.customer_phone})
Order Value: ₹${totalInr}
Payment: ${order.payment_status} (${order.razorpay_payment_id || 'N/A'})
Fulfilment: ${order.fulfilment_status}
Reason: ${reason}

Please log in to the Admin Dashboard to Approve & Refund or Reject:
${adminUrl}
  `;

  await sendTransactionalEmail({
    to: adminEmail,
    subject: `[ACTION REQUIRED] Cancellation Request: ${order.order_reference} by ${order.customer_name}`,
    html: adminHtml,
    text: adminText,
  });
}

// Transactional notification when Admin rejects a customer's cancellation request
export async function sendCustomerCancellationRejectedEmail(order: Order, adminNotes?: string): Promise<void> {
  const storeUrl = process.env.NEXT_PUBLIC_STORE_URL || 'http://localhost:3000';
  const ordersUrl = `${storeUrl}/store/account/orders`;
  const explanation = adminNotes || 'Your order has already been scheduled for cold-chain courier dispatch and cannot be recalled.';

  const customerHtml = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #171717; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="border-bottom: 2px solid #171717; padding-bottom: 12px; margin-bottom: 24px;">
          <h2 style="color: #171717; margin: 0;">Retü Foods: mi-biotics™</h2>
          <p style="margin: 4px 0 0; color: #777777; font-size: 14px;">Cancellation Request Update</p>
        </div>

        <p>Dear <strong>${order.customer_name}</strong>,</p>
        <p>Regarding your cancellation request for order <strong>${order.order_reference}</strong>:</p>

        <div style="background-color: #F3F4F6; border: 1px solid #D1D5DB; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 6px; color: #1F2937; font-weight: bold; font-size: 14px;">
            Order Remains Active for Delivery
          </p>
          <p style="margin: 0; color: #374151; font-size: 13px;">
            ${explanation}
          </p>
        </div>

        <p style="font-size: 13px; color: #555555; line-height: 1.6;">
          Your chilled package is progressing through our Bengaluru fulfilment line. Once dispatched, you will receive real-time courier tracking details.
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${ordersUrl}" style="background-color: #171717; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            View Order Status
          </a>
        </div>

        <p style="font-size: 13px; color: #777777; margin-top: 32px; border-top: 1px solid #EAEAEA; padding-top: 16px;">
          If you have questions or special delivery instructions, please contact our team at <a href="mailto:faizan.loyola@gmail.com">faizan.loyola@gmail.com</a> or 011-69269668.<br/>
          DancingEarth Food Private Limited, Bengaluru.
        </p>
      </body>
    </html>
  `;

  const customerText = `
Retü Foods: mi-biotics™
Cancellation Request Update: ${order.order_reference}

Dear ${order.customer_name},

Your cancellation request for order ${order.order_reference} could not be approved.

Update: ${explanation}

Your package remains active for delivery. You can monitor your shipment status at:
${ordersUrl}

Customer Care: faizan.loyola@gmail.com | 011-69269668
  `;

  await sendTransactionalEmail({
    to: order.customer_email,
    subject: `Cancellation Request Update: ${order.order_reference} - Retü Foods`,
    html: customerHtml,
    text: customerText,
  });
}

// Transactional notification when Admin cancels an order directly
export async function sendOrderCancelledEmail(order: Order, reason?: string): Promise<void> {
  const storeUrl = process.env.NEXT_PUBLIC_STORE_URL || 'http://localhost:3000';
  const ordersUrl = `${storeUrl}/store/account/orders`;
  const reasonText = reason || 'Cancelled by store administrator';

  const customerHtml = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #171717; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="border-bottom: 2px solid #171717; padding-bottom: 12px; margin-bottom: 24px;">
          <h2 style="color: #171717; margin: 0;">Retü Foods: mi-biotics™</h2>
          <p style="margin: 4px 0 0; color: #777777; font-size: 14px;">Order Cancellation Notice</p>
        </div>

        <p>Dear <strong>${order.customer_name}</strong>,</p>
        <p>Your order <strong>${order.order_reference}</strong> has been cancelled.</p>

        <div style="background-color: #F3F4F6; border: 1px solid #D1D5DB; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 6px; color: #1F2937; font-weight: bold; font-size: 14px;">
            Order Status: Cancelled
          </p>
          <p style="margin: 0; color: #4B5563; font-size: 13px;">
            Reason: ${reasonText}
          </p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${ordersUrl}" style="background-color: #171717; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            View Account
          </a>
        </div>

        <p style="font-size: 13px; color: #777777; margin-top: 32px; border-top: 1px solid #EAEAEA; padding-top: 16px;">
          Questions? Contact us at <a href="mailto:faizan.loyola@gmail.com">faizan.loyola@gmail.com</a> or 011-69269668.
        </p>
      </body>
    </html>
  `;

  const customerText = `
Retü Foods: mi-biotics™
Order Cancellation: ${order.order_reference}

Dear ${order.customer_name},

Your order ${order.order_reference} has been cancelled.
Reason: ${reasonText}

View your account at:
${ordersUrl}

Customer Care: faizan.loyola@gmail.com | 011-69269668
  `;

  await sendTransactionalEmail({
    to: order.customer_email,
    subject: `Order Cancelled: ${order.order_reference} - Retü Foods`,
    html: customerHtml,
    text: customerText,
  });
}


