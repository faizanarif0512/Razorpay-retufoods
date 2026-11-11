import crypto from 'crypto';
import { getSupabase } from './supabase';

export interface StockBatch {
  id: string;
  variant_id: string;
  batch_code: string;
  manufactured_on: string | null;
  best_before: string | null;
  quantity_received: number;
  quantity_remaining: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface OrderBatchLine {
  order_item_id: string;
  batch_id: string;
  batch_code: string;
  best_before: string | null;
  quantity: number;
}

function check<T>(res: { data: T; error: any }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function listBatches(variantId?: string): Promise<StockBatch[]> {
  let q = getSupabase().from('stock_batches').select('*').order('best_before', { ascending: true, nullsFirst: false }).order('created_at');
  if (variantId) q = q.eq('variant_id', variantId);
  return check(await q) as StockBatch[];
}

// Keeps the sellable stock count in step with what the batches hold
async function adjustVariantStock(variantId: string, delta: number) {
  if (!delta) return;
  const sb = getSupabase();
  const v = check(await sb.from('product_variants').select('stock_quantity').eq('id', variantId).single()) as any;
  check(await sb.from('product_variants').update({ stock_quantity: Math.max(0, v.stock_quantity + delta), updated_at: new Date().toISOString() }).eq('id', variantId));
}

// Receiving a new batch adds its units to the variant's sellable stock
export async function createBatch(input: {
  variant_id: string;
  batch_code: string;
  manufactured_on?: string | null;
  best_before?: string | null;
  quantity: number;
  notes?: string | null;
}): Promise<StockBatch> {
  const code = (input.batch_code || '').trim().toUpperCase();
  const qty = Math.floor(Number(input.quantity));
  if (!code) throw new Error('Batch code is required');
  if (!(qty > 0)) throw new Error('Quantity must be at least 1');
  if (input.best_before && !DATE.test(input.best_before)) throw new Error('Best-before must be a date');
  if (input.manufactured_on && !DATE.test(input.manufactured_on)) throw new Error('Manufactured date must be a date');
  const id = `bat_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const res = await getSupabase().from('stock_batches').insert({
    id,
    variant_id: input.variant_id,
    batch_code: code,
    manufactured_on: input.manufactured_on || null,
    best_before: input.best_before || null,
    quantity_received: qty,
    quantity_remaining: qty,
    notes: input.notes?.trim() || null,
  });
  if (res.error) throw new Error(/duplicate/i.test(res.error.message) ? `Batch ${code} already exists for this pack` : res.error.message);
  await adjustVariantStock(input.variant_id, qty);
  return (check(await getSupabase().from('stock_batches').select('*').eq('id', id).single()) as StockBatch);
}

// Edits a batch. Changing units left (a recount, breakage, or write-off) moves sellable stock by the same amount.
export async function updateBatch(
  id: string,
  fields: Partial<Pick<StockBatch, 'batch_code' | 'manufactured_on' | 'best_before' | 'quantity_remaining' | 'notes' | 'is_active'>>
): Promise<StockBatch> {
  const sb = getSupabase();
  const current = check(await sb.from('stock_batches').select('*').eq('id', id).single()) as StockBatch;
  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  if (fields.batch_code !== undefined) {
    const code = fields.batch_code.trim().toUpperCase();
    if (!code) throw new Error('Batch code is required');
    update.batch_code = code;
  }
  for (const k of ['manufactured_on', 'best_before'] as const) {
    if (fields[k] !== undefined) {
      if (fields[k] && !DATE.test(fields[k] as string)) throw new Error('Dates must be YYYY-MM-DD');
      update[k] = fields[k] || null;
    }
  }
  if (fields.notes !== undefined) update.notes = fields.notes?.trim() || null;
  if (fields.is_active !== undefined) update.is_active = !!fields.is_active;
  let delta = 0;
  if (fields.quantity_remaining !== undefined) {
    const q = Math.floor(Number(fields.quantity_remaining));
    if (!(q >= 0)) throw new Error('Units left cannot be negative');
    delta = q - current.quantity_remaining;
    update.quantity_remaining = q;
    if (q > current.quantity_received) update.quantity_received = q;
  }
  // Deactivating a batch takes its unsold units off sale
  if (fields.is_active === false && current.is_active) delta -= update.quantity_remaining ?? current.quantity_remaining;
  if (fields.is_active === true && !current.is_active) delta += update.quantity_remaining ?? current.quantity_remaining;

  const res = await sb.from('stock_batches').update(update).eq('id', id);
  if (res.error) throw new Error(/duplicate/i.test(res.error.message) ? 'Another batch already uses that code' : res.error.message);
  await adjustVariantStock(current.variant_id, delta);
  return check(await sb.from('stock_batches').select('*').eq('id', id).single()) as StockBatch;
}

// Assigns batches to every line of a paid order (earliest best-before first). Lines can span
// several batches. Returns the units that couldn't be matched to a batch, for the team to fix.
export async function allocateOrderBatches(orderId: string): Promise<number> {
  const sb = getSupabase();
  const items = check(await sb.from('order_items').select('id, variant_id, quantity').eq('order_id', orderId)) as any[];
  let short = 0;
  for (const it of items) {
    const { data, error } = await sb.rpc('allocate_item_batches', {
      p_order_id: orderId,
      p_order_item_id: it.id,
      p_variant_id: it.variant_id,
      p_quantity: it.quantity,
    });
    if (error) {
      console.error('[BATCH ALLOCATION ERROR]', orderId, error.message);
      short += it.quantity;
    } else short += Number(data) || 0;
  }
  return short;
}

export async function releaseOrderBatches(orderId: string): Promise<void> {
  const { error } = await getSupabase().rpc('release_order_batches', { p_order_id: orderId });
  if (error) console.error('[BATCH RELEASE ERROR]', orderId, error.message);
}

export async function setItemBatches(orderItemId: string, allocations: { batch_id: string; quantity: number }[]): Promise<void> {
  check(await getSupabase().rpc('set_item_batches', { p_order_item_id: orderItemId, p_allocations: allocations }));
}

export async function getOrderBatches(orderId: string): Promise<OrderBatchLine[]> {
  const rows = check(
    await getSupabase().from('order_item_batches').select('order_item_id, batch_id, quantity, batch:stock_batches(batch_code, best_before)').eq('order_id', orderId)
  ) as any[];
  return rows.map((r) => ({
    order_item_id: r.order_item_id,
    batch_id: r.batch_id,
    batch_code: r.batch?.batch_code,
    best_before: r.batch?.best_before,
    quantity: r.quantity,
  }));
}

// "B-1101 ×3, B-1108 ×1" for one order line, used on invoices and emails
export function batchSummary(lines: OrderBatchLine[], orderItemId: string): string {
  return lines
    .filter((l) => l.order_item_id === orderItemId)
    .map((l) => `${l.batch_code}${l.best_before ? ` (BB ${l.best_before})` : ''} ×${l.quantity}`)
    .join(', ');
}
