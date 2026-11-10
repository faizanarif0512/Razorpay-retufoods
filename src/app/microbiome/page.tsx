import type { Metadata } from 'next';
import StatCards from '@/components/brand/StatCards';
import { Button, Card, Deco, Eyebrow, Heading, Section } from '@/components/brand/ui';
import { img, storeLinks } from '@/lib/brand';

export const metadata: Metadata = { title: 'The Microbiome' };

const roles = [
  {
    title: 'Digestion and metabolites.',
    body: 'Your gut microbes break down fibres your own body can’t, turning them into compounds it can use — including short-chain fatty acids, which nourish your gut lining. In fact, a large share of the small molecules circulating in your body are shaped by the microbiome in some way — around 71% of those measured, in one major study. What you feed it, it turns into what feeds you.',
  },
  {
    title: 'Immunity.',
    body: 'By common estimates, around 70% of the body’s immune tissue is concentrated in and around the gut wall — the gut-associated lymphoid tissue (GALT) — in constant conversation with the microbes on the other side. A balanced microbiome helps that system stay calibrated.',
  },
  {
    title: 'The gut–brain connection.',
    body: 'Around 90% of the body’s serotonin is produced not in the brain but in the gut — by specialised enterochromaffin cells in the gut lining, with gut microbes helping regulate how much is made. It’s one of the clearest illustrations of why “gut feeling” isn’t just a figure of speech.',
  },
];

export default function MicrobiomePage() {
  return (
    <>
      <Section bg={img.bgWaitList} inner="text-center">
        <Eyebrow>The Microbiome</Eyebrow>
        <Heading lead="Why your gut runs more" accent="than your digestion" as="h1" className="mx-auto mt-4 max-w-3xl !text-[30px] sm:!text-[40px]" />
        <StatCards />
      </Section>

      <Section bg={img.bgProduct}>
        <Deco src={img.blobPurple} className="right-0 top-6 hidden w-28 md:block" />
        <Deco src={img.blobPink} className="-left-4 bottom-6 hidden w-20 md:block" />
        <Heading lead="What the gut microbiome" accent="actually does" className="text-center" />
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {roles.map((r) => (
            <Card key={r.title} className="p-8">
              <p className="font-bold text-brand-pink">{r.title}</p>
              <p className="mt-3 text-sm leading-relaxed">{r.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section bg={img.bgClouds2}>
        <Deco src={img.blobYellow} className="right-4 top-10 hidden w-20 md:block" />
        <Eyebrow>Longevity</Eyebrow>
        <Heading lead="The gut and" accent="how we age" className="mt-4" />
        <div className="mt-8 max-w-4xl space-y-5 text-[15px] leading-relaxed">
          <p>
            “Longevity” gets used loosely. The more useful idea is healthspan — not how long you live, but how many of those years
            you spend well. A growing body of research places the gut close to the centre of it.
          </p>
          <p>
            The link is the machinery described above, read over a longer horizon. As we age, the microbiome tends to lose diversity
            and low-grade inflammation tends to rise — a drift researchers have nicknamed “inflammaging.” Because gut microbes help
            regulate inflammation, train the immune system, and produce or suppress compounds that circulate through the body, the
            state of that community is one of the factors that shapes how the body holds up over time.
          </p>
          <p>
            One example is TMAO, a compound produced by gut microbes that research has associated with cardiometabolic risk. How much
            of it your gut produces depends partly on which microbes are present and what they are fed — precisely the kind of thing
            a fibre-rich, fermented, plant-based diet can influence.
          </p>
          <p>
            None of this is a promise of extra years, and no single food delivers them. The honest takeaway is simpler, and stronger:
            the gut is one of the most modifiable systems we have, and the choices that support it — fibre, fermentation, a
            diversity of plants — are among the most accessible levers for ageing well.
          </p>
        </div>
      </Section>

      <Section bg={img.bgProduct}>
        <Deco src={img.blobPink} className="right-4 top-8 hidden w-20 md:block" />
        <Heading lead="Why modern guts" accent="are under pressure" />
        <p className="mt-8 max-w-4xl text-[15px] leading-relaxed">
          The diversity that keeps a microbiome resilient is being eroded. Industrialised diets have narrowed what we eat — a
          striking share of the world&apos;s food (by one widely cited estimate, around three-quarters) now comes from just 12 crops —
          while antibiotics, ultra-processed food, and modern living reduce the microbial community further. Studies of populations
          still eating traditional, high-fibre diets show gut diversity that industrialised guts have largely lost.
        </p>
      </Section>

      <Section bg={img.bgClouds2}>
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.4fr]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img loading="lazy" decoding="async" src={img.magicMillet} alt="Millet" className="mx-auto w-full max-w-sm" />
          <div>
            <Heading lead="Where millet" accent="comes in" />
            <p className="mt-6 text-[15px] leading-relaxed">
              Millets are among the oldest cultivated grains, domesticated more than ten thousand years ago, and they are rich in
              exactly the kind of fibre a microbiome thrives on. Fermenting millets — as mi-biotics™ does — makes their nutrients
              more bio-available. Adding live cultures to that makes the product rich in prebiotics, probiotics, and postbiotics.
              It’s an ancient food, asked to do a modern job.
            </p>
            <Button href={storeLinks.store} className="mt-8 px-10">
              Buy Now
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
