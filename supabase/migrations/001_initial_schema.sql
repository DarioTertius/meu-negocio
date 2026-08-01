-- ============================================================================
-- MEU NEGÓCIO — 001: schema inicial (núcleo + multi-tenancy)
-- Recriável do zero: supabase db reset aplica tudo.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------- ENUMS -----------------------------------------------------------
create type member_role as enum ('owner','admin','manager','seller','operator');
create type payment_method as enum ('dinheiro','pix','debito','credito','transferencia','boleto','outros');
create type movement_kind as enum ('entrada','saida');
create type sale_status as enum ('concluida','cancelada');

-- ---------- ORGANIZAÇÕES / USUÁRIOS ----------------------------------------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_type text,
  tracks_stock boolean not null default true,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create table organization_members (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role member_role not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

-- perfil criado automaticamente no signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- organizações do usuário logado (security definer evita recursão de RLS)
create or replace function public.user_org_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select organization_id from organization_members where user_id = auth.uid()
$$;

-- ---------- CATÁLOGO / ESTOQUE ----------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  name text not null,
  sku text,
  barcode text,
  unit text not null default 'un',
  cost numeric(12,2) not null default 0 check (cost >= 0),
  price numeric(12,2) not null default 0 check (price >= 0),
  stock numeric(12,3) not null default 0,
  min_stock numeric(12,3) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_products_org on products(organization_id);
create index idx_products_org_name on products(organization_id, name);

create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  kind movement_kind not null,
  reason text not null,
  quantity numeric(12,3) not null check (quantity > 0),
  note text,
  created_at timestamptz not null default now()
);
create index idx_stock_mov_org on stock_movements(organization_id, created_at desc);
create index idx_stock_mov_product on stock_movements(product_id);

-- ---------- CLIENTES ---------------------------------------------------------
create table customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  document text,
  phone text,
  email text,
  address text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_customers_org on customers(organization_id, name);

-- ---------- VENDAS -----------------------------------------------------------
create table sales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  number bigint not null,
  customer_id uuid references customers(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  status sale_status not null default 'concluida',
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0 check (discount >= 0),
  total numeric(12,2) not null default 0,
  payment_method payment_method not null,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, number)
);
create index idx_sales_org_date on sales(organization_id, created_at desc);

create table sale_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid not null references products(id),
  product_name text not null,
  quantity numeric(12,3) not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  total numeric(12,2) not null
);
create index idx_sale_items_sale on sale_items(sale_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  sale_id uuid references sales(id) on delete cascade,
  method payment_method not null,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);
create index idx_payments_org on payments(organization_id, created_at desc);

-- ---------- AUDITORIA --------------------------------------------------------
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  user_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_org on audit_logs(organization_id, created_at desc);

-- ---------- PLANOS -----------------------------------------------------------
create table plans (
  id text primary key,
  name text not null,
  price_cents integer not null default 0,
  limits jsonb not null default '{}'::jsonb
);

insert into plans (id, name, price_cents, limits) values
 ('free',  'Free',  0,    '{"products":30,"sales_per_month":30,"customers":20,"users":1}'),
 ('basic', 'Basic', 1490, '{"products":null,"sales_per_month":null,"customers":null,"users":3}'),
 ('pro',   'Pro',   2990, '{"products":null,"sales_per_month":null,"customers":null,"users":10}');

create table subscriptions (
  organization_id uuid primary key references organizations(id) on delete cascade,
  plan_id text not null references plans(id) default 'free',
  trial_ends_at timestamptz,
  created_at timestamptz not null default now()
);
