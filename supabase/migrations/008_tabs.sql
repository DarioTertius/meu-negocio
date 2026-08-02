-- ============================================================================
-- MEU NEGÓCIO — 008: comandas (mesas) 
-- Fluxo: abre comanda → vai lançando itens → fecha e vira uma venda normal
-- (a baixa de estoque acontece no fechamento, pela mesma create_sale de sempre)
-- ============================================================================

create type tab_status as enum ('aberta','fechada','cancelada');

create table tabs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  label text not null,                       -- "Mesa 5", "Balcão", "João"
  customer_id uuid references customers(id) on delete set null,
  status tab_status not null default 'aberta',
  sale_id uuid references sales(id) on delete set null,
  opened_by uuid,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_tabs_org_status on tabs(organization_id, status, created_at desc);

create table tab_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  tab_id uuid not null references tabs(id) on delete cascade,
  product_id uuid not null references products(id),
  product_name text not null,
  quantity numeric(12,3) not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  user_id uuid,
  created_at timestamptz not null default now()
);
create index idx_tab_items_tab on tab_items(tab_id);

alter table tabs enable row level security;
alter table tab_items enable row level security;
do $$
declare t text;
begin
  foreach t in array array['tabs','tab_items'] loop
    execute format('create policy "tenant select" on %I for select using (organization_id in (select user_org_ids()));', t);
    execute format('create policy "tenant insert" on %I for insert with check (organization_id in (select user_org_ids()));', t);
    execute format('create policy "tenant update" on %I for update using (organization_id in (select user_org_ids()));', t);
    execute format('create policy "tenant delete" on %I for delete using (organization_id in (select user_org_ids()));', t);
  end loop;
end $$;

-- Lança item na comanda (preço congelado no momento do lançamento)
create or replace function public.add_tab_item(
  p_org uuid, p_tab uuid, p_product uuid, p_quantity numeric
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_status tab_status; v_name text; v_price numeric; v_id uuid;
begin
  if p_org not in (select user_org_ids()) then raise exception 'acesso negado'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'quantidade inválida'; end if;

  select status into v_status from tabs
   where id = p_tab and organization_id = p_org for update;
  if not found then raise exception 'comanda não encontrada'; end if;
  if v_status <> 'aberta' then raise exception 'esta comanda já foi fechada'; end if;

  select name, price into v_name, v_price from products
   where id = p_product and organization_id = p_org and active;
  if not found then raise exception 'produto não encontrado ou inativo'; end if;

  insert into tab_items (organization_id, tab_id, product_id, product_name, quantity, unit_price, user_id)
  values (p_org, p_tab, p_product, v_name, p_quantity, v_price, auth.uid())
  returning id into v_id;
  return v_id;
end $$;

-- Remove item de comanda aberta
create or replace function public.remove_tab_item(p_org uuid, p_item uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_status tab_status;
begin
  if p_org not in (select user_org_ids()) then raise exception 'acesso negado'; end if;
  select t.status into v_status
    from tab_items i join tabs t on t.id = i.tab_id
   where i.id = p_item and i.organization_id = p_org for update of t;
  if not found then raise exception 'item não encontrado'; end if;
  if v_status <> 'aberta' then raise exception 'esta comanda já foi fechada'; end if;
  delete from tab_items where id = p_item;
end $$;

-- Fecha a comanda: agrupa itens, cria a venda (baixa estoque, pagamento) e vincula
create or replace function public.close_tab(
  p_org uuid, p_tab uuid, p_payment_method payment_method, p_discount numeric
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_status tab_status; v_customer uuid; v_items jsonb; v_sale uuid;
begin
  if p_org not in (select user_org_ids()) then raise exception 'acesso negado'; end if;

  select status, customer_id into v_status, v_customer from tabs
   where id = p_tab and organization_id = p_org for update;
  if not found then raise exception 'comanda não encontrada'; end if;
  if v_status <> 'aberta' then raise exception 'esta comanda já foi fechada'; end if;

  select jsonb_agg(jsonb_build_object(
           'product_id', product_id,
           'quantity', total_qty,
           'unit_price', unit_price))
    into v_items
    from (
      select product_id, unit_price, sum(quantity) as total_qty
      from tab_items where tab_id = p_tab
      group by product_id, unit_price
    ) g;
  if v_items is null then raise exception 'comanda sem itens'; end if;

  v_sale := create_sale(p_org, v_customer, p_payment_method, coalesce(p_discount, 0), v_items);

  update tabs set status = 'fechada', sale_id = v_sale, closed_at = now()
   where id = p_tab;

  insert into audit_logs (organization_id, user_id, action, entity, entity_id,
    detail)
  values (p_org, auth.uid(), 'close', 'tab', p_tab, jsonb_build_object('sale_id', v_sale));

  return v_sale;
end $$;

-- Cancela comanda aberta (sem impacto de estoque — nada foi baixado ainda)
create or replace function public.cancel_tab(p_org uuid, p_tab uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_status tab_status;
begin
  if p_org not in (select user_org_ids()) then raise exception 'acesso negado'; end if;
  select status into v_status from tabs
   where id = p_tab and organization_id = p_org for update;
  if not found then raise exception 'comanda não encontrada'; end if;
  if v_status <> 'aberta' then raise exception 'esta comanda já foi fechada'; end if;

  update tabs set status = 'cancelada', closed_at = now() where id = p_tab;
  insert into audit_logs (organization_id, user_id, action, entity, entity_id)
  values (p_org, auth.uid(), 'cancel', 'tab', p_tab);
end $$;
