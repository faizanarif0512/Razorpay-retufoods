import type { Metadata } from 'next';
import { Section } from '@/components/brand/ui';

export const metadata: Metadata = { title: 'Refund, Return & Cancellation Policy' };

// Retü's policy as supplied by the client. Bracketed values are still to be confirmed by them.
const sections: { title: string; body: string[] }[] = [
  {
    title: 'A perishable product',
    body: [
      'mi-biotics™ is a fresh, refrigerated, live-culture food product with a limited shelf life. For food-safety and hygiene reasons it cannot be returned, resold, or restocked once accepted at delivery. We do not offer returns or refunds for change of mind, incorrect ordering, or a change in your requirements after dispatch.',
    ],
  },
  {
    title: 'Check at the point of delivery',
    body: [
      'Every order is handed over against a signature and/or a one-time password (OTP). Before accepting, please check that the pack is cold to the touch and intact. If it is not chilled, leaking, or damaged, refuse the delivery at handover — do not sign or share the OTP — and it will be returned to us for a full replacement or refund. Once you sign or share the OTP, the order is deemed to have been received in good external condition (cold and intact). Latent issues that were not reasonably visible at handover, and any food-safety concern, remain covered under the section below.',
    ],
  },
  {
    title: 'Replacement or refund after acceptance',
    body: [
      'After acceptance, we will replace or refund your order where it is the wrong flavour or item, is short in quantity, or has a latent defect or food-safety issue that was not reasonably visible at delivery. Please write to us at [support email] within 12 hours of delivery (or by 12 noon the next day for deliveries made after 6 pm), with your order number, the batch code and best-before date shown on the pack, and a clear photograph of the issue. Routine chilling and external condition are checked and settled at the doorstep and are not claimable after acceptance.',
    ],
  },
  {
    title: 'Cancellations',
    body: [
      'You may cancel your order for a full refund any time before dispatch. Once an order has been dispatched it cannot be cancelled, as the cold chain has begun. If we cancel your order — for example, for stock, cold-chain, or serviceability reasons — you receive a full refund.',
      'Subscriptions can be paused or cancelled at any time from My Account. Cancelling stops all future charges; a box that has already been dispatched cannot be cancelled.',
    ],
  },
  {
    title: 'Failed, missed, or refused delivery',
    body: [
      'If you refuse delivery because the product is not chilled or is damaged, you receive a full replacement or refund. If a delivery cannot be completed for reasons attributable to you — no one available to receive it, an incorrect address, or refusal without valid reason — the product perishes in transit and is not eligible for refund or re-delivery. Please ensure someone is available to receive and refrigerate your order.',
    ],
  },
  {
    title: 'How refunds are made',
    body: [
      'Approved refunds are processed to your original payment method within [7–10] business days, or as required under applicable law. Replacements are sent on the next available dispatch.',
    ],
  },
  {
    title: 'Grievance redressal',
    body: [
      'If you have any complaint or concern, please contact our Grievance Officer, [name], at [grievance email] / [phone]. We will acknowledge your complaint within 48 hours of receipt and endeavour to resolve it within one month, in line with the Consumer Protection (E-Commerce) Rules, 2020.',
    ],
  },
  {
    title: 'Your statutory rights',
    body: ['Nothing in this policy limits your rights under the Consumer Protection Act, 2019 or any other applicable law.'],
  },
  {
    title: 'Marketplace orders',
    body: [
      "Purchases made through a third-party marketplace or quick-commerce platform are governed by that platform's return and refund policy.",
    ],
  },
  {
    title: 'Seller details',
    body: [
      'Sold by: DancingEarth Food Private Limited (Retü Foods). Registered office: [registered address]. FSSAI Licence No.: [FSSAI number]. Customer care: [email] · [phone].',
    ],
  },
];

export default function RefundPolicyPage() {
  return (
    <Section inner="max-w-3xl">
      <h1 className="text-[30px] font-bold leading-tight sm:text-[38px]">
        Refund, Return &amp; <span className="text-brand-pink">Cancellation Policy</span>
      </h1>
      <p className="mt-3 text-sm text-neutral-600">Retü Foods — mi-biotics™ · DancingEarth Food Private Limited · Effective date: [date]</p>
      <div className="mt-8 space-y-7">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-xl font-bold">{s.title}</h2>
            {s.body.map((para) => (
              <p key={para.slice(0, 40)} className="mt-2 text-[15px] leading-relaxed text-neutral-800">
                {para}
              </p>
            ))}
          </section>
        ))}
      </div>
    </Section>
  );
}
