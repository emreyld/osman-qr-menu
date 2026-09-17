-- ============================================================
--  Osman POS — işlem geçmişi (denetim kaydı)
--  Supabase → SQL Editor → yapıştır → Run
--  Bu dosyayı iki kez çalıştırmak güvenlidir.
-- ============================================================

-- Kim, ne zaman, neyi iptal etti / ikram etti / indirim yaptı.
-- Kayıt bir kez yazılır: değiştirilemez, silinemez. Yetki kuralları
-- update ve delete için hiçbir politika tanımlamaz, yani ikisi de kapalıdır.
create table if not exists public.audit (
  id          uuid primary key default gen_random_uuid(),
  venue_id    uuid not null references public.venues(id) on delete cascade,
  at          timestamptz not null default now(),
  staff_id    uuid references public.staff(id) on delete set null,
  staff_name  text,
  action      text not null,
  detail      text,
  amount      numeric,
  order_id    uuid,
  order_no    int,
  table_name  text
);

create index if not exists idx_audit_venue_at on public.audit (venue_id, at desc);

alter table public.audit enable row level security;

-- Okumak rapor yetkisi ister: garson kendi izini silemediği gibi
-- başkasınınkini de gözetleyemesin.
drop policy if exists audit_read on public.audit;
create policy audit_read on public.audit for select
  using (venue_id = public.my_venue() and public.has_perm('report'));

-- Yazmayı herkes yapabilir; uygulama her riskli işlemde kendi yazar.
drop policy if exists audit_ins on public.audit;
create policy audit_ins on public.audit for insert
  with check (venue_id = public.my_venue());

-- update / delete için politika yok → ikisi de yasak.

do $$
begin
  begin execute 'alter publication supabase_realtime add table public.audit'; exception when others then null; end;
end $$;

select 'işlem geçmişi kuruldu' as sonuc;
