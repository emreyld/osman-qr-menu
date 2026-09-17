-- ============================================================
--  Osman POS — küçük düzeltme
--  İşletme sahibi kendi kayıtlarını silebilsin (deneme verisini temizlemek için).
--  Garson yalnızca açık adisyonu silebilir; kapanmış ciro kaydına dokunamaz.
-- ============================================================

drop policy if exists orders_del on public.orders;
create policy orders_del on public.orders for delete
  using (venue_id = public.my_venue() and (status = 'open' or public.is_admin()));

drop policy if exists items_del on public.order_items;
create policy items_del on public.order_items for delete
  using (venue_id = public.my_venue() and (status = 'draft' or public.is_admin()));

select 'Silme kuralları güncellendi' as sonuc;
