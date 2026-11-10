import React from 'react';
import Link from 'next/link';
import { HelpCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Frequently Asked Questions (FAQ) | Retü Foods mi-biotics™',
  description:
    'Answers regarding mi-biotics™ refrigeration, daily dosage, 45-day shelf life, dairy-free certification, and cold-chain express delivery.',
};

const faqs = [
  {
    q: 'What is mi-biotics™?',
    a: 'mi-biotics™ is a 75ml chilled, fermented multi-millet gut shot developed by Retü Foods. Formulated from ancient bajra (pearl millet), jowar (sorghum), and ragi (finger millet), infused with real Alphonso mango or lychee, and fortified with clinically documented bio-actives: LGG® and Wellmune®.',
  },
  {
    q: 'When and how should I take my daily shot?',
    a: 'Drink one 75ml chilled bottle once every day, whenever it fits your routine (morning on an empty stomach, alongside lunch, or in the evening). Gently shake the bottle before drinking. Always enjoy chilled directly from the refrigerator.',
  },
  {
    q: 'Does mi-biotics™ require continuous refrigeration?',
    a: 'Yes. Because mi-biotics™ contains living, active cultures with zero chemical preservatives, it must be stored in the refrigerator at 2°C to 8°C. Do not freeze.',
  },
  {
    q: 'What is the shelf life?',
    a: 'Under proper continuous refrigeration (2°C to 8°C), mi-biotics™ maintains optimal probiotic viability and peak flavor for 45 days from the date of manufacture.',
  },
  {
    q: 'Is it completely dairy-free, lactose-free, and vegan?',
    a: 'Yes, 100%. Unlike standard curd, yogurt, or dairy probiotics, mi-biotics™ is produced on a dedicated, purpose-built dairy-free line in Coimbatore, Tamil Nadu. It contains zero milk derivatives, zero lactose, and zero animal products.',
  },
  {
    q: 'Is there any added sugar?',
    a: 'No. mi-biotics™ contains zero added refined sugar, artificial sweeteners, or synthetic syrups. The light, clean sweetness comes purely from whole fruit purees and slow-digesting millet starches.',
  },
  {
    q: 'How does cold-chain delivery work?',
    a: 'All orders are dispatched from our cold-storage fulfillment hub in Bengaluru inside custom insulated thermal packaging with non-toxic, reusable ice gel packs. Orders over ₹999 receive free cold-chain express transit.',
  },
  {
    q: 'How do I track my order or download my GST tax invoice?',
    a: 'Every order is permanently linked to your customer account. Simply visit the "My Account" or "Track Orders" page and log in with your email and password to view real-time courier dispatch status and instant PDF invoices.',
  },
];

export default function FaqPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-retu-charcoal text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-retu-pink">
            Customer Support & Information
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-2">
            Frequently Asked Questions
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 mt-3 max-w-xl mx-auto">
            Everything you need to know about consuming, storing, and ordering mi-biotics™ fermented millet gut shots.
          </p>
        </div>
      </section>

      {/* FAQ Accordion Grid */}
      <section className="py-16 bg-retu-warm-white/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white p-6 rounded-2xl border border-retu-border shadow-sm space-y-2"
            >
              <h3 className="text-sm sm:text-base font-bold text-retu-charcoal flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-retu-pink shrink-0 mt-0.5" />
                <span>{faq.q}</span>
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed pl-6">
                {faq.a}
              </p>
            </div>
          ))}

          {/* Contact Assistance Box */}
          <div className="p-8 bg-white rounded-3xl border border-retu-border text-center space-y-3 mt-10">
            <h4 className="text-base font-bold text-retu-charcoal">Have an unanswered question?</h4>
            <p className="text-xs text-gray-500">
              Our clinical and customer care team in Bengaluru is ready to assist you.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link
                href="/store/contact"
                className="px-5 py-2.5 bg-retu-charcoal text-white rounded-xl text-xs font-bold hover:bg-black transition-colors"
              >
                Contact Support
              </Link>
              <Link
                href="/store/products"
                className="px-5 py-2.5 bg-retu-pink text-white rounded-xl text-xs font-bold hover:bg-pink-600 transition-colors"
              >
                Shop Now
              </Link>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
