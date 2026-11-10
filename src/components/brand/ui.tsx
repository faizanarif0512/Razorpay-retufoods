import Link from 'next/link';
import React from 'react';

export function Eyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[11px] font-semibold tracking-[0.15em] uppercase text-brand-pink ${className}`}>{children}</p>
  );
}

// Display heading: `accent` renders in brand pink after the black lead text
export function Heading({
  lead,
  accent,
  as: Tag = 'h2',
  className = '',
}: {
  lead?: React.ReactNode;
  accent?: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
}) {
  const size =
    Tag === 'h1'
      ? 'text-[36px] sm:text-[52px] tracking-[0.1em]'
      : Tag === 'h2'
      ? 'text-[26px] sm:text-[38px] tracking-[0.1em]'
      : 'text-[20px] sm:text-[24px] tracking-[0.1em]';
  return (
    <Tag className={`font-display font-bold leading-[1.2] ${size} ${className}`}>
      {lead && <span className="text-black">{lead}</span>}
      {lead && accent ? ' ' : null}
      {accent && <span className="text-brand-pink">{accent}</span>}
    </Tag>
  );
}

const variants = {
  pink: 'bg-brand-pink text-white hover:bg-[#d01039]',
  black: 'bg-black text-white hover:bg-neutral-800',
  outline: 'border border-brand-pink text-brand-pink bg-white hover:bg-brand-blush',
};

export function Button({
  href,
  children,
  variant = 'pink',
  className = '',
}: {
  href: string;
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  const cls = `inline-flex items-center justify-center rounded-md px-6 py-3 font-button text-[14px] font-medium tracking-[0.02em] transition-colors ${variants[variant]} ${className}`;
  if (href.startsWith('http')) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

// Section with a soft full-bleed background artwork, as on the Squarespace site
export function Section({
  bg,
  children,
  className = '',
  inner = '',
}: {
  bg?: string;
  children: React.ReactNode;
  className?: string;
  inner?: string;
}) {
  return (
    <section
      className={`relative overflow-hidden bg-cover bg-center ${className}`}
      style={bg ? { backgroundImage: `url('${bg}')` } : undefined}
    >
      <div className={`relative mx-auto max-w-6xl px-4 sm:px-8 py-16 sm:py-24 ${inner}`}>{children}</div>
    </section>
  );
}

// Decorative brand artwork positioned around a section
export function Deco({ src, className }: { src: string; className: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" aria-hidden className={`pointer-events-none absolute select-none ${className}`} />;
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)] ${className}`}>{children}</div>;
}
