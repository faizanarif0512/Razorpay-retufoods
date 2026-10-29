import { NextResponse } from 'next/server';
import { getAllProducts } from '@/lib/db/service';

export const revalidate = 60;

export async function GET() {
  try {
    const products = await getAllProducts(false);
    return NextResponse.json({ success: true, products });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
