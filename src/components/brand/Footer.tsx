import Link from 'next/link';
import { img } from '@/lib/brand';

export default function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-8 md:grid-cols-[1fr_1fr_2.4fr]">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.logoBlack} alt="Retü" className="h-8 w-auto" />
          <div className="mt-6 flex items-center gap-4">
            <a href="https://www.linkedin.com/company/retufoods/" aria-label="LinkedIn">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" decoding="async" src={img.linkedin} alt="" className="h-5 w-5" />
            </a>
            <a href="https://www.instagram.com/retufoods" aria-label="Instagram">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" decoding="async" src={img.instagram} alt="" className="h-5 w-5" />
            </a>
          </div>
          <div className="mt-10 flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" decoding="async" src={img.foodtech500} alt="FoodTech 500" className="h-16 w-auto" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" decoding="async" src={img.mcFinalist} alt="MassChallenge Finalist" className="h-16 w-auto" />
          </div>
        </div>

        <div>
          <h3 className="font-display text-xl font-bold tracking-[0.08em] text-brand-pink">Learn</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li><Link href="/science" className="underline underline-offset-2">The Science</Link></li>
            <li><Link href="/the-product" className="underline underline-offset-2">The Product</Link></li>
            <li><Link href="/microbiome" className="underline underline-offset-2">The Microbiome</Link></li>
          </ul>
          <h3 className="mt-8 font-display text-xl font-bold tracking-[0.08em] text-brand-pink">Shop</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li><Link href="/store" className="underline underline-offset-2">Buy mi-biotics™</Link></li>
            <li><Link href="/store/account/orders" className="underline underline-offset-2">My Orders</Link></li>
            <li><Link href="/store/contact" className="underline underline-offset-2">Contact &amp; Support</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-display text-xl font-bold tracking-[0.08em] text-brand-pink">Connect</h3>
          <div className="mt-4 grid gap-8 text-sm sm:grid-cols-2">
            <div>
              <p className="font-bold">India Office</p>
              <p className="mt-2 leading-relaxed">
                DancingEarth Food Private Limited
                <br />2nd Floor, 235 Binnamangala,
                <br />13th Cross Road,
                <br />Indiranagar, Bengaluru 560038
                <br />India.
              </p>
              <p className="mt-4">Phone No. 011-69269669</p>
              <p className="mt-4">
                Email: <a href="mailto:restoreme@retufoods.com" className="underline">restoreme@retufoods.com</a>
              </p>
            </div>
            <div>
              <p className="font-bold">Singapore Office</p>
              <p className="mt-2 leading-relaxed">
                GreenGourmet Foods Pte. Ltd.
                <br />160 Robinson Road,
                <br />#14-04,
                <br />Singapore 068914
              </p>
            </div>
          </div>
        </div>
      </div>
      <p className="border-t border-neutral-100 px-4 py-6 text-center text-xs text-neutral-600">
        Retü® · DancingEarth Food Private Limited, Bengaluru · mi-biotics™ — Indian Patent No. 551921 (granted in India)
      </p>
    </footer>
  );
}
