import { NextRequest, NextResponse } from 'next/server';
import { checkPincode } from '@/lib/db/pincodes';

// Public PIN lookup for the delivery checker and address autofill
export async function GET(_req: NextRequest, { params }: { params: Promise<{ pin: string }> }) {
  try {
    const { pin } = await params;
    const info = await checkPincode(pin);
    return NextResponse.json({
      success: true,
      pincode: info.pincode,
      valid: info.valid,
      serviceable: info.serviceable,
      city: info.district,
      state: info.state,
    });
  } catch (err: any) {
    console.error('[PINCODE ERROR]', err);
    return NextResponse.json({ success: false, error: 'Could not check this PIN code' }, { status: 500 });
  }
}
