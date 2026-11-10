import type { Metadata } from 'next';
import FlavourPage from '@/components/brand/FlavourPage';
import { img, storeLinks } from '@/lib/brand';

export const metadata: Metadata = { title: 'Mango' };

export default function MangoPage() {
  return <FlavourPage name="Mango" packs={img.mangoBottles} render={img.mangoLabel} nutrition={img.mangoNutrition} buyHref={storeLinks.mango} />;
}
