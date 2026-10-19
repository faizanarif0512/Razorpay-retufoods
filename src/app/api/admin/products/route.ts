import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, SESSION_COOKIE_NAME } from '@/lib/auth/admin';
import { getAllProducts, updateProduct, updateVariant } from '@/lib/db/service';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const products = getAllProducts(true);
    return NextResponse.json({ success: true, products });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, id, data } = body;

    if (type === 'product') {
      updateProduct(id, data);
    } else if (type === 'variant') {
      updateVariant(id, data);
    } else {
      return NextResponse.json({ success: false, error: 'Invalid update type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
