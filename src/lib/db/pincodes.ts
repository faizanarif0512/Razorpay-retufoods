import { getSupabase } from './supabase';

export interface PincodeInfo {
  pincode: string;
  valid: boolean;
  serviceable: boolean;
  district: string | null;
  state: string | null;
}

export const NOT_SERVICEABLE_MESSAGE =
  'Sorry, we don’t deliver to this PIN code yet. Tell us where you are at /where-are-you and we’ll let you know when we arrive.';

// Looks up a PIN in the India Post directory and whether Retü currently delivers there
export async function checkPincode(raw: string): Promise<PincodeInfo> {
  const pincode = (raw || '').trim();
  if (!/^\d{6}$/.test(pincode)) return { pincode, valid: false, serviceable: false, district: null, state: null };
  const { data, error } = await getSupabase()
    .from('pincodes')
    .select('state, district, is_serviceable')
    .eq('pincode', pincode)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { pincode, valid: false, serviceable: false, district: null, state: null };
  return { pincode, valid: true, serviceable: data.is_serviceable, district: data.district, state: data.state };
}

export async function getCoverage(): Promise<{ state: string; district: string; total: number; serviceable: number }[]> {
  const { data, error } = await getSupabase().rpc('pincode_coverage');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getDistrictPincodes(state: string, district: string) {
  const { data, error } = await getSupabase()
    .from('pincodes')
    .select('pincode, office_names, is_serviceable')
    .eq('state', state)
    .eq('district', district)
    .order('pincode');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function searchPincodes(query: string) {
  const q = query.trim();
  let req = getSupabase().from('pincodes').select('pincode, state, district, office_names, is_serviceable').order('pincode').limit(50);
  req = /^\d{1,6}$/.test(q) ? req.like('pincode', `${q}%`) : req.ilike('office_names', `%${q}%`);
  const { data, error } = await req;
  if (error) throw new Error(error.message);
  return data || [];
}

// Turns delivery on or off for a whole state, a district, or a list of PIN codes
export async function setServiceable(
  scope: { state?: string; district?: string; pincodes?: string[] },
  enabled: boolean
): Promise<number> {
  let req = getSupabase().from('pincodes').update({ is_serviceable: enabled, updated_at: new Date().toISOString() }, { count: 'exact' });
  if (scope.pincodes?.length) req = req.in('pincode', scope.pincodes);
  else if (scope.state && scope.district) req = req.eq('state', scope.state).eq('district', scope.district);
  else if (scope.state) req = req.eq('state', scope.state);
  else throw new Error('Choose a state, district or PIN codes');
  const { error, count } = await req;
  if (error) throw new Error(error.message);
  return count || 0;
}
