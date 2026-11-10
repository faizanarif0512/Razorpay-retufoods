import type { Metadata } from 'next';
import FlavourCards from '@/components/brand/FlavourCards';
import { Button, Deco, Eyebrow, Heading, Section } from '@/components/brand/ui';
import { img, storeLinks } from '@/lib/brand';

export const metadata: Metadata = { title: 'The Product' };

const faqs = [
  {
    q: 'How is this different from a dairy probiotic or a yogurt drink?',
    a: 'Most probiotic drinks are dairy-based — which doesn’t suit the large share of adults across Asia who are lactose intolerant. mi-biotics™ is fully dairy-free, built on fermented millet rather than milk, and designed around a whole-food matrix rather than a single added strain.',
  },
  { q: 'Is it vegan?', a: 'Yes — 100% plant-based.' },
  { q: 'Does it need refrigeration?', a: 'Yes. mi-biotics™ is a live, chilled product. Keep it cold.' },
  { q: 'Who is it for?', a: 'Anyone over the age of 5 years, who wants to support their gut health as part of a normal routine.' },
  {
    q: 'Is there added sugar?',
    a: 'No sweeteners are added to mi-biotics™. The small amount of sugar it contains occurs naturally — from the real fruits and vegetables and from the fermented millet base itself.',
  },
  {
    q: 'What does “fermented multi-millet matrix” mean?',
    a: 'It’s the patented base that the fruits, vegetables, and spices are built on — fermented to make nutrients more bio-available and the whole drink easier for your system to use.',
  },
];

export default function ProductPage() {
  return (
    <>
      <Section bg={img.bgClouds} inner="text-center">
        <Heading lead={<span className="text-brand-pink">mi-biotics™ —</span>} accent={<span className="text-black">a gut shot built for your biology</span>} as="h1" className="mx-auto max-w-3xl !text-[30px] sm:!text-[40px]" />
        <div className="mx-auto mt-8 max-w-4xl space-y-5 text-[15px] leading-relaxed">
          <p>
            mi-biotics™ is a chilled, fermented multi-millet gut shot. 75ml, taken once a day, on your schedule. It’s made from
            real fruits, vegetables, and spices, added to a fermented multi-millet base of bajra, jowar, and ragi — completely
            dairy-free, clean-label, and free of preservatives. No powders, no synthetic additives, no shortcuts.
          </p>
          <p>
            It is also the first product from the patented mi-matrix™ platform at the heart of everything Retü® makes. This
            drink is where the platform starts — not where it ends.
          </p>
        </div>
        <Button href={storeLinks.store} className="mt-8 px-10">
          Buy Now
        </Button>
      </Section>

      <Section bg={img.bgProduct} inner="text-center">
        <Deco src={img.dragonfly} className="right-4 top-16 hidden w-40 md:block" />
        <Deco src={img.dino} className="-left-4 bottom-10 hidden w-28 md:block" />
        <Eyebrow>The Product</Eyebrow>
        <Heading lead={<span className="text-brand-pink">Join The Culture -</span>} accent={<span className="text-black">Sample Launch Flavours</span>} className="mx-auto mt-4 max-w-2xl" />
        <div className="text-left">
          <FlavourCards />
        </div>
      </Section>

      <Section>
        <Deco src={img.whatsIn} className="-left-8 top-6 hidden w-28 md:block" />
        <Deco src={img.whatsInArt2} className="-right-6 bottom-6 hidden w-32 md:block" />
        <div className="grid items-center gap-10 lg:grid-cols-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.whatsInArt} alt="" className="mx-auto w-full max-w-md" />
          <div>
            <Heading lead="What’s in it — and" accent="what isn’t" />
            <p className="mt-6 text-[15px] leading-relaxed">
              Real fruits, real vegetables, real spices, live cultures, and a fermented multi-millet base. That’s the whole story.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed">
              No dairy. No added sugar. No added preservatives. No artificial colours, flavours, or sweeteners. Nothing you’d need
              a chemistry degree to recognise.
            </p>
          </div>
        </div>
      </Section>

      <Section bg={img.bgShake}>
        <div className="max-w-xl">
          <Eyebrow>Just Shake &amp; Drink</Eyebrow>
          <Heading lead="How to" accent="use it" className="mt-4" />
          <p className="mt-6 text-[15px] leading-relaxed">
            Your gut. Your schedule. One 75ml shot a day, whenever it fits your routine — morning, midday, or evening. Keep it
            chilled. Shake it and drink. That’s it.
          </p>
        </div>
      </Section>

      <Section bg={img.bgProduct} inner="max-w-4xl">
        <div className="text-center">
          <Eyebrow>FAQ</Eyebrow>
          <Heading lead="Questions" accent="people ask" className="mt-4" />
        </div>
        <div className="mt-10 divide-y divide-neutral-200 rounded-2xl bg-white px-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)] sm:px-10">
          {faqs.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {f.q}
                <span className="text-2xl text-brand-pink transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-neutral-700">{f.a}</p>
            </details>
          ))}
        </div>
      </Section>
    </>
  );
}
