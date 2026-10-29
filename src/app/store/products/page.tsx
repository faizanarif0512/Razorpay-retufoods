import React from 'react';
import { getAllProducts } from '@/lib/db/service';
import CatalogueClient from '@/components/products/CatalogueClient';

// Rebuilt at most once a minute; checkout re-checks price and stock on the server
export const revalidate = 60;

export default async function ProductsPage() {
  const products = await getAllProducts(false);

  return (
    <div className="bg-white min-h-[80vh]">
      <CatalogueClient initialProducts={products} />
    </div>
  );
}
