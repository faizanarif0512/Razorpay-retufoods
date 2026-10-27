import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyAdminToken, SESSION_COOKIE_NAME } from '@/lib/auth/admin';
import { getAdminStats, getAllOrdersAdmin, getAllProducts } from '@/lib/db/service';
import AdminDashboardClient from '@/components/admin/AdminDashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    redirect('/admin/login');
  }

  const session = verifyAdminToken(token);
  if (!session) {
    redirect('/admin/login');
  }

  const stats = await getAdminStats();
  const orders = await getAllOrdersAdmin();
  const products = await getAllProducts(true);

  return (
    <AdminDashboardClient
      initialStats={stats}
      initialOrders={orders}
      initialProducts={products}
      adminEmail={session.email}
    />
  );
}
