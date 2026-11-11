import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAdminFromRequest } from '@/lib/auth/admin';
import { updateBatch } from '@/lib/db/batches';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    const body = await req.json();
    const batch = await updateBatch(id, body);
    console.log(`[BATCHES] ${admin.email} edited batch ${batch.batch_code}`, body);
    revalidatePath('/store', 'layout');
    return NextResponse.json({ success: true, batch });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Could not update batch' }, { status: 400 });
  }
}
