import React from 'react';
import { getAllProducts } from '@/data/products';
import AdminDashboardClient from '@/components/admin/AdminDashboardClient';

// Frontend-only build: dashboard renders with the static catalogue and no orders.
export default async function AdminPage() {
  const products = await getAllProducts(true);

  return (
    <AdminDashboardClient
      initialStats={{ cancellationRequestsCount: 0, grossSalesPaise: 0, totalOrders: 0 }}
      initialOrders={[]}
      initialProducts={products}
      adminEmail="admin"
    />
  );
}
