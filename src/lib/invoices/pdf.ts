import PDFDocument from 'pdfkit';
import type { Order } from '../db/service.ts';

export interface InvoiceRecord {
  id: string;
  order_id: string;
  invoice_number: string;
  invoice_date: string;
  company_name: string;
  company_address: string;
  gstin: string;
  customer_name: string;
  customer_email: string;
  customer_address: string;
  subtotal_paise: number;
  tax_paise: number;
  shipping_paise: number;
  total_paise: number;
  created_at: string;
}

export function generateInvoicePdfBuffer(order: Order, invoice: InvoiceRecord): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const supportEmail = process.env.INVOICE_SUPPORT_EMAIL || 'faizan.loyola@gmail.com';
      const supportPhone = process.env.INVOICE_SUPPORT_PHONE || '011-69269668';

      // 1. Header Left: Seller Information
      doc.fillColor('#171717').fontSize(16).font('Helvetica-Bold').text('Retü Foods', 40, 40);
      doc.fillColor('#4B5563').fontSize(9).font('Helvetica').text('mi-biotics: Fermented Multi-Millet Gut Shots', 40, 60);
      doc.text(invoice.company_name || 'DancingEarth Food Private Limited', 40, 72);
      doc.text('2nd Floor, 235 Binnamangala, 13th Cross, Indiranagar', 40, 84);
      doc.text('Bengaluru, Karnataka 560038, India', 40, 96);
      doc.text(`Phone: ${supportPhone} | ${supportEmail}`, 40, 108);
      doc.text(`GSTIN: ${invoice.gstin || 'UNREGISTERED / CONSUMER B2C'}`, 40, 120);

      // 1. Header Right: Invoice Metadata & Status
      doc.fillColor('#171717').fontSize(20).font('Helvetica-Bold').text('TAX INVOICE', 350, 40, { align: 'right' });
      doc.fillColor('#059669').fontSize(10).font('Helvetica-Bold').text('[ PAID IN FULL ]', 350, 65, { align: 'right' });
      doc.fillColor('#374151').fontSize(9).font('Helvetica');
      doc.text(`Invoice No: ${invoice.invoice_number}`, 350, 82, { align: 'right' });
      doc.text(`Invoice Date: ${invoice.invoice_date}`, 350, 95, { align: 'right' });
      doc.text(`Order Reference: ${order.order_reference}`, 350, 108, { align: 'right' });
      doc.text(`Payment ID: ${order.razorpay_payment_id || 'Captured'}`, 350, 121, { align: 'right' });

      // Horizontal Divider
      doc.strokeColor('#E5E7EB').lineWidth(1).moveTo(40, 140).lineTo(555, 140).stroke();

      // 2. Billing & Dispatch Metadata
      doc.fillColor('#171717').fontSize(10).font('Helvetica-Bold').text('BILLED TO (CUSTOMER)', 40, 155);
      doc.fillColor('#374151').fontSize(9).font('Helvetica');
      doc.text(invoice.customer_name, 40, 170);
      doc.text(invoice.customer_address, 40, 183, { width: 240 });
      doc.text(`Email: ${invoice.customer_email}`, 40, 212);
      doc.text(`Mobile: ${order.customer_phone}`, 40, 225);

      doc.fillColor('#171717').fontSize(10).font('Helvetica-Bold').text('DISPATCH & CLINICAL DETAILS', 320, 155);
      doc.fillColor('#374151').fontSize(9).font('Helvetica');
      doc.text('Cold-Chain Packaging: Insulated Corrugated Pack', 320, 170);
      doc.text('Temperature Protocol: 2 C to 8 C Refrigerated', 320, 183);
      doc.text('Indian Patent No. 551921 (Granted Oct 2024)', 320, 196);
      doc.text('Bio-Actives: LGG Probiotic and Wellmune Beta-Glucan', 320, 209);
      doc.text('Facility: Dedicated Dairy-Free Line, Coimbatore', 320, 222);

      // Horizontal Divider
      doc.strokeColor('#E5E7EB').lineWidth(1).moveTo(40, 250).lineTo(555, 250).stroke();

      // 3. Table Header
      const tableTop = 265;
      doc.rect(40, tableTop, 515, 20).fill('#F3F4F6');
      doc.fillColor('#171717').fontSize(8.5).font('Helvetica-Bold');
      doc.text('#', 45, tableTop + 5);
      doc.text('Description of Goods', 65, tableTop + 5);
      doc.text('SKU', 290, tableTop + 5);
      doc.text('Qty', 370, tableTop + 5, { width: 30, align: 'right' });
      doc.text('Unit Price', 415, tableTop + 5, { width: 60, align: 'right' });
      doc.text('Total (INR)', 485, tableTop + 5, { width: 65, align: 'right' });

      // Table Rows
      let curY = tableTop + 24;
      const items = order.items || [];
      items.forEach((item, idx) => {
        doc.fillColor('#374151').fontSize(8.5).font('Helvetica');
        doc.text(String(idx + 1), 45, curY);
        doc.font('Helvetica-Bold').text(item.product_name, 65, curY);
        doc.font('Helvetica').fillColor('#6B7280').text(item.variant_name, 65, curY + 11);
        doc.fillColor('#374151').text(item.sku, 290, curY);
        doc.text(String(item.quantity), 370, curY, { width: 30, align: 'right' });
        doc.text(`Rs. ${(item.unit_price_paise / 100).toFixed(2)}`, 415, curY, { width: 60, align: 'right' });
        doc.font('Helvetica-Bold').text(`Rs. ${(item.total_price_paise / 100).toFixed(2)}`, 485, curY, { width: 65, align: 'right' });

        curY += 26;
        doc.strokeColor('#F3F4F6').lineWidth(0.5).moveTo(40, curY).lineTo(555, curY).stroke();
        curY += 6;
      });

      // 4. Totals Summary
      const totalsY = Math.max(curY + 10, 420);
      doc.strokeColor('#E5E7EB').lineWidth(1).moveTo(320, totalsY).lineTo(555, totalsY).stroke();

      doc.fillColor('#4B5563').fontSize(9).font('Helvetica');
      doc.text('Subtotal:', 340, totalsY + 10);
      doc.fillColor('#171717').text(`Rs. ${(invoice.subtotal_paise / 100).toFixed(2)}`, 450, totalsY + 10, { width: 100, align: 'right' });

      doc.fillColor('#4B5563').text('Refrigerated Delivery (2-8 C):', 340, totalsY + 24);
      doc.fillColor('#059669').font('Helvetica-Bold').text('FREE', 450, totalsY + 24, { width: 100, align: 'right' });

      doc.fillColor('#4B5563').font('Helvetica').text('Taxes & GST (Included):', 340, totalsY + 38);
      doc.fillColor('#171717').text('Rs. 0.00', 450, totalsY + 38, { width: 100, align: 'right' });

      doc.rect(320, totalsY + 54, 235, 26).fill('#171717');
      doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
      doc.text('TOTAL PAID:', 330, totalsY + 62);
      doc.text(`Rs. ${(invoice.total_paise / 100).toFixed(2)}`, 450, totalsY + 62, { width: 95, align: 'right' });

      // 5. Notes & Footer Box
      const footerY = 680;
      doc.rect(40, footerY, 515, 60).fill('#F9FAFB');
      doc.strokeColor('#E5E7EB').lineWidth(1).rect(40, footerY, 515, 60).stroke();

      doc.fillColor('#171717').fontSize(8.5).font('Helvetica-Bold').text('Quality & Storage Assurance:', 50, footerY + 8);
      doc.fillColor('#4B5563').fontSize(8).font('Helvetica');
      doc.text('Store chilled between 2 C to 8 C at all times. Best consumed within 45 days of manufacture date.', 50, footerY + 20);
      doc.text(`For support or batch inquiries: ${supportEmail} | Helpline: ${supportPhone}`, 50, footerY + 32);
      doc.fillColor('#9CA3AF').fontSize(7.5).text('This is an authenticated computer-generated invoice issued by DancingEarth Food Private Limited, Bengaluru.', 50, footerY + 44);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
