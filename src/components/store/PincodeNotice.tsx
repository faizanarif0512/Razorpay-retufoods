import Link from 'next/link';
import type { PincodeStatus } from '@/lib/pincodeClient';

// The one-line delivery message shown under a PIN code field
export default function PincodeNotice({ status }: { status: PincodeStatus }) {
  if (status.state === 'idle') return null;
  if (status.state === 'checking') return <p className="mt-1 text-[11px] text-gray-500">Checking delivery…</p>;
  if (status.state === 'invalid') return <p className="mt-1 text-[11px] font-semibold text-red-600">This PIN code doesn’t look right.</p>;
  if (status.state === 'ok')
    return <p className="mt-1 text-[11px] font-semibold text-emerald-700">✓ We deliver chilled to {status.city}, {status.region}.</p>;
  return (
    <p className="mt-1 text-[11px] font-semibold text-red-600">
      Sorry, we don’t deliver to {status.city} yet.{' '}
      <Link href="/where-are-you" className="underline">
        Tell us where you are
      </Link>{' '}
      and we’ll let you know when we arrive.
    </p>
  );
}
