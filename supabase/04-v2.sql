-- ============================================================
--  Osman POS — 2. sürüm
--  Ürün seçenekleri · parçalı ödeme · yemek kartları · kasa vardiyası · gel-al
--  Supabase → SQL Editor → yapıştır → Run
--  Bu dosyayı iki kez çalıştırmak güvenlidir.
-- ============================================================

-- ------------------------------------------------------------
--  1) ÜRÜN SEÇENEKLERİ
--     "Pişirme: az / orta / iyi", "Boy: küçük / büyük +80₺",
--     "Ekstralar: peynir +40₺, soğansız 0₺"
-- ------------------------------------------------------------

create table if not exists public.option_groups (
  id          uuid primary key default gen_random_uuid(),
  venue_id    uuid not null references public.venues(id) on delete cascade,
  name        text not null,
  min_select  int  not null default 0,   -- 0 = isteğe bağlı, 1 = zorunlu
  max_select  int  not null default 1,   -- 1 = tek seçim, >1 = çoklu
  sort        int  not null default 0
);

create table if not exists public.options (
  id          uuid primary key default gen_random_uuid(),
  venue_id    uuid not null references public.venues(id) on delete cascade,
  group_id    uuid not null references public.option_groups(id) on delete cascade,
  name        text not null,
  price_delta numeric not null default 0,
  sort        int not null default 0
);

-- hangi ürün hangi seçenek grubunu kullanıyor
create table if not exists public.menu_item_options (
  item_id     uuid not null references public.menu_items(id) on delete cascade,
  group_id    uuid not null references public.option_groups(id) on delete cascade,
  venue_id    uuid not null references public.venues(id) on delete cascade,
  sort        int not null default 0,
  primary key (item_id, group_id)
);

create index if not exists idx_options_group on public.options (group_id);
create index if not exists idx_mio_item on public.menu_item_options (item_id);

-- adisyon satırına seçilenlerin kopyası düşer (menü sonradan değişse de fiş bozulmaz)
alter table public.order_items add column if not exists options    jsonb;
alter table public.order_items add column if not exists base_price numeric;

-- ------------------------------------------------------------
--  2) PARÇALI ÖDEME
--     Bir adisyon birden fazla ödemeyle kapanabilir:
--     400 nakit + 600 kart, ya da 4 kişiye eşit bölünmüş.
-- ------------------------------------------------------------

create table if not exists public.payments (
  id          uuid primary key default gen_random_uuid(),
  venue_id    uuid not null references public.venues(id) on delete cascade,
  order_id    uuid not null references public.orders(id) on delete cascade,
  method      text not null,
  amount      numeric not null,
  staff_id    uuid references public.staff(id) on delete set null,
  staff_name  text,
  note        text,
  at          timestamptz not null default now()
);

create index if not exists idx_pay_order on public.payments (order_id);
create index if not exists idx_pay_venue_at on public.payments (venue_id, at);

-- ------------------------------------------------------------
--  3) YEMEK KARTLARI — ödeme tipleri işletmeye göre ayarlanır
-- ------------------------------------------------------------

alter table public.venues add column if not exists payment_methods jsonb
  not null default '["Nakit","Kredi Kartı","Multinet","Sodexo","Ticket","Setcard","Metropol"]'::jsonb;

-- nakit sayılan tipler (kasa sayımında beklenen tutarı bunlar belirler)
alter table public.venues add column if not exists cash_methods jsonb
  not null default '["Nakit"]'::jsonb;

-- ------------------------------------------------------------
--  4) KASA VARDİYASI
--     Açılışta kasadaki para, kapanışta sayım ve fark.
-- ------------------------------------------------------------

create table if not exists public.shifts (
  id            uuid primary key default gen_random_uuid(),
  venue_id      uuid not null references public.venues(id) on delete cascade,
  opened_by     uuid references public.staff(id) on delete set null,
  opened_name   text,
  opened_at     timestamptz not null default now(),
  opening_cash  numeric not null default 0,
  closed_by     uuid references public.staff(id) on delete set null,
  closed_name   text,
  closed_at     timestamptz,
  counted_cash  numeric,
  expected_cash numeric,
  note          text
);

create index if not exists idx_shift_venue on public.shifts (venue_id, opened_at desc);

-- aynı anda tek açık vardiya
create unique index if not exists idx_shift_open_one
  on public.shifts (venue_id) where closed_at is null;

-- ------------------------------------------------------------
--  5) GEL-AL (paket servis değil — müşteri gelip alıyor)
-- ------------------------------------------------------------

alter table public.orders add column if not exists kind text not null default 'masa';
alter table public.orders add column if not exists customer text;
alter table public.orders add column if not exists shift_id uuid references public.shifts(id) on delete set null;

