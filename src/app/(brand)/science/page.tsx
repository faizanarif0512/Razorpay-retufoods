import type { Metadata } from 'next';
import { Button, Card, Deco, Eyebrow, Heading, Section } from '@/components/brand/ui';
import { img, storeLinks } from '@/lib/brand';

export const metadata: Metadata = { title: 'The Science' };

export default function SciencePage() {
  return (
    <>
      <Section bg={img.bgProduct} inner="text-center">
        <Deco src={img.dino} className="-left-2 bottom-4 hidden w-24 md:block" />
        <Eyebrow>The Science</Eyebrow>
        <Heading lead="The evidence" accent="behind the bottle" as="h1" className="mt-4 !text-[30px] sm:!text-[40px]" />
        <p className="mx-auto mt-8 max-w-4xl text-[15px] leading-relaxed">
          mi-biotics™ is built on a simple idea taken seriously: the active ingredient is not a single strain dropped into a
          drink, but a fermented multi-millet matrix — a whole-food system engineered so that what it does inside the body can be
          measured, not just claimed. Below is the evidence, with the studies and the citations, so you can check it yourself.
        </p>
      </Section>

      <Section>
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <Eyebrow>Patent</Eyebrow>
            <Heading lead="Protected where" accent="it matters most." className="mt-4" />
            <div className="mt-6 space-y-4 text-[15px] leading-relaxed">
              <p className="font-semibold">Indian Patent No. 551921 — granted October 2024.</p>
              <p>A composition-and-process patent on the fermented multi-millet matrix at the heart of mi-biotics™.</p>
              <p>
                In a category where food inventions are routinely refused as “mere admixtures,” protecting the composition itself
                — not just a method of making it — is the harder and more meaningful grant.
              </p>
              <p>It secures the matrix in India for twenty years.</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.madeInIndia} alt="Made in India" className="mt-8 h-20 w-auto" />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.patent} alt="Indian Patent No. 551921" className="w-full rounded-2xl shadow-lg" />
        </div>
      </Section>

      <Section bg={img.bgPinkWave3}>
        <div className="text-center">
          <Eyebrow>Ingredients</Eyebrow>
          <Heading lead="Built on the most-studied" accent="ingredients in the field" className="mx-auto mt-4 max-w-3xl" />
          <p className="mx-auto mt-6 max-w-3xl text-[15px] leading-relaxed">
            Before anything is fermented, the matrix is built around two of the most thoroughly researched functional ingredients
            available — the kind most brands pay a premium to use, and then never test beyond the supplier’s own data sheet.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <Card className="p-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.lgg} alt="Chr. Hansen LGG" className="h-16 w-auto" />
            <p className="mt-6 font-semibold">LGG® — Lacticaseibacillus rhamnosus GG, from Chr. Hansen (now part of Novonesis).</p>
            <p className="mt-4 text-sm leading-relaxed">
              Chr. Hansen describes LGG® as the world’s most documented probiotic strain — supported by more than 2,000 scientific
              publications, including around 300 clinical-study publications — first isolated from a healthy human gut in 1985 and
              in food use since 1990. The World Gastroenterology Organisation references it in several areas of gut health.
            </p>
          </Card>
          <Card className="p-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.wellmune} alt="Wellmune" className="h-16 w-auto" />
            <p className="mt-6 font-semibold">Wellmune® — baker’s-yeast beta 1,3/1,6 glucan, from Kerry.</p>
            <p className="mt-4 text-sm leading-relaxed">
              Kerry describes Wellmune® as the most clinically researched yeast beta-glucan of its kind, and the first ingredient
              studied as an oral “trainer” of the innate immune system — backed by more than 50 studies, including over a dozen
              clinical trials in more than 2,300 adults and children.
            </p>
          </Card>
        </div>
      </Section>

      <Section>
        <Deco src={img.blobYellow} className="right-0 top-10 hidden w-24 md:block" />
        <Eyebrow>The Validation</Eyebrow>
        <Heading lead="Why we validated the whole product—" accent="not just the strains" className="mt-4 max-w-3xl" />
        <div className="mt-8 max-w-4xl space-y-5 text-[15px] leading-relaxed">
          <p>Here is the distinction most people never think to ask about, and it’s the one we’re proudest of.</p>
          <p>
            Almost every functional-food brand that uses an ingredient like LGG® or Wellmune® cites the ingredient maker’s research
            — studies that tested the strain or the glucan on its own, in isolation. That research is excellent, and it tells you
            the ingredient works. It tells you nothing about how that ingredient behaves inside this product — in this medium, at
            this dose, fermented alongside these millets, fruits, and spices. A strain’s behaviour changes with the company it keeps.
          </p>
          <p>
            So, we did the harder and more expensive thing: we had the finished formulation tested as a whole — the matrix and its
            cultures working together — against an Asian gut microbiome. As far as we are aware, no comparable product in the
            category has validated the complete combination this way, rather than borrowing the reputations of its ingredients. The
            science on this page is about mi-biotics™ as you actually drink it, not about its parts in a test tube somewhere else.
          </p>
        </div>
      </Section>

      <Section bg={img.bgProduct}>
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.6fr]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.amili} alt="AMILI validated" className="mx-auto w-full max-w-xs" />
          <div>
            <Eyebrow>Testing</Eyebrow>
            <Heading lead="Who did the testing?" accent="AMILI" className="mt-4" />
            <div className="mt-6 space-y-5 text-[15px] leading-relaxed">
              <p>
                We took mi-biotics™ to AMILI, Singapore’s precision gut-microbiome company. Founded in 2019 by clinicians and
                scientists — its name stands for Asia Microbiome Library — AMILI built and runs Southeast Asia’s first and only
                gut-microbiome bank and what it describes as the world’s largest multi-ethnic Asian gut-microbiome database. That
                Asian reference library is the point: it makes the results relevant to Asian biology specifically, not to a Western
                gut. AMILI independently validates the gut-health effects of other companies’ products; mi-biotics™ is one of them.
              </p>
              <p>
                In AMILI’s 2023 study, across the formulations tested, the matrix promoted beneficial bacteria (L. paracasei),
                suppressed pathogenic species (C. perfringens, E. coli), and increased fibre and carbohydrate breakdown — the
                activity you’d want from a working probiotic system. In one formulation specifically — the Mixed Fruit &amp;
                Vegetable formulation at 20% — the study recorded a 99% reduction in TMAO production potential and a 57% increase in
                microbial serotonin production capacity, the largest effects in the study.
              </p>
            </div>
            <Button href={storeLinks.store} className="mt-8 px-10">
              Buy Now
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
