-- ============================================================================
-- MEU NEGÓCIO — 002: Row Level Security + funções transacionais
-- Regra: Empresa A nunca acessa dados da Empresa B, mesmo forjando requests.
-- ============================================================================

-- ---------- RLS: habilitar ---------------------------------------------------
alter table organizations        enable row level security;
alter table profiles             enable row level security;
alter table organization_members enable row level security;
alter table categories           enable row level security;
alter table products             enable row level security;
alter table stock_movements      enable row level security;
alter table customers            enable row level security;
alter table sales                enable row level security;
alter table sale_items           enable row level security;
alter table payments             enable row level security;
alter table audit_logs           enable row level security;
alter table plans                enable row level security;
alter table subscriptions       enable row level security;

-- ---------- Políticas --------------------------------------------------------
create policy "org: membros leem"   on organizations for select using (id in (select user_org_ids()));
create policy "org: membros editam" on organizations for update using (id in (select user_org_ids()));

create policy "profiles: dono lê"     on profiles for select using (id = auth.uid());
create policy "profiles: dono edita"  on profiles for update using (id = auth.uid());

create policy "members: ver colegas" on organization_members for select
  using (user_id = auth.uid() or organization_id in (select user_org_ids()));

create policy "plans: público autenticado" on plans for select to authenticated using (true);
create policy "subs: membros leem" on subscriptions for select using (organization_id in (select user_org_ids()));

-- Padrão multi-tenant para tabelas com organization_id
do $$
declare t text;
begin
  foreach t in array array['categories','products','stock_movements','customers',
                           'sales','sale_items','payments','audit_logs']
  loop
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

