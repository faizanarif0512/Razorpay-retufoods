import { Button, Heading, Section } from './ui';
import { img } from '@/lib/brand';

// Layout shared by the Mango and Lychee pages
export default function FlavourPage({
  name,
  packs,
  render,
  nutrition,
  buyHref,
}: {
  name: string;
  packs: string;
  render: string;
  nutrition: string;
  buyHref: string;
}) {
  return (
    <Section bg={img.bgSoft}>
      <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <Heading lead="The flavour -" accent={name} as="h1" className="!text-[30px] sm:!text-[40px]" />
          <div className="mt-8 space-y-4 border-y border-neutral-200 py-6 text-[15px] leading-relaxed">
            <p>❋ Real fruits, real vegetables, real spices, live cultures, and a fermented multi-millet base.</p>
            <p>❋ No dairy. No added sugar. No added preservatives. No artificial colours, flavours, or sweeteners</p>
          </div>
          <Button href={buyHref} className="mt-8 px-10">
            Buy Now
          </Button>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={packs} alt={`mi-biotics ${name} bottles`} className="w-full rounded-2xl object-cover sm:col-span-2" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={render} alt={`mi-biotics ${name} label design`} className="w-full rounded-2xl object-cover sm:col-span-2" />
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={nutrition} alt={`${name} nutritional facts`} className="w-full self-start rounded-2xl lg:sticky lg:top-28" />
      </div>
    </Section>
  );
}
