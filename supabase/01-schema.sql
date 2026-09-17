-- ============================================================
--  Osman POS — veritabanı şeması ve yetki kuralları
--  Supabase → SQL Editor → yapıştır → Run
--  Bu dosyayı iki kez çalıştırmak güvenlidir.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- iş günü (gece 02:00 kapanışı önceki güne yazılsın) ----------
create or replace function public.biz_day(ts timestamptz default now())
returns date language sql immutable as $$
  select (((ts at time zone 'Europe/Istanbul') - interval '6 hours'))::date;
$$;

-- ============================================================
--  TABLOLAR
-- ============================================================

-- işletme
create table if not exists public.venues (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  kdv         int  not null default 10,
  join_code   text not null,             -- personel hesabı açarken istenen kod
  created_at  timestamptz not null default now()
);

-- personel (auth.users ile birebir)
create table if not exists public.staff (
  id          uuid primary key references auth.users(id) on delete cascade,
  venue_id    uuid not null references public.venues(id) on delete cascade,
  username    text not null,
  name        text not null,
  role        text not null default 'waiter' check (role in ('admin','waiter')),
  perms       jsonb not null default '{}'::jsonb,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (venue_id, username)
);

-- masalar
create table if not exists public.tables (
  id          uuid primary key default gen_random_uuid(),
  venue_id    uuid not null references public.venues(id) on delete cascade,
  name        text not null,
  zone        text not null default 'Salon',
  seats       int  not null default 4,
  sort        int  not null default 0
);

-- menü
create table if not exists public.menu_items (
  id          uuid primary key default gen_random_uuid(),
  venue_id    uuid not null references public.venues(id) on delete cascade,
  cat_id      text not null,
  cat_name    text not null,
  name        text not null,
  name_en     text,
  price       numeric,                   -- null = günün fiyatı
  kcal        int,
  sort        int not null default 0,
  hidden      boolean not null default false,
  sold_out    boolean not null default false
);

-- adisyon
create table if not exists public.orders (
  id          uuid primary key default gen_random_uuid(),
  venue_id    uuid not null references public.venues(id) on delete cascade,
  no          int,
  table_id    uuid references public.tables(id) on delete set null,
  status      text not null default 'open' check (status in ('open','closed')),
  guests      int  not null default 2,
  waiter_id   uuid references public.staff(id) on delete set null,
  waiter_name text,
  note        text,
  discount    jsonb,
  payment     text,
  totals      jsonb,
  opened_at   timestamptz not null default now(),
  closed_at   timestamptz
);

-- adisyon satırları
create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  venue_id    uuid not null references public.venues(id) on delete cascade,
  mid         text,
  name        text not null,
  cat_name    text,
  price       numeric not null default 0,
  qty         int not null default 1,
  note        text,
  status      text not null default 'draft' check (status in ('draft','sent','ready','served','void')),
  promo       jsonb,
  void_reason text,
  sent_at     timestamptz,
  ready_at    timestamptz,
  served_at   timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists idx_orders_venue_status on public.orders (venue_id, status);
create index if not exists idx_orders_venue_closed on public.orders (venue_id, closed_at);
create index if not exists idx_items_order on public.order_items (order_id);
create index if not exists idx_items_venue_status on public.order_items (venue_id, status);

-- ============================================================
--  YARDIMCI FONKSİYONLAR (yetki kuralları bunları kullanır)
-- ============================================================

create or replace function public.my_venue()
returns uuid language sql stable security definer set search_path = public as $$
  select venue_id from public.staff where id = auth.uid() and active;
$$;

create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.staff where id = auth.uid() and active;
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.staff where id = auth.uid() and active), false);
$$;

-- yetki: yöneticide her şey açık; garsonda perms alanı, yoksa varsayılan
create or replace function public.has_perm(p text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
      when s.role = 'admin' then true
      when s.perms ? p     then (s.perms ->> p)::boolean
      when p in ('tables','order','close') then true
      else false
    end
    from public.staff s where s.id = auth.uid() and s.active
  ), false);
