import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAdminFromRequest } from '@/lib/auth/admin';
import { getCoverage, getDistrictPincodes, searchPincodes, setServiceable } from '@/lib/db/pincodes';

// GET: coverage by state/district, or ?state=&district= for one district's PINs, or ?q= to search
export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const sp = req.nextUrl.searchParams;
    const q = sp.get('q');
    if (q) return NextResponse.json({ success: true, results: await searchPincodes(q) });
    const state = sp.get('state');
    const district = sp.get('district');
    if (state && district) return NextResponse.json({ success: true, pincodes: await getDistrictPincodes(state, district) });
    return NextResponse.json({ success: true, coverage: await getCoverage() });
  } catch (err: any) {
    console.error('[ADMIN LOCATIONS ERROR]', err);
    return NextResponse.json({ success: false, error: 'Could not load locations' }, { status: 500 });
  }
}

// POST { state?, district?, pincodes?, enabled }
export async function POST(req: NextRequest) {
  const admin = getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const { state, district, pincodes, enabled } = await req.json();
    if (typeof enabled !== 'boolean') return NextResponse.json({ success: false, error: 'enabled must be true or false' }, { status: 400 });
    const cleanPins = Array.isArray(pincodes) ? pincodes.filter((p: unknown) => typeof p === 'string' && /^\d{6}$/.test(p)) : undefined;
    const updated = await setServiceable({ state, district, pincodes: cleanPins }, enabled);
    console.log(`[LOCATIONS] ${admin.email} set ${updated} PIN(s) serviceable=${enabled}`, { state, district, pins: cleanPins?.length });
    revalidatePath('/store', 'layout');
    return NextResponse.json({ success: true, updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Could not update locations' }, { status: 400 });
  }
}
