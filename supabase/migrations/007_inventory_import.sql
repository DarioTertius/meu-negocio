-- ============================================================================
-- MEU NEGÓCIO — 007: conferência de estoque + importação de produtos em lote
-- ============================================================================

-- Conferência: aplica a contagem física e registra os ajustes
-- p_items: [{"product_id": uuid, "counted": n}]
create or replace function public.apply_stock_count(p_org uuid, p_items jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  item record; v_stock numeric; v_diff numeric;
  v_adjusted int := 0; v_unchanged int := 0;
begin
  if p_org not in (select user_org_ids()) then raise exception 'acesso negado'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'nenhum item na conferência';
  end if;
  if jsonb_array_length(p_items) > 1000 then
    raise exception 'máximo de 1000 itens por conferência';
  end if;

  for item in
    select (e->>'product_id')::uuid as product_id,
           (e->>'counted')::numeric as counted
    from jsonb_array_elements(p_items) e
  loop
    if item.counted is null or item.counted < 0 then
      raise exception 'quantidade contada inválida';
    end if;

    select stock into v_stock from products
     where id = item.product_id and organization_id = p_org for update;
    if not found then raise exception 'produto não encontrado'; end if;

    v_diff := item.counted - v_stock;
    if v_diff = 0 then
      v_unchanged := v_unchanged + 1;
      continue;
    end if;

    update products set stock = item.counted, updated_at = now()
     where id = item.product_id;

    insert into stock_movements (organization_id, product_id, user_id, kind, reason, quantity, note)
    values (p_org, item.product_id, auth.uid(),
            case when v_diff > 0 then 'entrada'::movement_kind else 'saida'::movement_kind end,
            'ajuste', abs(v_diff), 'Conferência de estoque');

    v_adjusted := v_adjusted + 1;
  end loop;

  insert into audit_logs (organization_id, user_id, action, entity, detail)
  values (p_org, auth.uid(), 'stock_count', 'inventory',
          jsonb_build_object('adjusted', v_adjusted, 'unchanged', v_unchanged));

  return jsonb_build_object('adjusted', v_adjusted, 'unchanged', v_unchanged);
end $$;

-- Importação em lote de produtos
-- p_items: [{"name","sku","barcode","unit","cost","price","stock","min_stock"}]
create or replace function public.import_products(p_org uuid, p_items jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  item record; v_id uuid;
  v_inserted int := 0; v_skipped int := 0;
begin
  if p_org not in (select user_org_ids()) then raise exception 'acesso negado'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'planilha vazia';
  end if;
  if jsonb_array_length(p_items) > 500 then
    raise exception 'máximo de 500 produtos por importação';
  end if;

  for item in
    select trim(e->>'name') as name,
           nullif(trim(e->>'sku'), '') as sku,
           nullif(trim(e->>'barcode'), '') as barcode,
           coalesce(nullif(trim(e->>'unit'), ''), 'un') as unit,
           coalesce((e->>'cost')::numeric, 0) as cost,
           coalesce((e->>'price')::numeric, 0) as price,
           coalesce((e->>'stock')::numeric, 0) as stock,
           coalesce((e->>'min_stock')::numeric, 0) as min_stock
    from jsonb_array_elements(p_items) e
  loop
    if coalesce(item.name, '') = '' then
      v_skipped := v_skipped + 1;
      continue;
    end if;
    if item.cost < 0 or item.price < 0 or item.stock < 0 or item.min_stock < 0 then
      v_skipped := v_skipped + 1;
      continue;
    end if;
    -- SKU já existente na empresa → pula (não sobrescreve nada)
    if item.sku is not null and exists (
      select 1 from products where organization_id = p_org and sku = item.sku
    ) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    insert into products (organization_id, name, sku, barcode, unit, cost, price, stock, min_stock)
    values (p_org, item.name, item.sku, item.barcode, item.unit,
            item.cost, item.price, item.stock, item.min_stock)
    returning id into v_id;

    if item.stock > 0 then
      insert into stock_movements (organization_id, product_id, user_id, kind, reason, quantity, note)
      values (p_org, v_id, auth.uid(), 'entrada', 'ajuste', item.stock, 'Importação de planilha');
    end if;

    v_inserted := v_inserted + 1;
  end loop;

  insert into audit_logs (organization_id, user_id, action, entity, detail)
  values (p_org, auth.uid(), 'import', 'products',
          jsonb_build_object('inserted', v_inserted, 'skipped', v_skipped));

  return jsonb_build_object('inserted', v_inserted, 'skipped', v_skipped);
end $$;
