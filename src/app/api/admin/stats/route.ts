import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, SESSION_COOKIE_NAME } from '@/lib/auth/admin';
import { getAdminStats } from '@/lib/db/service';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const stats = getAdminStats();
    return NextResponse.json({ success: true, stats });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