-- ---------- Função: criar organização (onboarding) --------------------------
-- security definer: resolve o ovo-e-galinha (usuário ainda não é membro de nada)
create or replace function public.create_organization(
  p_name text, p_business_type text, p_tracks_stock boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'nome da empresa é obrigatório'; end if;

  insert into organizations (name, business_type, tracks_stock)
  values (trim(p_name), p_business_type, coalesce(p_tracks_stock, true))
  returning id into v_org;

  insert into organization_members (organization_id, user_id, role)
  values (v_org, auth.uid(), 'owner');

  insert into subscriptions (organization_id, plan_id, trial_ends_at)
  values (v_org, 'free', now() + interval '7 days');

  insert into audit_logs (organization_id, user_id, action, entity, entity_id)
  values (v_org, auth.uid(), 'create', 'organization', v_org);

  return v_org;
end $$;

-- ---------- Função: movimentação de estoque ---------------------------------
create or replace function public.register_stock_movement(
  p_org uuid, p_product uuid, p_kind movement_kind,
  p_reason text, p_quantity numeric, p_note text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_stock numeric;
begin
  if p_org not in (select user_org_ids()) then raise exception 'acesso negado'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'quantidade deve ser maior que zero'; end if;

  select stock into v_stock from products
   where id = p_product and organization_id = p_org for update;
  if not found then raise exception 'produto não encontrado'; end if;

  if p_kind = 'saida' and v_stock < p_quantity then
    raise exception 'estoque insuficiente (disponível: %)', v_stock;
  end if;

  update products
     set stock = stock + case when p_kind = 'entrada' then p_quantity else -p_quantity end,
         updated_at = now()
   where id = p_product;

  insert into stock_movements (organization_id, product_id, user_id, kind, reason, quantity, note)
  values (p_org, p_product, auth.uid(), p_kind, p_reason, p_quantity, p_note)
  returning id into v_id;

  insert into audit_logs (organization_id, user_id, action, entity, entity_id, detail)
  values (p_org, auth.uid(), 'stock_'||p_kind::text, 'product', p_product,
          jsonb_build_object('reason', p_reason, 'quantity', p_quantity));
  return v_id;
end $$;

-- ---------- Função: criar venda (transação completa) ------------------------
-- p_items: [{"product_id": uuid, "quantity": n, "unit_price": n}]
create or replace function public.create_sale(
  p_org uuid, p_customer uuid, p_payment_method payment_method,
  p_discount numeric, p_items jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_sale uuid; v_number bigint; v_subtotal numeric := 0; v_total numeric;
  item record; v_stock numeric; v_name text; v_tracks boolean;
begin
  if p_org not in (select user_org_ids()) then raise exception 'acesso negado'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'venda precisa de pelo menos um item';
  end if;

  select tracks_stock into v_tracks from organizations where id = p_org;

  select coalesce(max(number),0) + 1 into v_number
    from sales where organization_id = p_org;

  for item in
    select (e->>'product_id')::uuid as product_id,
           (e->>'quantity')::numeric as quantity,
           (e->>'unit_price')::numeric as unit_price
    from jsonb_array_elements(p_items) e
  loop
    if item.quantity is null or item.quantity <= 0 then raise exception 'quantidade inválida'; end if;
    if item.unit_price is null or item.unit_price < 0 then raise exception 'preço inválido'; end if;
    v_subtotal := v_subtotal + round(item.quantity * item.unit_price, 2);
  end loop;

  v_total := greatest(v_subtotal - coalesce(p_discount,0), 0);

  insert into sales (organization_id, number, customer_id, user_id, subtotal, discount, total, payment_method)
  values (p_org, v_number, p_customer, auth.uid(), v_subtotal, coalesce(p_discount,0), v_total, p_payment_method)
  returning id into v_sale;

  for item in
    select (e->>'product_id')::uuid as product_id,
           (e->>'quantity')::numeric as quantity,
           (e->>'unit_price')::numeric as unit_price
    from jsonb_array_elements(p_items) e
  loop
    select stock, name into v_stock, v_name from products
     where id = item.product_id and organization_id = p_org and active for update;
    if not found then raise exception 'produto não encontrado ou inativo'; end if;

    if v_tracks then
      if v_stock < item.quantity then
        raise exception 'estoque insuficiente de "%" (disponível: %)', v_name, v_stock;
      end if;
      update products set stock = stock - item.quantity, updated_at = now()
       where id = item.product_id;
      insert into stock_movements (organization_id, product_id, user_id, kind, reason, quantity, note)
      values (p_org, item.product_id, auth.uid(), 'saida', 'venda', item.quantity, 'Venda #'||v_number);
    end if;

    insert into sale_items (organization_id, sale_id, product_id, product_name, quantity, unit_price, total)
    values (p_org, v_sale, item.product_id, v_name, item.quantity, item.unit_price,
            round(item.quantity * item.unit_price, 2));
  end loop;

  insert into payments (organization_id, sale_id, method, amount)
  values (p_org, v_sale, p_payment_method, v_total);

  insert into audit_logs (organization_id, user_id, action, entity, entity_id, detail)
  values (p_org, auth.uid(), 'create', 'sale', v_sale,
          jsonb_build_object('number', v_number, 'total', v_total));

  return v_sale;
end $$;

-- ---------- Função: cancelar venda (estorno completo) -----------------------
create or replace function public.cancel_sale(p_org uuid, p_sale uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare item record; v_status sale_status; v_number bigint; v_tracks boolean;
begin
  if p_org not in (select user_org_ids()) then raise exception 'acesso negado'; end if;

  select status, number into v_status, v_number
    from sales where id = p_sale and organization_id = p_org for update;
  if not found then raise exception 'venda não encontrada'; end if;
  if v_status = 'cancelada' then raise exception 'venda já cancelada'; end if;

  select tracks_stock into v_tracks from organizations where id = p_org;

  if v_tracks then
    for item in select product_id, quantity from sale_items where sale_id = p_sale loop
      update products set stock = stock + item.quantity, updated_at = now()
       where id = item.product_id and organization_id = p_org;
      insert into stock_movements (organization_id, product_id, user_id, kind, reason, quantity, note)
      values (p_org, item.product_id, auth.uid(), 'entrada', 'devolucao', item.quantity,
              'Cancelamento da venda #'||v_number);
    end loop;
  end if;

  insert into payments (organization_id, sale_id, method, amount)
  select organization_id, sale_id, method, -amount
    from payments where sale_id = p_sale and amount > 0;

  update sales set status = 'cancelada', canceled_at = now() where id = p_sale;

  insert into audit_logs (organization_id, user_id, action, entity, entity_id, detail)
  values (p_org, auth.uid(), 'cancel', 'sale', p_sale, jsonb_build_object('number', v_number));
end $$;
