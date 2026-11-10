import type { Metadata } from 'next';
import { Button, Card, Eyebrow, Heading, Section } from '@/components/brand/ui';
import { img, storeLinks } from '@/lib/brand';

export const metadata: Metadata = { title: 'Our Story' };

const brief = [
  'Inventor, Indian Patent No. 551921 — Fermented Multi-Millet Fruit-Based Vegan Probiotic Composition and Method of Preparing the Same (granted October 2024). A composition patent — protection of the product itself, not merely a method of making it.',
  'Founder, Retü Foods · Founder (Emeritus), Beyond Passé — creator of India’s vegan cheese category',
  'Former United Nations (UNFPA) programme advisor and CIDA development consultant — reproductive health, HIV/AIDS, and women’s welfare',
  'Clinical practitioner in therapeutic recovery',
  'MA, Inter-Disciplinary Studies: East-West Psychology, Adult Education & Counselling, and Management — John F. Kennedy University, CA, USA',
  'BA, International Relations — Wesleyan University, CT, USA',
  'TEDx speaker · multilingual (English, Hindi, Punjabi; conversational Spanish)',
  'Lived/worked in Cuba, India, Canada, South Korea, Malaysia, Kuwait, Sri Lanka, the United States, Jamaica, and the United Kingdom',
];

export default function OurStoryPage() {
  return (
    <>
      <Section bg={img.bgSoft}>
        <div className="grid items-center gap-10 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <Eyebrow>The Founder</Eyebrow>
            <Heading lead="Dr. Ritu" accent="Chhatwal" as="h1" className="mt-4 !text-[32px] sm:!text-[44px]" />
            <p className="mt-3 font-semibold">Founder, Retü Foods · Inventor of mi-biotics™</p>
            <p className="mt-6 text-[15px] leading-relaxed">
              Dr. Ritu Chhatwal is the inventor of the patented multi-millet matrix at the heart of mi-biotics™. Trained in
              East-West psychology and counselling — a clinician and a food entrepreneur long before she was ever a formulator — she
              built mi-biotics™ to answer a question conventional medicine kept leaving open: what if food itself, made deliberately
              and built for the body it’s going into, could do work that pills cannot? In October 2024, the Indian Patent Office
              granted her composition Patent No. 551921, and the idea became, formally, an invention.
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.ritu} alt="Dr. Ritu Chhatwal" className="w-full rounded-2xl object-cover shadow-lg" />
        </div>
      </Section>

      <Section bg={img.bgProduct}>
        <Eyebrow>The Journey</Eyebrow>
        <Heading lead="The path to" accent="mi-biotics™" className="mt-4" />
        <div className="mt-8 max-w-4xl space-y-5 text-[15px] leading-relaxed">
          <p>
            Ritu’s route to inventing a probiotic was not a straight line — and that is rather the point. For most of her career, she
            worked on a single question from different distances: how do people actually heal?
          </p>
          <p>
            She began at the scale of populations. As a development consultant with the Canadian International Development Agency,
            and then as a programme advisor with the United Nations Population Fund, she spent the better part of a decade on
            reproductive health, HIV/AIDS, and women’s welfare — first analysing health programmes across Asia, then advising
            twenty-one countries across the Caribbean. It was public health at its widest aperture: policy, funding, the machinery
            that decides whether millions of people ever receive care.
          </p>
          <p>
            Then she moved to the opposite scale — one person at a time. Grounded in East-West psychology and counselling, she built a
            clinical practice in therapeutic recovery, working with people through depression, phobias, chronic pain, and the burdens
            the body quietly carries. The population years had shown her the systems; clinical practice showed her the individual —
            and how often a person’s troubles begin somewhere medicine doesn’t quite think to look.
          </p>
          <p>
            Food was a throughline she hadn’t yet named. She found it building Beyond Passé, where she created India’s vegan cheese
            category from nothing — proof that a whole population’s relationship to food can be remade, not just one plate at a time.
            By then, the question had sharpened to its final form: if food can be rebuilt, what is the most important thing we could
            rebuild it to do?
          </p>
          <p>The answer, when it came, arrived the hardest way — through the person closest to her.</p>
        </div>
      </Section>

      <Section bg={img.bgClouds}>
        <Eyebrow>The Birth</Eyebrow>
        <Heading lead="Why mi-biotics™" accent="exist" className="mt-4" />
        <div className="mt-8 max-w-4xl space-y-5 text-[15px] leading-relaxed">
          <p>
            mi-biotics™ did not begin in a lab. It began at a hospital bedside. In 2021, Ritu’s husband and Chief Business Officer,
            Lavindra, spent nineteen days in intensive care with COVID-19. The drugs that saved his life — and the antibiotics and
            steroids that followed through months of Long COVID — also destroyed his gut microbiome. A fungal overgrowth moved into
            the space the bacteria had vacated; by the time he was readmitted, he was clinically malnourished. His recovery, it turned
            out, had to begin with his gut.
          </p>
          <p>
            Ritu watched all of it. She had been developing a high-protein plant-based yogurt; she set it aside. In its place, she
            began building something for exactly the problem she had just watched nearly kill the person closest to her — a
            clean-label fermented millet drink, made only of real fruits, vegetables, and spices, designed to help a damaged gut
            rebuild itself. She called it mi-biotics™.
          </p>
          <p>
            It was not the first time she had seen a gut quietly govern a life. Her own father had carried a “sensitive” stomach his
            whole life — endured, never resolved. The conviction had been forming for years. Lavindra’s recovery is what made it
            urgent.
          </p>
        </div>
      </Section>

      <Section bg={img.bgPinkWave2}>
        <Eyebrow>The Invention</Eyebrow>
        <Heading lead="What she" accent="actually built" className="mt-4" />
        <div className="mt-8 max-w-4xl space-y-5 text-[15px] leading-relaxed">
          <p>
            The product people taste is a gut shot. What Ritu patented is the thing underneath it — a fermented multi-millet matrix,
            the active ingredient the flavours are built on.
          </p>
          <p>
            That distinction is the whole story. Because different whole-food combinations on the same matrix produce different
            effects in the body, mi-biotics™ is not a single recipe but the first expression of a platform – our mi-matrix™
            platform. One invention, many possible products. The drink is where it starts — not where it ends.
          </p>
        </div>
        <Button href={storeLinks.store} className="mt-8 px-10">
          Buy Now
        </Button>
      </Section>

      <Section bg={img.bgScience} inner="text-center">
        <Heading lead="TED" accent="x" />
        <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-relaxed">
          In her TEDx talk, Eating Our Way out of Extinction, Ritu lays out the conviction behind the brand — that what we choose to
          eat is the most consequential daily decision most of us overlook.
        </p>
        <div className="mx-auto mt-8 aspect-video max-w-3xl overflow-hidden rounded-2xl shadow-lg">
          <iframe
            className="h-full w-full"
            src="https://www.youtube-nocookie.com/embed/1xvQ18ThEk4"
            title="Eating Our Way out of Extinction — Ritu Chhatwal, TEDx"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </Section>

      <Section bg={img.bgPinkWave3}>
        <Card className="p-8 sm:p-12">
          <Heading lead="In" accent="brief" />
          <ul className="mt-8 space-y-3 text-[15px] leading-relaxed">
            {brief.map((b) => (
              <li key={b}>• {b}</li>
            ))}
            <li>
              • Connect with her:{' '}
              <a href="https://www.linkedin.com/in/rituchhatwal/" className="underline">
                https://www.linkedin.com/in/rituchhatwal/
              </a>
            </li>
          </ul>
        </Card>
      </Section>
    </>
  );
}
