import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Sparkles, Droplets, ArrowRight, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Gut Microbiome & Health | Retü Foods mi-biotics™',
  description:
    'Understanding the gut microbiome, dysbiosis, short-chain fatty acids (SCFAs), and how live fermented millet gut shots restore cellular diversity.',
};

export default function MicrobiomePage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-retu-charcoal text-white py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-widest text-retu-pink">
              Microbial Ecology
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mt-3 leading-tight">
              Understanding Your Gut Microbiome
            </h1>
            <p className="text-base sm:text-lg text-gray-300 mt-4 leading-relaxed">
              Inside your gastrointestinal tract reside over thirty-eight trillion microorganisms: a complex ecosystem regulating digestion, immune readiness, mental focus, and metabolic vitality.
            </p>
          </div>
        </div>
      </section>

      {/* Guide Content */}
      <section className="py-20 bg-retu-warm-white/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-retu-border shadow-sm space-y-4">
            <h2 className="text-2xl font-bold text-retu-charcoal">
              The Second Brain & The Gut-Brain Axis
            </h2>
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
              More than 90% of the body’s serotonin (the neurotransmitter regulating mood, sleep, and appetite) and 70% of the human immune system reside directly in your gut lining. When the delicate balance between beneficial bacteria and opportunistic microbes is disrupted: a condition known as <em>dysbiosis</em>: the consequences extend far beyond simple bloating.
            </p>
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
              Symptoms of chronic gut imbalance include brain fog, midday fatigue, unpredictable bowel habits, food intolerances, and skin inflammation.
            </p>
          </div>

          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-retu-border shadow-sm space-y-4">
            <h2 className="text-2xl font-bold text-retu-charcoal">
              Why Short-Chain Fatty Acids (SCFAs) Matter
            </h2>
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
              When beneficial microbes ferment complex resistant starches: such as those found in bajra, jowar, and ragi: they generate short-chain fatty acids (SCFAs), primarily acetate, propionate, and butyrate.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-retu-warm-white rounded-2xl border border-retu-border text-center">
                <h4 className="font-bold text-sm text-retu-charcoal">Butyrate</h4>
                <p className="text-[11px] text-gray-600 mt-1">
                  Primary fuel source for colon epithelial cells; strengthens mucosal gut barrier.
                </p>
              </div>
              <div className="p-4 bg-retu-warm-white rounded-2xl border border-retu-border text-center">
                <h4 className="font-bold text-sm text-retu-charcoal">Propionate</h4>
                <p className="text-[11px] text-gray-600 mt-1">
                  Travels to the liver to modulate cholesterol synthesis and glucose metabolism.
                </p>
              </div>
              <div className="p-4 bg-retu-warm-white rounded-2xl border border-retu-border text-center">
                <h4 className="font-bold text-sm text-retu-charcoal">Acetate</h4>
                <p className="text-[11px] text-gray-600 mt-1">
                  Crosses the blood-brain barrier to promote satiety and central nervous system balance.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-retu-border shadow-sm space-y-4">
            <h2 className="text-2xl font-bold text-retu-charcoal">
              How mi-biotics™ Restores Microbial Diversity
            </h2>
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
              Unlike single-strain pills that flood the digestive tract with a single isolate, mi-biotics™ provides a harmonious ecosystem: living lactic acid bacteria, organic millet prebiotics, and postbiotic metabolites delivered in a bioavailable 75ml chilled shot.
            </p>
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-2 text-xs text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>10+ Billion CFU living active cultures protected in a millet cushion</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Validated in Asian human microbiomes by AMILI Singapore</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Zero lactose, zero dairy allergens, zero chemical stabilizers</span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="p-8 bg-retu-charcoal text-white rounded-3xl text-center space-y-3">
            <h3 className="text-xl font-bold">Start Your Daily Gut Protocol</h3>
            <p className="text-xs text-gray-300 max-w-md mx-auto">
              One 75ml shot every day. Keep cold, shake well, and experience noticeable digestion improvements in 14 days.
            </p>
            <div className="pt-2">
              <Link
                href="/store/products"
                className="inline-flex items-center gap-2 px-6 py-3 bg-retu-pink text-white rounded-xl text-xs font-bold hover:bg-pink-600 transition-colors"
              >
                <span>Browse Products</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
