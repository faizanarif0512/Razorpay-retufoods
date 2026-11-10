import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Award, ShieldCheck, Sparkles, Droplets, Truck, ArrowRight, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'The Science of mi-biotics™ | Patent No. 551921 & AMILI Validation',
  description:
    'Discover the scientific clinical validation, Indian Patent No. 551921, AMILI Singapore research, and LGG® & Wellmune® bio-actives behind mi-biotics™.',
};

export default function SciencePage() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-retu-charcoal text-white py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-widest text-retu-pink">
              Evidence, Not Adjectives
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mt-3 leading-tight">
              The Science of mi-biotics™
            </h1>
            <p className="text-base sm:text-lg text-gray-300 mt-4 leading-relaxed">
              mi-biotics™ is built on a clear clinical foundation: the therapeutic active ingredient is not a strain added as an afterthought, but a patented fermented multi-millet whole-food matrix engineered and rigorously validated inside the human microbiome.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/store/products"
                className="px-6 py-3.5 bg-retu-pink text-white rounded-xl text-xs font-bold hover:bg-pink-600 transition-colors flex items-center gap-2"
              >
                <span>Shop Clinically Validated Range</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Pillars Grid */}
      <section className="py-20 bg-retu-warm-white/60 border-b border-retu-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-retu-purple">
              Clinical Validation
            </span>
            <h2 className="text-3xl font-extrabold text-retu-charcoal mt-2">
              Three Scientific Pillars
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-2">
              Every bottle of mi-biotics™ delivers three independently validated health innovations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pillar 1: Patent */}
            <div className="bg-white p-8 rounded-3xl border border-retu-border shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-retu-pink/10 text-retu-pink flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-retu-charcoal">
                Granted Indian Patent No. 551921
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Granted in October 2024 for: <em>Fermented Multi-Millet, Fruit-Based Vegan Probiotic Composition and Method of Preparing the Same</em>. Protects our proprietary fermentation dynamics of ancient bajra, jowar, and ragi.
              </p>
              <div className="pt-2 text-[11px] text-gray-500 font-medium border-t border-gray-100">
                Official Patent Office, Government of India
              </div>
            </div>

            {/* Pillar 2: AMILI Singapore */}
            <div className="bg-white p-8 rounded-3xl border border-retu-border shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-retu-charcoal">
                AMILI Singapore Validation
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Tested in vitro against Asian human gut microbiomes by AMILI (Southeast Asia&apos;s leading precision microbiome firm). Confirmed substantial increases in short-chain fatty acids (SCFAs), including butyrate and acetate.
              </p>
              <div className="pt-2 text-[11px] text-gray-500 font-medium border-t border-gray-100">
                Precision Microbiome Multi-Omics Research
              </div>
            </div>

            {/* Pillar 3: Bio-Actives */}
            <div className="bg-white p-8 rounded-3xl border border-retu-border shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-retu-mango/20 text-yellow-700 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-retu-charcoal">
                LGG® & Wellmune® Bio-Actives
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Fortified with clinically researched LGG® (Lactobacillus rhamnosus GG by Chr. Hansen: backed by 1,000+ scientific publications) and Wellmune® (yeast beta-glucan by Kerry Group: proven immune defense).
              </p>
              <div className="pt-2 text-[11px] text-gray-500 font-medium border-t border-gray-100">
                Documented Strain Specificity
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The mi-matrix Platform Deep Dive */}
      <section id="matrix" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-xs font-bold uppercase tracking-widest text-retu-pink">
                Proprietary Bio-Tech
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-retu-charcoal tracking-tight">
                Why Living Fermented Liquid Beats Dormant Powders
              </h2>
              <p className="text-sm text-gray-700 leading-relaxed">
                Most probiotics sold in pharmacies are freeze-dried powders sealed inside capsules. Once ingested, these dormant bacteria require hours to rehydrate in an acidic stomach before they can begin colonization. Many fail to survive the transit.
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                In contrast, mi-biotics™ is a <strong>living, liquid culture</strong> nurtured in a fermented matrix of bajra (pearl millet), jowar (sorghum), and ragi (finger millet). The microbes are metabolically active and already producing beneficial postbiotics, organic acids, and enzymes when you drink them.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  '10+ Billion CFU living active cultures in every 75ml shot',
                  'Naturally buffered by ancient grains against stomach bile',
                  'Rich in polyphenols, resistant starch, and prebiotic fibers',
                  '100% dairy-free, vegan, clean-label with zero added sugar',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs text-retu-charcoal font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-retu-warm-white p-8 sm:p-10 rounded-3xl border border-retu-border space-y-6">
              <h3 className="text-xl font-bold text-retu-charcoal">
                Coimbatore Dedicated Facility
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                To guarantee zero cross-contamination with dairy allergens, Retü Foods commissioned a purpose-built manufacturing facility in Coimbatore, Tamil Nadu. Designed specifically around live, clean-label fermented millet products.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-retu-border text-center">
                  <Droplets className="w-6 h-6 text-retu-pink mx-auto mb-1.5" />
                  <p className="text-base font-extrabold text-retu-charcoal">Zero Dairy</p>
                  <p className="text-[11px] text-gray-500">100% plant-based line</p>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-retu-border text-center">
                  <Truck className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                  <p className="text-base font-extrabold text-retu-charcoal">2°C to 8°C</p>
                  <p className="text-[11px] text-gray-500">Refrigerated cold-chain</p>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/store/products"
                  className="w-full py-3.5 bg-retu-charcoal text-white rounded-xl text-xs font-bold hover:bg-black transition-colors flex items-center justify-center gap-2"
                >
                  <span>Order Your 6, 12, or 24 Pack Starter</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