$$;

-- ============================================================
--  ADİSYON NUMARASI (her iş günü 1'den başlar)
-- ============================================================

create or replace function public.set_order_no()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.no is null then
    select coalesce(max(no), 0) + 1 into new.no
      from public.orders
     where venue_id = new.venue_id
       and biz_day(opened_at) = biz_day(now());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_order_no on public.orders;
create trigger trg_order_no before insert on public.orders
for each row execute function public.set_order_no();

-- ============================================================
--  KAYIT OLMA: yeni auth kullanıcısı → staff satırı
--  Kayıt olurken venue_slug + join_code doğru olmak zorunda.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v      public.venues%rowtype;
  meta   jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  wanted text := coalesce(meta ->> 'role', 'waiter');
  has_admin boolean;
begin
  if meta ->> 'venue_slug' is null then
    raise exception 'venue_slug gerekli';
  end if;

  select * into v from public.venues where slug = meta ->> 'venue_slug';
  if not found then
    raise exception 'işletme bulunamadı';
  end if;
  if coalesce(meta ->> 'join_code', '') <> v.join_code then
    raise exception 'katılım kodu hatalı';
  end if;

  select exists(select 1 from public.staff where venue_id = v.id and role = 'admin') into has_admin;
  -- ilk hesap yönetici olur; sonrakiler yalnızca garson
  if has_admin then wanted := 'waiter'; else wanted := 'admin'; end if;

  insert into public.staff (id, venue_id, username, name, role, perms)
  values (
    new.id, v.id,
    lower(coalesce(meta ->> 'username', split_part(new.email, '@', 1))),
    coalesce(meta ->> 'name', 'Personel'),
    wanted,
    coalesce(meta -> 'perms', '{}'::jsonb)
  );
  return new;
end;
$$;

drop trigger if exists trg_new_user on auth.users;
create trigger trg_new_user after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================================
--  SATIR BAZLI YETKİ (RLS)
-- ============================================================

alter table public.venues      enable row level security;
alter table public.staff       enable row level security;
alter table public.tables      enable row level security;
alter table public.menu_items  enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- işletme: kendi işletmeni gör, yalnızca yönetici değiştirir
drop policy if exists venues_read on public.venues;
create policy venues_read on public.venues for select
  using (id = public.my_venue());
drop policy if exists venues_write on public.venues;
create policy venues_write on public.venues for update
  using (id = public.my_venue() and public.is_admin())
  with check (id = public.my_venue());

-- personel: aynı işletmenin personelini gör; yalnızca yönetici ekler/değiştirir/siler
drop policy if exists staff_read on public.staff;
create policy staff_read on public.staff for select
  using (venue_id = public.my_venue());
drop policy if exists staff_ins on public.staff;
create policy staff_ins on public.staff for insert
  with check (venue_id = public.my_venue() and public.is_admin());
drop policy if exists staff_upd on public.staff;
create policy staff_upd on public.staff for update
  using (venue_id = public.my_venue() and public.is_admin())
  with check (venue_id = public.my_venue());
drop policy if exists staff_del on public.staff;
create policy staff_del on public.staff for delete
  using (venue_id = public.my_venue() and public.is_admin() and id <> auth.uid());

-- masalar: herkes okur, yönetici değiştirir
drop policy if exists tables_read on public.tables;
create policy tables_read on public.tables for select using (venue_id = public.my_venue());
drop policy if exists tables_write on public.tables;
create policy tables_write on public.tables for all
  using (venue_id = public.my_venue() and public.is_admin())
  with check (venue_id = public.my_venue() and public.is_admin());

-- menü: herkes okur; "bugün bitti" garson da işaretleyebilir, gerisi yöneticide
drop policy if exists menu_read on public.menu_items;
create policy menu_read on public.menu_items for select using (venue_id = public.my_venue());
drop policy if exists menu_ins on public.menu_items;
create policy menu_ins on public.menu_items for insert
  with check (venue_id = public.my_venue() and public.is_admin());
drop policy if exists menu_del on public.menu_items;
create policy menu_del on public.menu_items for delete
  using (venue_id = public.my_venue() and public.is_admin());
drop policy if exists menu_upd on public.menu_items;
create policy menu_upd on public.menu_items for update
  using (venue_id = public.my_venue())
  with check (venue_id = public.my_venue());

-- adisyon: aynı işletme; kapatmak için 'close' yetkisi gerekir
drop policy if exists orders_read on public.orders;
create policy orders_read on public.orders for select using (venue_id = public.my_venue());
drop policy if exists orders_ins on public.orders;
create policy orders_ins on public.orders for insert
  with check (venue_id = public.my_venue() and public.has_perm('order') and status = 'open');
drop policy if exists orders_upd on public.orders;
create policy orders_upd on public.orders for update
  using (venue_id = public.my_venue())
  with check (
    venue_id = public.my_venue()
    and (status = 'open' or public.has_perm('close'))
    and (discount is null or public.has_perm('discount'))
  );
drop policy if exists orders_del on public.orders;
create policy orders_del on public.orders for delete
  using (venue_id = public.my_venue() and status = 'open');

-- satırlar: ikram 'discount', iptal 'voidItem' yetkisi ister
drop policy if exists items_read on public.order_items;
create policy items_read on public.order_items for select using (venue_id = public.my_venue());
drop policy if exists items_ins on public.order_items;
create policy items_ins on public.order_items for insert
  with check (venue_id = public.my_venue() and public.has_perm('order'));
drop policy if exists items_upd on public.order_items;
create policy items_upd on public.order_items for update
  using (venue_id = public.my_venue())
  with check (
    venue_id = public.my_venue()
    and (promo is null or public.has_perm('discount'))
    and (status <> 'void' or public.has_perm('voidItem'))
  );
drop policy if exists items_del on public.order_items;
create policy items_del on public.order_items for delete
  using (venue_id = public.my_venue() and status = 'draft');

-- ============================================================
--  ANLIK GÜNCELLEME (mutfak tableti siparişi anında görsün)
-- ============================================================
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.orders'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.order_items'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.tables'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.menu_items'; exception when others then null; end;
end $$;

-- ============================================================
--  İŞLETMEYİ OLUŞTUR
-- ============================================================
insert into public.venues (slug, name, kdv, join_code)
values ('osman', 'Osman Gourmet Beydağı', 10, 'OSMAN-2026')
on conflict (slug) do nothing;

-- masalar (yalnızca ilk kurulumda)
insert into public.tables (venue_id, name, zone, seats, sort)
select v.id, g.name, g.zone, g.seats, g.sort
from public.venues v,
     (values
        ('1','Salon',4,1),('2','Salon',4,2),('3','Salon',4,3),('4','Salon',4,4),
        ('5','Salon',4,5),('6','Salon',4,6),('7','Salon',4,7),('8','Salon',4,8),
        ('9','Salon',4,9),('10','Salon',4,10),('11','Salon',4,11),('12','Salon',4,12),
        ('B1','Bahçe',4,21),('B2','Bahçe',4,22),('B3','Bahçe',4,23),('B4','Bahçe',4,24),
        ('B5','Bahçe',4,25),('B6','Bahçe',4,26),('B7','Bahçe',4,27),('B8','Bahçe',4,28),
        ('Ü1','Üst Kat',6,41),('Ü2','Üst Kat',6,42),('Ü3','Üst Kat',6,43),
        ('Ü4','Üst Kat',6,44),('Ü5','Üst Kat',6,45),('Ü6','Üst Kat',6,46)
     ) as g(name,zone,seats,sort)
where v.slug = 'osman'
  and not exists (select 1 from public.tables t where t.venue_id = v.id);

select 'Şema kuruldu. İşletme: ' || name || ' · katılım kodu: ' || join_code as sonuc
from public.venues where slug = 'osman';
