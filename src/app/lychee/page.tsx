import type { Metadata } from 'next';
import FlavourPage from '@/components/brand/FlavourPage';
import { img, storeLinks } from '@/lib/brand';

export const metadata: Metadata = { title: 'Lychee' };

export default function LycheePage() {
  return <FlavourPage name="Lychee" packs={img.lycheeBottles} render={img.lycheeLabel} nutrition={img.lycheeNutrition} buyHref={storeLinks.lychee} />;
}
