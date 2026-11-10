import type { Metadata } from 'next';
import Link from 'next/link';
import ContactForm from '@/components/brand/ContactForm';
import { Button, Card, Heading, Section } from '@/components/brand/ui';
import { img, storeLinks } from '@/lib/brand';

export const metadata: Metadata = { title: 'The Wait List' };

const terms = [
  'Limited to the first 500 founding members.',
  'Available where we deliver at launch — Bengaluru and Coimbatore — from August 2026.',
  'One free six-pack (6 × 75 ml) of mi-biotics™ in our launch flavours, subject to availability.',
  'Limit of one six-pack per household (one per delivery address).',
  'We’ll contact eligible founding members on how to claim at launch; valid while stocks last.',
  'Not transferable; cannot be exchanged for cash or other products.',
  'Retü® may verify eligibility and may amend or withdraw the offer where reasonably necessary.',
];

export default function WaitListPage() {
  return (
    <Section bg={img.bgWaitList}>
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <Heading lead="Join The" accent="Culture" as="h1" className="!text-[32px] sm:!text-[44px]" />
          <p className="mt-6 text-[15px] leading-relaxed">
            Be one of the first 500 founding members - get a free six-pack of mi-biotics™ when we launch in Bengaluru and
            Coimbatore this October
          </p>
          <p className="mt-4 text-sm">
            Not in Bengaluru or Coimbatore?{' '}
            <Link href="/where-are-you" className="font-semibold text-brand-pink underline underline-offset-4">
              Tell us where you are →
            </Link>
          </p>
          <div className="mt-6">
            <Button href={storeLinks.store} variant="black" className="px-10">
              Buy Now
            </Button>
          </div>
          <div className="mt-10 text-sm leading-relaxed text-neutral-700">
            <p>
              The mi-biotics™ founding-member offer is open to the first 500 people to join as founding members ahead of launch.
              Eligible founding members receive one free six-pack of mi-biotics™ when we launch.
            </p>
            <ul className="mt-4 list-disc space-y-1.5 pl-5">
              {terms.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <p className="mt-8 font-display text-lg font-bold tracking-[0.1em] text-brand-pink">Ancient Grains • Living Cultures</p>
        </div>
        <Card className="self-start p-8">
          <ContactForm
            form="waitlist"
            successMessage="Welcome to the Culture! We’ll contact you at launch about your free six-pack."
            submitLabel="Claim Your Six-Pack →"
            fields={[
              { name: 'name', label: 'Name', required: true },
              { name: 'email', label: 'Email', type: 'email', required: true },
              { name: 'phone', label: 'WhatsApp / Phone Number', type: 'tel', required: true },
              { name: 'address', label: 'Address', textarea: true, required: true },
            ]}
          />
        </Card>
      </div>
    </Section>
  );
}
