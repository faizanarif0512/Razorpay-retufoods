-- Broadcast a content-free "orders changed" ping on a public Realtime channel.
-- Clients refetch through the authenticated API, so no order data is exposed here.
create or replace function public.broadcast_order_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform realtime.send(
    jsonb_build_object('op', tg_op, 'at', now()),
    'order_changed',
    'store-orders',
    false
  );
  return null;
end $$;

drop trigger if exists orders_broadcast_change on public.orders;
create trigger orders_broadcast_change
after insert or update or delete on public.orders
for each row execute function public.broadcast_order_change();

revoke all on function public.broadcast_order_change() from public, anon, authenticated;
