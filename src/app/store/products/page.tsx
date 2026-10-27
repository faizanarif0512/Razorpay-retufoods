import React from 'react';
import { getAllProducts } from '@/lib/db/service';
import CatalogueClient from '@/components/products/CatalogueClient';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const products = await getAllProducts(false);

  return (
    <div className="bg-white min-h-[80vh]">
      <CatalogueClient initialProducts={products} />
    </div>
  );
}
