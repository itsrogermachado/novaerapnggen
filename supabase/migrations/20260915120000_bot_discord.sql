-- Bot do Discord → aba Resultados.
-- Cria o estado do bot (qual canal ele lê e até qual mensagem já leu), a senha que
-- só o agendador conhece, e o agendamento que chama a rota do site a cada minuto.

-- 1) Estado do bot: uma linha só (id sempre 1).
CREATE TABLE IF NOT EXISTS public.discord_bot (
  id            SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  -- Senha gerada aqui dentro do banco: nunca aparece no código, no git ou no chat.
  cron_secret   TEXT NOT NULL DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  channel_id    TEXT,
  ultimo_id     TEXT,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.discord_bot IS
  'Estado do bot do Discord: canal lido, última mensagem lida e a senha do agendador. Uma linha só.';

-- RLS ligada e nenhuma policy: ninguém do site lê nem escreve.
-- Só o servidor do site (service role) e o agendador do banco acessam.
ALTER TABLE public.discord_bot ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.discord_bot FROM anon, authenticated;

INSERT INTO public.discord_bot (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 2) Extensões do agendador (pg_cron) e de chamadas HTTP de dentro do banco (pg_net).
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 3) A cada minuto, chama a rota do site mandando a senha no header.
-- Com o mesmo nome, cron.schedule atualiza o agendamento em vez de duplicar.
SELECT cron.schedule(
  'discord-sincronizar-resultados',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://novaeragen.lovable.app/api/discord/sincronizar',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT cron_secret FROM public.discord_bot WHERE id = 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);
