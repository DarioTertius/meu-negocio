-- ============================================================================
-- MEU NEGÓCIO — 004: funções transacionais de compras e caixa
-- ============================================================================

-- ---------- Compra: itens + entrada de estoque + custo + conta a pagar ------
-- p_items: [{"product_id": uuid, "quantity": n, "unit_cost": n}]
create or replace function public.create_purchase(
  p_org uuid, p_supplier uuid, p_payment_method payment_method,
  p_discount numeric, p_freight numeric, p_items jsonb,
  p_generate_payable boolean, p_due_date date
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_purchase uuid; v_subtotal numeric := 0; v_total numeric;
  item record; v_name text; v_supplier_name text;
begin
  if p_org not in (select user_org_ids()) then raise exception 'acesso negado'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'compra precisa de pelo menos um item';
  end if;

  for item in
    select (e->>'product_id')::uuid as product_id,
           (e->>'quantity')::numeric as quantity,
           (e->>'unit_cost')::numeric as unit_cost
    from jsonb_array_elements(p_items) e
  loop
    if item.quantity is null or item.quantity <= 0 then raise exception 'quantidade inválida'; end if;
    if item.unit_cost is null or item.unit_cost < 0 then raise exception 'custo inválido'; end if;
    v_subtotal := v_subtotal + round(item.quantity * item.unit_cost, 2);
  end loop;

  v_total := greatest(v_subtotal - coalesce(p_discount,0) + coalesce(p_freight,0), 0);

  insert into purchases (organization_id, supplier_id, user_id, subtotal, discount, freight, total, payment_method)
  values (p_org, p_supplier, auth.uid(), v_subtotal, coalesce(p_discount,0), coalesce(p_freight,0), v_total, p_payment_method)
  returning id into v_purchase;

  for item in
    select (e->>'product_id')::uuid as product_id,
           (e->>'quantity')::numeric as quantity,
           (e->>'unit_cost')::numeric as unit_cost
    from jsonb_array_elements(p_items) e
  loop
    select name into v_name from products
     where id = item.product_id and organization_id = p_org for update;
    if not found then raise exception 'produto não encontrado'; end if;

    insert into purchase_items (organization_id, purchase_id, product_id, quantity, unit_cost, total)
    values (p_org, v_purchase, item.product_id, item.quantity, item.unit_cost,
            round(item.quantity * item.unit_cost, 2));

    update products
       set stock = stock + item.quantity,
           cost = item.unit_cost,
           updated_at = now()
     where id = item.product_id;

    insert into stock_movements (organization_id, product_id, user_id, kind, reason, quantity, note)
    values (p_org, item.product_id, auth.uid(), 'entrada', 'compra', item.quantity, 'Compra');
  end loop;

  if p_generate_payable then
    select name into v_supplier_name from suppliers where id = p_supplier;
    insert into accounts_payable (organization_id, supplier_id, description, category, amount, due_date)
    values (p_org, p_supplier,
            'Compra de mercadorias' || coalesce(' — ' || v_supplier_name, ''),
            'fornecedores', v_total, coalesce(p_due_date, current_date + 30));
  end if;

  insert into audit_logs (organization_id, user_id, action, entity, entity_id, detail)
  values (p_org, auth.uid(), 'create', 'purchase', v_purchase, jsonb_build_object('total', v_total));

  return v_purchase;
end $$;

-- ---------- Caixa ------------------------------------------------------------
create or replace function public.open_cash_register(p_org uuid, p_opening numeric)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_org not in (select user_org_ids()) then raise exception 'acesso negado'; end if;
  if p_opening is null or p_opening < 0 then raise exception 'valor de abertura inválido'; end if;
  if exists (select 1 from cash_registers where organization_id = p_org and closed_at is null) then
    raise exception 'já existe um caixa aberto';
  end if;

  insert into cash_registers (organization_id, opened_by, opening_amount)
  values (p_org, auth.uid(), p_opening)
  returning id into v_id;

  insert into audit_logs (organization_id, user_id, action, entity, entity_id)
  values (p_org, auth.uid(), 'open', 'cash_register', v_id);
  return v_id;
end $$;

create or replace function public.register_cash_movement(
  p_org uuid, p_kind movement_kind, p_reason text, p_amount numeric
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_register uuid; v_id uuid;
begin
  if p_org not in (select user_org_ids()) then raise exception 'acesso negado'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'valor deve ser maior que zero'; end if;

  select id into v_register from cash_registers
   where organization_id = p_org and closed_at is null for update;
  if not found then raise exception 'nenhum caixa aberto'; end if;

  insert into cash_movements (organization_id, cash_register_id, user_id, kind, reason, amount)
  values (p_org, v_register, auth.uid(), p_kind, p_reason, p_amount)
  returning id into v_id;
  return v_id;
end $$;

-- Valor esperado em dinheiro no caixa aberto
create or replace function public.cash_expected(p_org uuid)
returns numeric
language plpgsql security definer set search_path = public as $$
declare v_open record; v_sales numeric; v_in numeric; v_out numeric;
begin
  if p_org not in (select user_org_ids()) then raise exception 'acesso negado'; end if;

  select id, opening_amount, opened_at into v_open
    from cash_registers where organization_id = p_org and closed_at is null;
  if not found then return null; end if;

  select coalesce(sum(amount),0) into v_sales
    from payments
   where organization_id = p_org and method = 'dinheiro' and created_at >= v_open.opened_at;

  select coalesce(sum(amount) filter (where kind = 'entrada'),0),
         coalesce(sum(amount) filter (where kind = 'saida'),0)
    into v_in, v_out
    from cash_movements where cash_register_id = v_open.id;

  return v_open.opening_amount + v_sales + v_in - v_out;
end $$;

create or replace function public.close_cash_register(p_org uuid, p_informed numeric)
returns void
language plpgsql security definer set search_path = public as $$
declare v_register uuid; v_expected numeric;
begin
  if p_org not in (select user_org_ids()) then raise exception 'acesso negado'; end if;
  if p_informed is null or p_informed < 0 then raise exception 'valor informado inválido'; end if;

  select id into v_register from cash_registers
   where organization_id = p_org and closed_at is null for update;
  if not found then raise exception 'nenhum caixa aberto'; end if;

  v_expected := cash_expected(p_org);

  update cash_registers
     set closed_at = now(), closed_by = auth.uid(),
         expected_amount = v_expected, informed_amount = p_informed
   where id = v_register;

  insert into audit_logs (organization_id, user_id, action, entity, entity_id, detail)
  values (p_org, auth.uid(), 'close', 'cash_register', v_register,
          jsonb_build_object('expected', v_expected, 'informed', p_informed,
                             'difference', p_informed - v_expected));
end $$;
