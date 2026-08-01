-- ============================================================================
-- MEU NEGÓCIO — 006: identidade visual por empresa (cor da marca + logo)
-- ============================================================================

alter table organizations add column if not exists brand_color text;
alter table organizations add column if not exists logo_url text;

-- Bucket público para logos (leitura aberta; escrita só por membros da empresa,
-- e apenas dentro da pasta com o id da própria organização)
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "logos: leitura pública"
  on storage.objects for select
  using (bucket_id = 'logos');

create policy "logos: upload por membros"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'logos'
    and ((storage.foldername(name))[1])::uuid in (select user_org_ids())
  );

create policy "logos: atualização por membros"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'logos'
    and ((storage.foldername(name))[1])::uuid in (select user_org_ids())
  );

create policy "logos: remoção por membros"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'logos'
    and ((storage.foldername(name))[1])::uuid in (select user_org_ids())
  );
