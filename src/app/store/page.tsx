import React from 'react';
import Link from 'next/link';
import { getAllProducts } from '@/lib/db/service';
import CatalogueClient from '@/components/products/CatalogueClient';

// Rebuilt at most once a minute; checkout re-checks price and stock on the server
export const revalidate = 60;

export default async function ProductsPage() {
  const products = await getAllProducts(false);

  return (
    <div className="bg-white min-h-[80vh]">
      <div className="border-b border-brand-pink/20 bg-brand-blush">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-4 text-center sm:flex-row sm:px-8 sm:text-left">
          <p className="text-sm">
            <strong>New here?</strong> Try one six-pack for ₹1,110 (first order only). <strong>Already a fan?</strong> Subscribe for a
            chilled box every 2 or 4 weeks.
          </p>
          <Link href="/store/subscribe" className="shrink-0 rounded-md bg-brand-pink px-5 py-2.5 font-button text-sm font-medium text-white hover:bg-[#d01039]">
            See subscription plans
          </Link>
        </div>
      </div>
      <CatalogueClient initialProducts={products} />
    </div>
  );
}
