'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { img, navLinks, storeLinks } from '@/lib/brand';

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 sm:h-20 sm:px-8">
        <Link href="/" aria-label="Retü home" onClick={() => setOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.logoBlack} alt="Retü" className="h-7 w-auto sm:h-9" />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-[15px] text-black hover:opacity-70 ${pathname === l.href ? 'underline underline-offset-4' : ''}`}
            >
              {l.label}
            </Link>
          ))}
          <div className="flex items-center gap-3">
            <Link
              href="/the-wait-list"
              className="rounded-md bg-black px-5 py-3 font-button text-[14px] font-medium text-white hover:bg-neutral-800"
            >
              Join The Culture
            </Link>
            <a
              href={storeLinks.store}
              className="rounded-md bg-brand-pink px-5 py-3 font-button text-[14px] font-medium text-white hover:bg-[#d01039]"
            >
              Buy Now
            </a>
          </div>
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <a href={storeLinks.store} className="rounded-md bg-brand-pink px-4 py-2 font-button text-[13px] font-medium text-white">
            Buy Now
          </a>
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="p-2"
          >
            <span className="block h-0.5 w-6 bg-black" />
            <span className="mt-1.5 block h-0.5 w-6 bg-black" />
            <span className="mt-1.5 block h-0.5 w-6 bg-black" />
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-neutral-100 bg-white px-4 pb-6 pt-2 lg:hidden">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block py-3 text-lg text-black">
              {l.label}
            </Link>
          ))}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Link
              href="/the-wait-list"
              onClick={() => setOpen(false)}
              className="rounded-md bg-black py-3 text-center font-button text-sm font-medium text-white"
            >
              Join The Culture
            </Link>
            <a href={storeLinks.store} className="rounded-md bg-brand-pink py-3 text-center font-button text-sm font-medium text-white">
              Buy Now
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
