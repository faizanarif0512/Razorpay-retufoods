import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Truck, Clock, Award } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-retu-charcoal text-white pt-16 pb-12 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Value Trust Badges */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-gray-800 text-sm">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-retu-pink">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white">Granted Indian Patent</h4>
              <p className="text-gray-400 text-xs mt-1">Patent No. 551921: Fermented Multi-Millet Composition</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white">Independently Validated</h4>
              <p className="text-gray-400 text-xs mt-1">Tested in vitro against Asian gut microbiome by AMILI Singapore</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-retu-mango">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white">Cold-Chain Delivery</h4>
              <p className="text-gray-400 text-xs mt-1">Dedicated refrigerated transit (2-8°C) to keep live cultures active</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-purple-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white">Clean-Label & Vegan</h4>
              <p className="text-gray-400 text-xs mt-1">100% plant-based, dairy-free, zero added sugar, no chemical preservatives</p>
            </div>
          </div>
        </div>

        {/* Brand & Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 py-12 border-b border-gray-800 text-sm">
          
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="relative w-40 h-10 brightness-0 invert">
              <Image
                src="/images/brand/retu-logo.png"
                alt="Retü Foods"
                fill
                className="object-contain object-left"
              />
            </div>
            <p className="text-gray-400 text-xs leading-relaxed max-w-sm">
              mi-biotics™ is the first product from the patented mi-matrix™ platform at the heart of everything Retü® makes. A daily 75ml chilled fermented millet gut shot engineered for real metabolic and microbiome health.
            </p>
            <div className="pt-2 text-xs text-gray-400 space-y-1">
              <p><strong className="text-gray-300">India Office:</strong> DancingEarth Food Private Limited</p>
              <p>2nd Floor, 235 Binnamangala, 13th Cross Road, Indiranagar, Bengaluru 560038</p>
              <p>Phone: 011-69269668 · Email: <a href="mailto:faizan.loyola@gmail.com" className="text-retu-pink hover:underline">faizan.loyola@gmail.com</a></p>
              <p className="text-gray-500 pt-1"><strong className="text-gray-400">Singapore Office:</strong> GreenGourmet Foods Pte. Ltd., 160 Robinson Road #14-04, Singapore 068914</p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h5 className="font-semibold text-white mb-4 text-xs tracking-wider uppercase">Store Navigation</h5>
            <ul className="space-y-2.5 text-xs text-gray-400">
              <li><Link href="/store" className="hover:text-white transition-colors">Store Home</Link></li>
              <li><Link href="/store/products" className="hover:text-white transition-colors">All Products</Link></li>
              <li><Link href="/store/cart" className="hover:text-white transition-colors">Shopping Cart</Link></li>
              <li><Link href="/store/checkout" className="hover:text-white transition-colors">Direct Checkout</Link></li>
              <li><Link href="/store/account/orders" className="hover:text-white transition-colors">My Orders</Link></li>
              <li><Link href="/store/account/login" className="hover:text-white transition-colors">Customer Login</Link></li>
            </ul>
          </div>

          {/* The Science & Brand (Independent Internal Routes) */}
          <div>
            <h5 className="font-semibold text-white mb-4 text-xs tracking-wider uppercase">Science & Heritage</h5>
            <ul className="space-y-2.5 text-xs text-gray-400">
              <li><Link href="/store/science" className="hover:text-white transition-colors">Clinical Evidence</Link></li>
              <li><Link href="/store/science#matrix" className="hover:text-white transition-colors">mi-matrix™ Platform</Link></li>
              <li><Link href="/store/microbiome" className="hover:text-white transition-colors">Gut Microbiome Guide</Link></li>
              <li><Link href="/store/our-story" className="hover:text-white transition-colors">Founder&apos;s Story</Link></li>
              <li><Link href="/store/faq" className="hover:text-white transition-colors">FAQ & Shelf Life</Link></li>
              <li><Link href="/store/contact" className="hover:text-white transition-colors">Contact & Support</Link></li>
            </ul>
          </div>

          {/* Legal & Policies */}
          <div>
            <h5 className="font-semibold text-white mb-4 text-xs tracking-wider uppercase">Policies & Admin</h5>
            <ul className="space-y-2.5 text-xs text-gray-400">
              <li><span className="text-gray-300">Cold-Chain Shipping Policy:</span> Deliveries dispatched in insulated boxes with cold gel packs.</li>
              <li><span className="text-gray-300">Returns Policy:</span> Perishable live items cannot be restocked; damaged goods replaced upon delivery notice.</li>
              <li><span className="text-gray-300">Razorpay Verified:</span> 256-bit SSL secured payments via UPI, Cards, NetBanking.</li>
              <li className="pt-2">
                <Link href="/admin" className="text-retu-pink hover:underline font-medium flex items-center gap-1">
                  Seller Admin Portal →
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>© {new Date().getFullYear()} Retü® · DancingEarth Food Private Limited, Bengaluru. All rights reserved.</p>
          <p>mi-biotics™: Indian Patent No. 551921 · LGG® is a trademark of Chr. Hansen A/S · Wellmune® is a trademark of Kerry Group.</p>
        </div>
      </div>
    </footer>
  );
}
