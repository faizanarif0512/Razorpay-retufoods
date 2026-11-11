import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAdminFromRequest } from '@/lib/auth/admin';
import { listBatches, createBatch } from '@/lib/db/batches';
import { getSupabase } from '@/lib/db/supabase';

export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const [batches, variants] = await Promise.all([
      listBatches(req.nextUrl.searchParams.get('variant_id') || undefined),
      getSupabase().from('product_variants').select('id, name, sku, stock_quantity, is_active, product:products(name)').order('product_id').order('pack_size'),
    ]);
    return NextResponse.json({ success: true, batches, variants: variants.data || [] });
  } catch (err: any) {
    console.error('[ADMIN BATCHES ERROR]', err);
    return NextResponse.json({ success: false, error: 'Could not load batches' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const batch = await createBatch(await req.json());
    console.log(`[BATCHES] ${admin.email} received batch ${batch.batch_code} (${batch.quantity_received} units) for ${batch.variant_id}`);
    revalidatePath('/store', 'layout');
    return NextResponse.json({ success: true, batch });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Could not add batch' }, { status: 400 });
  }
}
