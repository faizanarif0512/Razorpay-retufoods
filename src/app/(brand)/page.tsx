import Link from 'next/link';
import FlavourCards from '@/components/brand/FlavourCards';
import Video from '@/components/brand/Video';
import StatCards from '@/components/brand/StatCards';
import { Button, Card, Deco, Eyebrow, Heading, Section } from '@/components/brand/ui';
import { img, storeLinks, videos } from '@/lib/brand';

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="grid min-h-[calc(100vh-5rem)] lg:grid-cols-[1fr_1.35fr]">
          <div className="flex flex-col justify-center px-4 py-12 sm:px-10 lg:pl-[max(2rem,calc((100vw-1400px)/2+2rem))]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.mibioticsLogo} alt="mi-biotics" className="h-14 w-auto self-start sm:h-16" />
            <Eyebrow className="mt-6">Revive . Restore . Regenerate</Eyebrow>
            <h1 className="mt-6 font-display text-[40px] font-bold leading-[1.25] tracking-[0.1em] sm:text-[52px]">
              Your gut.
              <br />
              <span className="text-brand-pink">Your schedule.</span>
            </h1>
            <p className="mt-6 max-w-sm text-[15px] leading-relaxed">
              A clean-label fermented millet gut shot, built for your biology — patented, independently validated, dairy-free.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href={storeLinks.store}>Buy Now</Button>
              <Button href="/the-wait-list" variant="black">
                Join The Culture
              </Button>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.heroLychee} alt="mi-biotics Lychee gut shot" className="h-full min-h-[380px] w-full object-cover" />
        </div>
      </section>

      {/* THE FOUNDER */}
      <Section bg={img.bgPinkWave}>
        <Deco src={img.handRed} className="-left-6 bottom-10 hidden w-32 md:block" />
        <Deco src={img.founderMark} className="-right-4 top-6 hidden w-28 md:block" />
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Video src={videos.founder} className="aspect-[4/3]" />
          <div>
            <Eyebrow>The Founder</Eyebrow>
            <Heading lead={<span className="text-brand-pink">The inventor,</span>} accent={<span className="text-black">not just the founder.</span>} className="mt-4" />
            <p className="mt-6 text-[15px] leading-relaxed">
              Former UN social-development professional and clinical practitioner; creator of India&apos;s first vegan cheese
              category; holds the patent on the millet matrix at its heart. She built mi-biotics™ after watching the person
              closest to her rebuild his health from the gut up.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <Button href="/our-story">Read Ritu&apos;s Story →</Button>
              <a href="https://youtu.be/1xvQ18ThEk4" className="text-sm font-semibold text-brand-pink underline underline-offset-4">
                Watch her TEDx →
              </a>
            </div>
          </div>
        </div>
      </Section>

      {/* THE SCIENCE */}
      <Section bg={img.bgScience} inner="text-center">
        <Eyebrow>The Science</Eyebrow>
        <Heading lead="Evidence," accent="not adjectives." className="mt-4" />
        <div className="mt-12 grid gap-6 text-left md:grid-cols-3">
          {[
            {
              icon: img.iconPatent,
              blob: img.blobPink,
              title: 'Granted Indian Patent',
              body: 'Patent No. 551921 — granted October 2024 — Fermented Multi-Millet. Fruit-Based Vegan Probiotic Composition and Method of Preparing the Same',
            },
            {
              icon: img.iconApproval,
              blob: img.blobYellow,
              title: 'Independently Validated',
              body: 'Tested in vitro against an Asian gut microbiome by AMILI in Singapore.',
            },
            {
              icon: img.iconIngredient,
              blob: img.blobPurple,
              title: 'World-Class Ingredients',
              body: 'LGG® (Chr. Hansen) & Wellmune® (Kerry).',
            },
          ].map((c) => (
            <Card key={c.title} className="relative overflow-visible p-8 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.icon} alt="" className="mx-auto h-12 w-12" />
              <p className="mt-5 text-[13px] font-bold uppercase tracking-[0.08em]">{c.title}</p>
              <p className="mt-4 text-sm leading-relaxed">{c.body}</p>
              <Deco src={c.blob} className="-bottom-6 -right-4 w-16" />
            </Card>
          ))}
        </div>
        <Button href="/science" variant="outline" className="mt-12">
          The Full Science →
        </Button>
      </Section>

      {/* THE LINE */}
      <Section bg={img.bgSoft}>
        <Card className="grid overflow-hidden lg:grid-cols-2">
          <div className="p-8 sm:p-12">
            <Eyebrow>The Line</Eyebrow>
            <Heading lead="Why a dedicated line matters -" accent="how we maintain standards" className="mt-4" />
            <p className="mt-6 text-[15px] leading-relaxed">
              A dedicated, purpose-built, dairy-free line in Coimbatore, TN built around a live, clean-label fermented product,
              not retrofitted between others. Every batch of mi-biotics™ is made to spec and released after rigorous testing by
              reputed third-party labs.
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.factory} alt="The dedicated mi-biotics production line" className="h-full min-h-[300px] w-full object-cover" />
        </Card>
      </Section>

      {/* THE RECOVERY */}
      <Section bg={img.bgPinkWave2} inner="text-center">
        <Eyebrow>The Recovery</Eyebrow>
        <Heading lead="Two videos, five years apart -" accent="the human truth" className="mt-4" />
        <div className="relative mx-auto mt-12 grid max-w-3xl grid-cols-2 items-center gap-6 sm:gap-16">
          <Video src={videos.recovery2021} className="aspect-[9/16]" />
          <Video src={videos.recoveryNow} className="aspect-[9/16]" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.armPink} alt="" aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 hidden w-28 -translate-x-1/2 -translate-y-1/2 sm:block" />
        </div>
        <div className="mx-auto mt-12 max-w-4xl space-y-5 text-left text-[15px] leading-relaxed">
          <p>
            “In 2021, COVID-19 put me in intensive care for nineteen days. The drugs that saved my life also destroyed my gut —
            and my recovery had to start there, by rebuilding my microbiome from the inside out. My wife, Ritu, the inventor named
            on the patent, set aside the product she’d been working on and built something for exactly this. She called it
            mi-biotics™. Five years later, here I am.”
          </p>
          <p className="text-right font-semibold text-brand-pink">- Lavindra de Silva is Retü®’s Chief Business Officer.</p>
          <p>
            He spent three decades building and scaling companies across technology and consumer goods before joining Ritu to
            build the business around mi-biotics™ — the product that helped rebuild his own health.
          </p>
          <p>
            Connect with him:{' '}
            <a href="https://www.linkedin.com/in/lavidesilva/" className="underline">
              https://www.linkedin.com/in/lavidesilva/
            </a>
          </p>
        </div>
      </Section>

      {/* THE ECOSYSTEM */}
      <Section bg={img.bgSoft} inner="text-center">
        <Deco src={img.blobPurple} className="right-0 top-0 hidden w-36 md:block" />
        <Eyebrow>The Ecosystem</Eyebrow>
        <Heading lead="Why the gut dictates" accent="everything.." className="mx-auto mt-4 max-w-2xl" />
        <StatCards />
        <Button href="/microbiome" variant="outline" className="mt-12">
          Learn More →
        </Button>
      </Section>

      {/* THE PRODUCT */}
      <Section bg={img.bgProduct} inner="text-center">
        <Deco src={img.dragonfly} className="right-4 top-16 hidden w-40 md:block" />
        <Deco src={img.dino} className="-left-4 bottom-10 hidden w-28 md:block" />
        <Eyebrow>The Product</Eyebrow>
        <Heading lead={<span className="text-brand-pink">Join The Culture -</span>} accent={<span className="text-black">Sample Launch Flavours</span>} className="mx-auto mt-4 max-w-2xl" />
        <div className="text-left">
          <FlavourCards />
        </div>
      </Section>

      {/* THE CULTURE */}
      <Section bg={img.bgSoft2} inner="text-center">
        <Deco src={img.blobPink} className="-left-6 bottom-6 hidden w-24 md:block" />
        <Deco src={img.palm} className="right-4 top-1/3 hidden w-28 md:block" />
        <Eyebrow>The Culture</Eyebrow>
        <Heading lead="Join the" accent="Culture." className="mt-4" />
        <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed">
          Be one of the first 500 founding members - get a free six-pack of mi-biotics™ when we launch in Bengaluru and
          Combatore this October.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button href="/the-wait-list" className="px-10">
            Claim Your Six-Pack →
          </Button>
          <Button href={storeLinks.store} variant="black" className="px-10">
            Buy Now
          </Button>
        </div>
        <p className="mt-4 text-xs text-neutral-600">Founding-member terms apply.</p>
        <p className="mt-8 text-sm">
          Not in Bengaluru or Coimbatore?{' '}
          <Link href="/where-are-you" className="font-semibold text-brand-pink underline underline-offset-4">
            Tell us where you are →
          </Link>
        </p>
      </Section>
    </>
  );
}
