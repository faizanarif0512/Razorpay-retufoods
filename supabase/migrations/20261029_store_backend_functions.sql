create sequence if not exists public.invoice_number_seq;
select setval('public.invoice_number_seq', greatest((select count(*) from public.invoices), 1), (select count(*) from public.invoices) > 0);

-- Atomically decrement stock for every item and insert the order + items.
create or replace function public.create_order_with_reservation(p_order jsonb, p_items jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare it jsonb;
begin
  for it in select * from jsonb_array_elements(p_items) loop
    update product_variants
       set stock_quantity = stock_quantity - (it->>'quantity')::int, updated_at = now()
     where id = it->>'variant_id' and stock_quantity >= (it->>'quantity')::int;
    if not found then
      raise exception 'Item % became out of stock during checkout', it->>'variant_name';
    end if;
  end loop;

  insert into orders select * from jsonb_populate_record(null::orders, p_order);
  insert into order_items select * from jsonb_populate_recordset(null::order_items, p_items);
end $$;

-- Return an order's items to stock exactly once. Returns true if stock was restored by this call.
create or replace function public.restock_order(p_order_id text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update orders set stock_restored = true, updated_at = now()
   where id = p_order_id and stock_restored = false;
  if not found then return false; end if;
  update product_variants v
     set stock_quantity = v.stock_quantity + oi.quantity, updated_at = now()
    from order_items oi
   where oi.order_id = p_order_id and v.id = oi.variant_id;
  return true;
end $$;

create or replace function public.next_invoice_number()
returns bigint language sql security definer set search_path = public as $$ select nextval('invoice_number_seq') $$;

revoke all on function public.create_order_with_reservation(jsonb, jsonb), public.restock_order(text), public.next_invoice_number() from public, anon, authenticated;
grant execute on function public.create_order_with_reservation(jsonb, jsonb), public.restock_order(text), public.next_invoice_number() to service_role;
