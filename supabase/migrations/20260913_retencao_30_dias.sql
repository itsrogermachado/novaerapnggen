-- Retenção dos resultados: 24 horas -> 30 dias.
--
-- A janela de 24h vinha de quando a aba era só uma vitrine do que acabou de
-- sair. Com filtro de data, a aba vira histórico: "7 dias" e "30 dias" só fazem
-- sentido se o dado ainda existir nesse intervalo.
--
-- A função de limpeza (cleanup-discord-images) não precisa mudar: ela apaga o
-- que já passou de expires_at, então passa a respeitar 30 dias sozinha.

ALTER TABLE public.discord_images
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '30 days');

COMMENT ON COLUMN public.discord_images.expires_at IS
  'Quando o resultado sai do ar e é apagado do banco e do bucket. Padrão: 30 dias.';

-- Estende o que ainda está vivo, para a mudança valer também para o que já foi
-- publicado — sem ressuscitar o que já venceu.
UPDATE public.discord_images
SET expires_at = uploaded_at + interval '30 days'
WHERE expires_at > now()
  AND expires_at < uploaded_at + interval '30 days';

-- A listagem pagina por (uploaded_at DESC, id DESC); o id desempata resultados
-- publicados no mesmo instante, que é comum quando o bot manda um lote de
-- prints de uma vez só.
CREATE INDEX IF NOT EXISTS discord_images_paginacao_idx
  ON public.discord_images (uploaded_at DESC, id DESC);
