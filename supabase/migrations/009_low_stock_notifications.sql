-- ============================================================================
-- MEU NEGÓCIO — 009: notificações automáticas de estoque baixo
-- Dispara quando o estoque CRUZA o mínimo (não repete a cada venda —
-- só notifica de novo se repor acima do mínimo e cair outra vez).
-- ============================================================================

create or replace function public.notify_low_stock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- cruzou para zero/negativo
  if new.stock <= 0 and old.stock > 0 then
    insert into notifications (organization_id, title, body)
    values (new.organization_id,
            'Produto sem estoque: ' || new.name,
            'O estoque zerou. Reponha para voltar a vender.');
  -- cruzou o mínimo (e não zerou — para não duplicar)
  elsif new.min_stock > 0 and new.stock > 0
        and new.stock <= new.min_stock and old.stock > old.min_stock then
    insert into notifications (organization_id, title, body)
    values (new.organization_id,
            'Estoque baixo: ' || new.name,
            'Restam ' || trim(to_char(new.stock, 'FM999999990.###')) ||
            ' (mínimo: ' || trim(to_char(new.min_stock, 'FM999999990.###')) || ').');
  end if;
  return new;
end $$;

create trigger trg_notify_low_stock
  after update of stock on products
  for each row
  when (old.stock is distinct from new.stock)
  execute function public.notify_low_stock();
