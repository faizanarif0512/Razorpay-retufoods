import type { Metadata } from 'next';
import ContactForm from '@/components/brand/ContactForm';
import { Card, Heading, Section } from '@/components/brand/ui';
import { img } from '@/lib/brand';

export const metadata: Metadata = { title: 'Where Are You' };

export default function WhereAreYouPage() {
  return (
    <Section bg={img.bgWhere} inner="max-w-2xl text-center">
      <Heading lead="Where" accent="Are You?" as="h1" className="!text-[32px] sm:!text-[44px]" />
      <Card className="mt-10 p-8">
        <ContactForm
          form="location"
          successMessage="Thanks! We’ll let you know when mi-biotics™ reaches you."
          submitLabel="Submit"
          fields={[
            { name: 'name', label: 'Name', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'phone', label: 'WhatsApp / Phone', type: 'tel' },
            { name: 'pin', label: 'Pin Code', required: true },
            { name: 'comments', label: 'Comments', textarea: true },
          ]}
        />
      </Card>
    </Section>
  );
}
