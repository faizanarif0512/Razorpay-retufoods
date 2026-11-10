import Link from 'next/link';
import { img, storeLinks } from '@/lib/brand';
import { Button, Card } from './ui';

const flavours = [
  { name: 'Mango', image: img.mangoBottles, info: '/mango', buy: storeLinks.mango },
  { name: 'Lychee', image: img.lycheeBottles, info: '/lychee', buy: storeLinks.lychee },
];

// The two launch flavours, each with a Buy Now that opens its page in the online store
export default function FlavourCards() {
  return (
    <>
      <div className="mt-8 grid gap-8 md:grid-cols-2">
        {flavours.map((f) => (
          <Card key={f.name} className="overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" decoding="async" src={f.image} alt={`mi-biotics ${f.name}`} className="aspect-[4/3] w-full object-cover" />
            <div className="p-6 sm:p-8">
              <h3 className="font-display text-2xl font-bold tracking-[0.1em]">{f.name}</h3>
              <p className="mt-3 text-sm leading-relaxed">
                No dairy. No added sugar. No added preservatives. No artificial colours, flavours, or sweeteners.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-5">
                <Button href={f.buy} className="px-8">
                  Buy Now
                </Button>
                <Link href={f.info} className="text-sm font-semibold text-brand-pink underline underline-offset-4">
                  More Info →
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-brand-purple">
        ( <strong>Coming Soon:</strong> Spicy Jeera — Carrot &amp; Pumpkin (Mixed Fruit &amp; Vegetable) — Matcha — Lemongrass
        &amp; Ginger — Pandan — Mixed Berry )
      </p>
    </>
  );
}
