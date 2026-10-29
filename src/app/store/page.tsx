import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Award, ArrowRight, CheckCircle2, Sparkles, Truck, Droplets } from 'lucide-react';
import { getAllProducts } from '@/lib/db/service';
import StoreProductCard from '@/components/products/StoreProductCard';

// Rebuilt at most once a minute; checkout re-checks price and stock on the server
export const revalidate = 60;

export default async function StorePage() {
  const products = await getAllProducts(false);

  return (
    <div className="bg-white">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-retu-warm-white via-white to-white py-16 lg:py-24 border-b border-retu-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-retu-border shadow-sm text-xs font-semibold text-retu-charcoal">
                <span className="w-2 h-2 rounded-full bg-retu-pink"></span>
                <span>Indian Patent No. 551921 · Granted October 2024</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-retu-charcoal tracking-tight leading-[1.15]">
                REVIVE. RESTORE. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-retu-pink to-retu-purple">
                  REGENERATE.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-gray-600 max-w-2xl leading-relaxed">
                Your gut. Your schedule. A clean-label fermented multi-millet gut shot, built for your biology: patented, independently validated, and 100% dairy-free.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/store/products"
                  className="px-8 py-3.5 bg-retu-charcoal text-white rounded-md text-sm font-bold hover:bg-black transition-all shadow-md hover:shadow-lg flex items-center gap-2 active:scale-95"
                >
                  <span>Shop The Collection</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/store/science"
                  className="px-6 py-3.5 bg-white text-retu-charcoal border border-retu-border rounded-md text-sm font-semibold hover:bg-retu-warm-white transition-colors"
                >
                  Clinical Evidence
                </Link>
              </div>

              {/* Bullet proof features */}
              <div className="pt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-gray-600 border-t border-retu-border/60">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>0% Dairy & Lactose</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>0% Added Sugars</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>LGG® & Wellmune®</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Bajra, Jowar & Ragi</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>AMILI Tested in Singapore</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Refrigerated Delivery</span>
                </div>
              </div>
            </div>

            {/* Right Product Showcase Render */}
            <div className="lg:col-span-5 relative flex justify-center">
              <div className="relative w-72 sm:w-80 lg:w-96 aspect-[3/4] max-h-[500px]">
                {/* Decorative glow */}
                <div className="absolute inset-0 bg-gradient-to-tr from-retu-mango/20 via-retu-pink/15 to-purple-500/10 rounded-3xl blur-2xl -z-10" />
                <div className="w-full h-full relative rounded-2xl overflow-hidden p-6 flex flex-col items-center justify-center">
                  <Image
                    src="/images/products/mibiotics-mango.png"
                    alt="mi-biotics™ Fermented Millet Gut Shot"
                    fill
                    priority
                    className="object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </div>

              {/* Floating verified badge */}
              <div className="absolute -bottom-4 right-4 bg-white/95 backdrop-blur-md border border-retu-border p-3.5 rounded-xl shadow-xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="text-left text-xs">
                  <p className="font-bold text-retu-charcoal">10+ Billion CFU</p>
                  <p className="text-gray-500">Living Active Probiotics</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* PRODUCT CATALOGUE SECTION */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-retu-pink">Launch Formulations</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-retu-charcoal mt-2 tracking-tight">
              A Gut Shot Built for Your Biology
            </h2>
            <p className="text-gray-600 text-sm sm:text-base mt-3">
              One 75ml daily chilled shot taken on your schedule. Built from whole fruits, ancient grains, and living cultures, never powders or synthetic isolates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => (
              <StoreProductCard key={product.id} product={product} />
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/store/products"
              className="inline-flex items-center gap-2 text-sm font-bold text-retu-charcoal hover:text-retu-pink transition-colors border-b-2 border-retu-charcoal pb-0.5 hover:border-retu-pink"
            >
              <span>Explore All Pack Configurations</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* THE SCIENCE & PATENT SECTION */}
      <section id="science-matrix" className="py-20 bg-retu-warm-white border-y border-retu-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-bold uppercase tracking-widest text-retu-purple">Scientific Integrity</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-retu-charcoal tracking-tight">
                Evidence, Not Adjectives.
              </h2>
              <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
                mi-biotics™ is built on a simple premise: the active ingredient is not a single strain added as an afterthought, but a <strong>fermented multi-millet whole-food matrix</strong> engineered so that what it accomplishes inside the human microbiome is rigorously measured.
              </p>

              <div className="space-y-4 pt-2">
                <div className="p-4 bg-white rounded-xl border border-retu-border flex items-start gap-4 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-retu-pink/10 flex items-center justify-center shrink-0 text-retu-pink">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-retu-charcoal">Granted Indian Patent No. 551921</h4>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Granted in October 2024 for <em>Fermented Multi-Millet, Fruit-Based Vegan Probiotic Composition and Method of Preparing the Same</em>.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-xl border border-retu-border flex items-start gap-4 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-600">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-retu-charcoal">Independently Validated by AMILI (Singapore)</h4>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Tested in vitro against Asian human gut microbiomes, showing significant short-chain fatty acid (SCFA) precursors and gut barrier enhancement.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-xl border border-retu-border flex items-start gap-4 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-retu-mango/20 flex items-center justify-center shrink-0 text-yellow-700">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-retu-charcoal">Global Bio-Actives: LGG® & Wellmune®</h4>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Formulated with clinically documented LGG® (Lactobacillus rhamnosus GG by Chr. Hansen) and Wellmune® (yeast beta glucan by Kerry).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 bg-white p-8 rounded-2xl border border-retu-border shadow-sm space-y-6">
              <h3 className="text-xl font-bold text-retu-charcoal">Why A Dedicated Line Matters</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Most probiotics are manufactured on shared dairy facilities or retrofitted lines. Retü Foods operates a <strong>dedicated, purpose-built, 100% dairy-free line in Coimbatore, Tamil Nadu</strong> built exclusively around a live, clean-label fermented product.
              </p>
              
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-retu-warm-white rounded-lg text-center">
                  <Droplets className="w-6 h-6 text-retu-pink mx-auto mb-1.5" />
                  <p className="text-lg font-extrabold text-retu-charcoal">0% Dairy</p>
                  <p className="text-xs text-gray-500">100% Asian adult friendly</p>
                </div>
                <div className="p-4 bg-retu-warm-white rounded-lg text-center">
                  <Truck className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                  <p className="text-lg font-extrabold text-retu-charcoal">2°C to 8°C</p>
                  <p className="text-xs text-gray-500">Refrigerated cold-chain</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-xs text-gray-600">
                <p>
                  <strong>How to use:</strong> One 75ml shot a day, whenever it fits your daily routine (morning, midday, or evening). Keep cold, shake well, and drink.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FOUNDER STORY HIGHLIGHT */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-12 rounded-3xl bg-retu-charcoal text-white relative overflow-hidden shadow-2xl">
            <div className="relative z-10 max-w-2xl space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest text-retu-pink">The Origin</span>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Built by an Inventor, Not a Marketer.
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Ritu, former UN social-development professional, clinical practitioner, and creator of India’s first vegan cheese category, holds the patent on the multi-millet matrix. She formulated mi-biotics™ after nursing her husband Lavindra through 19 days of intensive care during COVID-19, rebuilding his depleted gut microbiome from the cellular level up.
              </p>
              <div className="pt-2">
                <Link
                  href="/store/our-story"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-retu-pink hover:text-white transition-colors"
                >
                  <span>Read Ritu & Lavindra’s Full Story</span>
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
