-- 20260705210000_v124_vendor_fulfillment.sql
-- Vendor memenuhi pesanan: ubah status order yang memuat itemnya.
-- SECURITY DEFINER karena RLS orders hanya memberi vendor akses SELECT.
-- Menegakkan keanggotaan (app.vendor_in_order) + transisi fulfillment yang sah.
create or replace function public.vendor_set_order_status(p_order uuid, p_status text)
returns boolean language plpgsql security definer set search_path = public, app as $$
declare cur text;
begin
  if not app.vendor_in_order(p_order) then
    return false;                                  -- bukan vendor untuk order ini
  end if;
  select status into cur from public.orders where id = p_order;
  if cur is null then return false; end if;
  -- Transisi fulfillment yang boleh dilakukan vendor.
  if not (
       (cur = 'paid'    and p_status in ('shipped', 'cancelled'))
    or (cur = 'shipped' and p_status in ('delivered', 'cancelled'))
  ) then
    return false;
  end if;
  update public.orders set status = p_status where id = p_order;
  return true;
end;
$$;

grant execute on function public.vendor_set_order_status(uuid, text) to authenticated;
