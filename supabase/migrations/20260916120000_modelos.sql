-- Modelos do Estúdio: layouts salvos na conta (formato, fundo, logo e os lugares
-- dos destaques), para reabrir em qualquer aparelho e só colocar os prints do dia.
--
-- Segurança no mesmo padrão do plano de 15/09:
-- - cada pessoa só lê, cria, altera e apaga os PRÓPRIOS modelos;
-- - e só enquanto tem acesso ativo (is_user_active);
-- - visitante sem login não tem acesso nenhum.
-- Os limites de nome e de tamanho ficam no banco, e não só na tela, para ninguém
-- burlar pelo navegador.

create table if not exists public.modelos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 1 and 60),
  dados jsonb not null check (jsonb_typeof(dados) = 'object' and pg_column_size(dados) <= 16384),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Nome repetido na mesma conta não pode (sem diferença de maiúscula e espaço nas pontas).
create unique index if not exists modelos_nome_por_usuario
  on public.modelos (user_id, lower(btrim(nome)));

alter table public.modelos enable row level security;
revoke all on public.modelos from anon;
grant select, insert, update, delete on public.modelos to authenticated;

drop policy if exists "modelos: dono com acesso ativo lê" on public.modelos;
create policy "modelos: dono com acesso ativo lê" on public.modelos
  for select to authenticated
  using ((select auth.uid()) = user_id and (select public.is_user_active(auth.uid())));

drop policy if exists "modelos: dono com acesso ativo cria" on public.modelos;
create policy "modelos: dono com acesso ativo cria" on public.modelos
  for insert to authenticated
  with check ((select auth.uid()) = user_id and (select public.is_user_active(auth.uid())));

drop policy if exists "modelos: dono com acesso ativo altera" on public.modelos;
create policy "modelos: dono com acesso ativo altera" on public.modelos
  for update to authenticated
  using ((select auth.uid()) = user_id and (select public.is_user_active(auth.uid())))
  with check ((select auth.uid()) = user_id and (select public.is_user_active(auth.uid())));

drop policy if exists "modelos: dono com acesso ativo apaga" on public.modelos;
create policy "modelos: dono com acesso ativo apaga" on public.modelos
  for delete to authenticated
  using ((select auth.uid()) = user_id and (select public.is_user_active(auth.uid())));
