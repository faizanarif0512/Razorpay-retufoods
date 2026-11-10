import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Award, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Our Story | The Origin of Retü Foods & mi-biotics™',
  description:
    'Learn how Ritu nursed her husband through 19 days in COVID-19 ICU by rebuilding his gut microbiome, leading to Indian Patent No. 551921 and mi-biotics™.',
};

export default function OurStoryPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-retu-charcoal text-white py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-widest text-retu-pink">
              The Origin & Heritage
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mt-3 leading-tight">
              Built by an Inventor, Not a Marketer
            </h1>
            <p className="text-base sm:text-lg text-gray-300 mt-4 leading-relaxed">
              Retü Foods was born not in a boardroom, but in a hospital intensive care unit. Discover how a wife’s determination to rebuild her husband’s cellular vitality transformed ancient Indian millet wisdom into a patented biotech breakthrough.
            </p>
          </div>
        </div>
      </section>

      {/* Main Narrative */}
      <section className="py-20 bg-retu-warm-white/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="bg-white p-8 sm:p-12 rounded-3xl border border-retu-border shadow-sm space-y-6">
            <div className="flex items-center gap-3 text-retu-pink">
              <Heart className="w-5 h-5 fill-retu-pink" />
              <span className="text-xs font-bold uppercase tracking-wider">A Personal Battle</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-retu-charcoal">
              Nineteen Days in the ICU
            </h2>

            <p className="text-sm text-gray-700 leading-relaxed">
              In 2020, during the height of the COVID-19 pandemic, Lavindra was admitted to the intensive care unit, where he spent nineteen harrowing days fighting for his life. While doctors successfully stabilized his lungs, massive courses of emergency antibiotics had virtually obliterated his internal gut microbiome.
            </p>

            <p className="text-sm text-gray-700 leading-relaxed">
              His wife, Ritu: a former United Nations social-development professional, functional nutrition researcher, and pioneer who previously created India’s first vegan cheese line: recognized that traditional recovery protocols were insufficient. His cellular energy was depleted, his digestive barrier was compromised, and conventional dairy-based probiotics caused severe inflammation.
            </p>

            <div className="p-5 bg-retu-warm-white rounded-2xl border border-retu-border text-xs text-gray-700 italic leading-relaxed">
              &ldquo;I didn&apos;t set out to start a beverage company. I set out to save my husband&apos;s gut from complete cellular collapse after 19 days of intensive antibiotic bombardment.&rdquo;
              <p className="mt-2 font-bold text-retu-charcoal not-italic">- Ritu, Founder & Patent Holder</p>
            </div>
          </div>

          <div className="bg-white p-8 sm:p-12 rounded-3xl border border-retu-border shadow-sm space-y-6">
            <div className="flex items-center gap-3 text-retu-purple">
              <Award className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Ancient Grains Meet Modern Bio-Tech</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-retu-charcoal">
              The Birth of the Multi-Millet Matrix
            </h2>

            <p className="text-sm text-gray-700 leading-relaxed">
              Drawing upon traditional Indian grain fermentation practices and clinical immunology, Ritu engineered a liquid multi-millet fermentation base utilizing Pearl Millet (Bajra), Sorghum (Jowar), and Finger Millet (Ragi). The complex starches and unique phenolic compounds in these ancient millets served as the perfect prebiotic shield, allowing live therapeutic strains to flourish without dairy or synthetic additives.
            </p>

            <p className="text-sm text-gray-700 leading-relaxed">
              Lavindra’s recovery was remarkable: his energy rebounded, gastrointestinal inflammation ceased, and microbiome diversity was restored. Recognizing the millions of people suffering from chronic dysbiosis, bloating, and fatigue, Ritu formalized the proprietary process.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 text-xs text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>October 2024:</strong> Granted Indian Patent No. 551921 for the fermented multi-millet vegan probiotic composition.</span>
              </div>
              <div className="flex items-start gap-3 text-xs text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>AMILI Singapore:</strong> Independent multi-omics verification demonstrating proven short-chain fatty acid stimulation in Asian adult gut samples.</span>
              </div>
              <div className="flex items-start gap-3 text-xs text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Dedicated Clean Facility:</strong> Purpose-built line in Coimbatore, Tamil Nadu, 100% free of dairy cross-contamination.</span>
              </div>
            </div>
          </div>

          {/* CTA Box */}
          <div className="p-8 sm:p-10 bg-retu-charcoal text-white rounded-3xl text-center space-y-4">
            <h3 className="text-2xl font-bold">Experience the Innovation for Yourself</h3>
            <p className="text-xs text-gray-300 max-w-lg mx-auto">
              Delivered chilled directly to your doorstep in refrigerated cold-chain packaging. Start with a 6-pack trial or the 24-pack monthly protocol.
            </p>
            <div className="pt-2">
              <Link
                href="/store/products"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-retu-pink text-white rounded-xl text-xs font-bold hover:bg-pink-600 transition-colors shadow-lg"
              >
                <span>Shop mi-biotics™ Catalogue</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
