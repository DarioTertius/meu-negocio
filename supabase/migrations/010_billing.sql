-- ============================================================================
-- MEU NEGÓCIO — 010: cobrança automática (Mercado Pago) + limites do plano Free
-- ============================================================================

alter table subscriptions add column if not exists provider text;
alter table subscriptions add column if not exists provider_subscription_id text;
alter table subscriptions add column if not exists status text not null default 'ativa';
alter table subscriptions add column if not exists updated_at timestamptz not null default now();

create policy "subs: membros atualizam" on subscriptions
  for update using (organization_id in (select user_org_ids()));

-- A empresa está no plano pago OU dentro do trial?
create or replace function public.org_is_premium(p_org uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select (s.plan_id <> 'free' and s.status in ('ativa','pendente'))
            or coalesce(s.trial_ends_at > now(), false)
     from subscriptions s where s.organization_id = p_org),
    false)
$$;

-- Limite de produtos do plano Free (30 ativos)
create or replace function public.check_product_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_limit int; v_count int;
begin
  if org_is_premium(new.organization_id) then return new; end if;

  select (p.limits->>'products')::int into v_limit
    from subscriptions s join plans p on p.id = s.plan_id
   where s.organization_id = new.organization_id;
  if v_limit is null then return new; end if;

  select count(*) into v_count from products
   where organization_id = new.organization_id and active;
  if v_count >= v_limit then
    raise exception 'Limite do plano Free atingido (% produtos). Assine um plano em Configurações para cadastrar mais.', v_limit;
  end if;
  return new;
end $$;

create trigger trg_check_product_limit
  before insert on products
  for each row execute function public.check_product_limit();

-- Limite de vendas/mês do plano Free (checado dentro da create_sale)
create or replace function public.check_sale_limit(p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_limit int; v_count int;
begin
  if org_is_premium(p_org) then return; end if;

  select (p.limits->>'sales_per_month')::int into v_limit
    from subscriptions s join plans p on p.id = s.plan_id
   where s.organization_id = p_org;
  if v_limit is null then return; end if;

  select count(*) into v_count from sales
   where organization_id = p_org and created_at >= date_trunc('month', now());
  if v_count >= v_limit then
    raise exception 'Limite de % vendas/mês do plano Free atingido. Assine um plano em Configurações para vender sem limites.', v_limit;
  end if;
end $$;

-- create_sale ganha a checagem de limite logo no início (corpo idêntico ao 002 + check)
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

  perform check_sale_limit(p_org);

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
