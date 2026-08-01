-- ============================================================================
-- MEU NEGÓCIO — 003: financeiro/compras (tabelas + RLS prontas; UI na v2)
-- ============================================================================

create type account_status as enum ('pendente','pago','atrasado','parcial','cancelado');

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  document text, phone text, email text, address text, notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_suppliers_org on suppliers(organization_id, name);

create table purchases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  supplier_id uuid references suppliers(id) on delete set null,
  user_id uuid,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  freight numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment_method payment_method,
  created_at timestamptz not null default now()
);

create table purchase_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  purchase_id uuid not null references purchases(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity numeric(12,3) not null check (quantity > 0),
  unit_cost numeric(12,2) not null check (unit_cost >= 0),
  total numeric(12,2) not null
);

create table accounts_payable (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  supplier_id uuid references suppliers(id) on delete set null,
  description text not null,
  category text,
  amount numeric(12,2) not null,
  paid_amount numeric(12,2) not null default 0,
  due_date date not null,
  status account_status not null default 'pendente',
  created_at timestamptz not null default now()
);
create index idx_ap_org_due on accounts_payable(organization_id, due_date);

create table accounts_receivable (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  sale_id uuid references sales(id) on delete set null,
  description text not null,
  amount numeric(12,2) not null,
  received_amount numeric(12,2) not null default 0,
  due_date date not null,
  status account_status not null default 'pendente',
  created_at timestamptz not null default now()
);
create index idx_ar_org_due on accounts_receivable(organization_id, due_date);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid,
  description text not null,
  category text,
  amount numeric(12,2) not null check (amount > 0),
  payment_method payment_method,
  expense_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);
create index idx_expenses_org on expenses(organization_id, expense_date desc);

create table cash_registers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  opened_by uuid, closed_by uuid,
  opening_amount numeric(12,2) not null default 0,
  expected_amount numeric(12,2),
  informed_amount numeric(12,2),
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

create table cash_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  cash_register_id uuid not null references cash_registers(id) on delete cascade,
  user_id uuid,
  kind movement_kind not null,
  reason text not null,
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid,
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- RLS
do $$
declare t text;
begin
  foreach t in array array['suppliers','purchases','purchase_items','accounts_payable',
                           'accounts_receivable','expenses','cash_registers',
                           'cash_movements','notifications']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format(
      'create policy "tenant select" on %I for select using (organization_id in (select user_org_ids()));', t);
    execute format(
      'create policy "tenant insert" on %I for insert with check (organization_id in (select user_org_ids()));', t);
    execute format(
      'create policy "tenant update" on %I for update using (organization_id in (select user_org_ids()));', t);
    execute format(
      'create policy "tenant delete" on %I for delete using (organization_id in (select user_org_ids()));', t);
  end loop;
end $$;
