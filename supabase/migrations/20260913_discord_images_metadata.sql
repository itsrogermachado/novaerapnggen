-- Sinais do Discord: metadados de origem + política de leitura no padrão atual.
--
-- As colunas entram agora, antes de o bot existir, para que o contrato que ele
-- vai preencher já esteja congelado e testado por uso real. Migrar depois, com
-- o bot em produção, custa muito mais caro.

-- 1) Identidade da mensagem de origem.
--    O UNIQUE é o que torna o envio idempotente: se o bot repetir a mesma
--    mensagem (retry, reconexão do gateway, redeploy), o insert falha em vez de
--    duplicar a imagem na aba.
ALTER TABLE public.discord_images
  ADD COLUMN IF NOT EXISTS discord_message_id TEXT,
  ADD COLUMN IF NOT EXISTS channel_id         TEXT,
  ADD COLUMN IF NOT EXISTS author             TEXT,
  ADD COLUMN IF NOT EXISTS caption            TEXT,
  ADD COLUMN IF NOT EXISTS source             TEXT NOT NULL DEFAULT 'discord',
  ADD COLUMN IF NOT EXISTS status             TEXT NOT NULL DEFAULT 'novo';

COMMENT ON COLUMN public.discord_images.discord_message_id IS
  'ID da mensagem no Discord. NULL para envios manuais pelo painel.';
COMMENT ON COLUMN public.discord_images.source IS
  'discord = veio do bot; manual = enviado por um admin pelo painel.';
COMMENT ON COLUMN public.discord_images.status IS
  'novo = ainda não virou arte; usado = já foi levado ao estúdio.';

-- Uma mesma mensagem pode ter vários anexos, então a unicidade é do par
-- (mensagem, arquivo). Índice parcial: envios manuais têm message_id nulo e
-- não competem entre si.
CREATE UNIQUE INDEX IF NOT EXISTS discord_images_message_path_key
  ON public.discord_images (discord_message_id, storage_path)
  WHERE discord_message_id IS NOT NULL;

-- 2) Leitura: `auth.role()` é o padrão antigo do Supabase. A forma atual é
--    restringir a policy ao papel com TO authenticated.
DROP POLICY IF EXISTS "authenticated users can view discord images" ON public.discord_images;

CREATE POLICY "sinais visíveis para autenticados"
  ON public.discord_images
  FOR SELECT
  TO authenticated
  USING (true);

-- 3) Envio manual pelo painel: só admin. É o que permite testar e operar a aba
--    enquanto o bot não existe, e serve de plano B depois, quando ele cair.
CREATE POLICY "admins inserem sinais manualmente"
  ON public.discord_images
  FOR INSERT
  TO authenticated
  WITH CHECK (public.check_is_admin(auth.uid()));

CREATE POLICY "admins removem sinais"
  ON public.discord_images
  FOR DELETE
  TO authenticated
  USING (public.check_is_admin(auth.uid()));

-- check_is_admin é SECURITY DEFINER e teve o EXECUTE revogado de authenticated
-- na migration de maio (20260522151000). Uma policy é avaliada com as
-- permissões de quem consulta, então sem esta concessão as políticas acima
-- falhariam com "permission denied for function check_is_admin".
GRANT EXECUTE ON FUNCTION public.check_is_admin(uuid) TO authenticated;

-- 4) Escrita no bucket pelo painel (o bot usa service role e não passa por RLS).
CREATE POLICY "admins enviam sinais para o bucket"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'discord-images' AND public.check_is_admin(auth.uid()));

CREATE POLICY "admins removem sinais do bucket"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'discord-images' AND public.check_is_admin(auth.uid()));

-- 5) A listagem ordena por uploaded_at e filtra por expires_at; o índice de
--    expiração sozinho não cobre a ordenação.
CREATE INDEX IF NOT EXISTS discord_images_uploaded_at_idx
  ON public.discord_images (uploaded_at DESC);