do $$
begin
  begin
    alter table public.orders add constraint orders_kind_chk
      check (kind in ('masa','gel-al'));
  exception when duplicate_object then null;
  end;
end $$;

-- ============================================================
--  YETKİ KURALLARI
-- ============================================================

alter table public.option_groups     enable row level security;
alter table public.options           enable row level security;
alter table public.menu_item_options enable row level security;
alter table public.payments          enable row level security;
alter table public.shifts            enable row level security;

-- seçenekler: herkes okur, yönetici düzenler
do $$
declare t text;
begin
  foreach t in array array['option_groups','options','menu_item_options'] loop
    execute format('drop policy if exists %1$s_read on public.%1$s', t);
    execute format(
      'create policy %1$s_read on public.%1$s for select using (venue_id = public.my_venue())', t);
    execute format('drop policy if exists %1$s_write on public.%1$s', t);
    execute format(
      'create policy %1$s_write on public.%1$s for all
         using (venue_id = public.my_venue() and public.is_admin())
         with check (venue_id = public.my_venue() and public.is_admin())', t);
  end loop;
end $$;

-- ödemeler: herkes okur; almak için 'close' yetkisi gerekir,
-- silmek yalnızca adisyon hâlâ açıkken mümkün (kapanmış hesaptan para düşülemez)
drop policy if exists pay_read on public.payments;
create policy pay_read on public.payments for select
  using (venue_id = public.my_venue());

drop policy if exists pay_ins on public.payments;
create policy pay_ins on public.payments for insert
  with check (venue_id = public.my_venue() and public.has_perm('close'));

drop policy if exists pay_del on public.payments;
create policy pay_del on public.payments for delete
  using (
    venue_id = public.my_venue()
    and public.has_perm('close')
    and exists (select 1 from public.orders o
                 where o.id = order_id and o.status = 'open')
  );

-- kasa: herkes okur (garson da vardiya açık mı görsün), açıp kapatmak 'cash' yetkisi ister.
-- 'cash' has_perm varsayılanında yok → yalnızca yöneticide açık.
drop policy if exists shift_read on public.shifts;
create policy shift_read on public.shifts for select
  using (venue_id = public.my_venue());

drop policy if exists shift_ins on public.shifts;
create policy shift_ins on public.shifts for insert
  with check (venue_id = public.my_venue() and public.has_perm('cash'));

drop policy if exists shift_upd on public.shifts;
create policy shift_upd on public.shifts for update
  using (venue_id = public.my_venue() and public.has_perm('cash'))
  with check (venue_id = public.my_venue());

-- ============================================================
--  ANLIK GÜNCELLEME
-- ============================================================
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.payments'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.shifts'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.option_groups'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.options'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.menu_item_options'; exception when others then null; end;
end $$;

-- ============================================================
--  ÖRNEK SEÇENEK GRUPLARI (yalnızca ilk kurulumda)
-- ============================================================
do $$
declare
  v uuid;
  g uuid;
begin
  select id into v from public.venues where slug = 'osman';
  if v is null then return; end if;
  if exists (select 1 from public.option_groups where venue_id = v) then return; end if;

  -- Pişirme (zorunlu, tek seçim)
  insert into public.option_groups (venue_id, name, min_select, max_select, sort)
  values (v, 'Pişirme', 1, 1, 1) returning id into g;
  insert into public.options (venue_id, group_id, name, price_delta, sort) values
    (v, g, 'Az pişmiş', 0, 1),
    (v, g, 'Orta',      0, 2),
    (v, g, 'İyi pişmiş',0, 3);

  -- Porsiyon (zorunlu, tek seçim)
  insert into public.option_groups (venue_id, name, min_select, max_select, sort)
  values (v, 'Porsiyon', 1, 1, 2) returning id into g;
  insert into public.options (venue_id, group_id, name, price_delta, sort) values
    (v, g, 'Tam',   0,   1),
    (v, g, 'Yarım', -80, 2),
    (v, g, 'Büyük', 120, 3);

  -- Ekstralar (isteğe bağlı, çoklu)
  insert into public.option_groups (venue_id, name, min_select, max_select, sort)
  values (v, 'Ekstralar', 0, 9, 3) returning id into g;
  insert into public.options (venue_id, group_id, name, price_delta, sort) values
    (v, g, 'Soğansız',      0,  1),
    (v, g, 'Acısız',        0,  2),
    (v, g, 'Acılı',         0,  3),
    (v, g, 'Ekstra peynir', 60, 4),
    (v, g, 'Ekstra sos',    30, 5);
end $$;

select 'v2 kuruldu: seçenekler, parçalı ödeme, yemek kartları, kasa vardiyası, gel-al' as sonuc;
