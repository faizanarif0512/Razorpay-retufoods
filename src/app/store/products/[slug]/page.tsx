import React from 'react';
import { notFound } from 'next/navigation';
import { getProductBySlug, getAllProducts } from '@/lib/db/service';
import ProductDetailClient from '@/components/products/ProductDetailClient';

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const allProducts = await getAllProducts(false);
  const relatedProducts = allProducts.filter((p) => p.id !== product.id).slice(0, 2);

  return (
    <div className="bg-white min-h-[80vh]">
      <ProductDetailClient product={product} relatedProducts={relatedProducts} />
    </div>
  );
}
