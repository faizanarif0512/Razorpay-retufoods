import React from 'react';
import { notFound } from 'next/navigation';
import { getProductBySlug, getAllProducts } from '@/lib/db/service';
import ProductDetailClient from '@/components/products/ProductDetailClient';

// Rebuilt at most once a minute; checkout re-checks price and stock on the server
export const revalidate = 60;

// Pre-build current products; new slugs are still rendered on first visit
export async function generateStaticParams() {
  const products = await getAllProducts(false);
  return products.map((p) => ({ slug: p.slug }));
}

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
