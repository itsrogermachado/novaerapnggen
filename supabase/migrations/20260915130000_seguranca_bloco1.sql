-- Segurança, Bloco 1 (auditoria de 15/09/2026).
-- Fecha o acesso aos prints e aos arquivos para quem não tem acesso ativo, limita o
-- que pode ser enviado e trava as funções que rodam com poder de admin.
-- Nenhuma tela muda: muda só quem o banco deixa passar.

-- 1) Funções com poder de admin
-- search_path fixo: ninguém consegue fazer a função usar uma tabela "falsa" com o mesmo nome.
-- Visitante sem login deixa de poder chamá-las (antes descobria se um ID era de admin).
ALTER FUNCTION public.is_user_active(uuid) SET search_path = public;
ALTER FUNCTION public.check_is_admin(uuid) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.is_user_active(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_user_active(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_is_admin(uuid) TO authenticated, service_role;

-- 2) Cadastro: todo usuário novo nasce membro comum e pendente de aprovação.
-- Antes, dois e-mails fixos viravam admin sozinhos no cadastro. Os admins atuais continuam admins.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

-- 3) Tabelas: as regras passam a valer só para contas logadas.
-- Visitante já não via nada; agora a regra nem é avaliada para ele (e não depende
-- mais das funções que ele perdeu permissão de chamar).
-- "(SELECT ...)" faz o banco calcular uma vez por consulta, e não uma vez por linha.

-- 3a) Resultados: só quem tem acesso ativo (admin incluso). Antes era qualquer conta.
DROP POLICY IF EXISTS "sinais visíveis para autenticados" ON public.discord_images;
DROP POLICY IF EXISTS "resultados visíveis para quem tem acesso ativo" ON public.discord_images;
CREATE POLICY "resultados visíveis para quem tem acesso ativo"
  ON public.discord_images FOR SELECT TO authenticated
  USING ((SELECT public.is_user_active(auth.uid())));

-- 3b) Fundos: cada um só os seus, e só com acesso ativo (mesma regra de antes, só para logados).
DROP POLICY IF EXISTS "own backgrounds select" ON public.backgrounds;
DROP POLICY IF EXISTS "own backgrounds insert" ON public.backgrounds;
DROP POLICY IF EXISTS "own backgrounds update" ON public.backgrounds;
DROP POLICY IF EXISTS "own backgrounds delete" ON public.backgrounds;
CREATE POLICY "own backgrounds select" ON public.backgrounds FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id AND (SELECT public.is_user_active(auth.uid())));
CREATE POLICY "own backgrounds insert" ON public.backgrounds FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id AND (SELECT public.is_user_active(auth.uid())));
CREATE POLICY "own backgrounds update" ON public.backgrounds FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id AND (SELECT public.is_user_active(auth.uid())))
  WITH CHECK ((SELECT auth.uid()) = user_id AND (SELECT public.is_user_active(auth.uid())));
CREATE POLICY "own backgrounds delete" ON public.backgrounds FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id AND (SELECT public.is_user_active(auth.uid())));

-- 3c) Logos: igual aos fundos.
DROP POLICY IF EXISTS "own logos select" ON public.logos;
DROP POLICY IF EXISTS "own logos insert" ON public.logos;
DROP POLICY IF EXISTS "own logos update" ON public.logos;
DROP POLICY IF EXISTS "own logos delete" ON public.logos;
CREATE POLICY "own logos select" ON public.logos FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id AND (SELECT public.is_user_active(auth.uid())));
CREATE POLICY "own logos insert" ON public.logos FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id AND (SELECT public.is_user_active(auth.uid())));
CREATE POLICY "own logos update" ON public.logos FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id AND (SELECT public.is_user_active(auth.uid())))
  WITH CHECK ((SELECT auth.uid()) = user_id AND (SELECT public.is_user_active(auth.uid())));
CREATE POLICY "own logos delete" ON public.logos FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id AND (SELECT public.is_user_active(auth.uid())));

-- 3d) Perfis: mesmas regras de antes (cada um vê o seu; admin vê e edita todos), só para logados.
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated
  USING ((SELECT public.check_is_admin(auth.uid())));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT public.check_is_admin(auth.uid())))
  WITH CHECK ((SELECT public.check_is_admin(auth.uid())));

-- 4) Arquivos (storage)
-- Os buckets continuam públicos: a imagem abre pelo link direto, que é o que o site usa.
-- O que fecha é LISTAR os arquivos. Visitante listava tudo; agora só quem tem acesso ativo.
-- A leitura restrita continua existindo porque apagar arquivo exige poder "ver" o arquivo.
DROP POLICY IF EXISTS "backgrounds public read" ON storage.objects;
DROP POLICY IF EXISTS "logos public read" ON storage.objects;
DROP POLICY IF EXISTS "discord images public read" ON storage.objects;

DROP POLICY IF EXISTS "fundos: dono com acesso ativo vê os próprios" ON storage.objects;
CREATE POLICY "fundos: dono com acesso ativo vê os próprios" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'backgrounds' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
         AND (SELECT public.is_user_active(auth.uid())));

DROP POLICY IF EXISTS "logos: dono com acesso ativo vê as próprias" ON storage.objects;
CREATE POLICY "logos: dono com acesso ativo vê as próprias" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
         AND (SELECT public.is_user_active(auth.uid())));

DROP POLICY IF EXISTS "prints: quem tem acesso ativo vê" ON storage.objects;
CREATE POLICY "prints: quem tem acesso ativo vê" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'discord-images' AND (SELECT public.is_user_active(auth.uid())));

-- Enviar, trocar e apagar fundo ou logo: só na própria pasta E com acesso ativo.
DROP POLICY IF EXISTS "backgrounds user upload" ON storage.objects;
DROP POLICY IF EXISTS "backgrounds user update" ON storage.objects;
DROP POLICY IF EXISTS "backgrounds user delete" ON storage.objects;
CREATE POLICY "backgrounds user upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'backgrounds' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
              AND (SELECT public.is_user_active(auth.uid())));
CREATE POLICY "backgrounds user update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'backgrounds' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
         AND (SELECT public.is_user_active(auth.uid())))
  WITH CHECK (bucket_id = 'backgrounds' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
              AND (SELECT public.is_user_active(auth.uid())));
CREATE POLICY "backgrounds user delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'backgrounds' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
         AND (SELECT public.is_user_active(auth.uid())));

DROP POLICY IF EXISTS "logos user upload" ON storage.objects;
DROP POLICY IF EXISTS "logos user update" ON storage.objects;
DROP POLICY IF EXISTS "logos user delete" ON storage.objects;
CREATE POLICY "logos user upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
              AND (SELECT public.is_user_active(auth.uid())));
CREATE POLICY "logos user update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
         AND (SELECT public.is_user_active(auth.uid())))
  WITH CHECK (bucket_id = 'logos' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
              AND (SELECT public.is_user_active(auth.uid())));
CREATE POLICY "logos user delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
         AND (SELECT public.is_user_active(auth.uid())));

-- 5) O que pode ser enviado: só png, jpeg e webp, com tamanho máximo.
-- SVG fica de fora de propósito: um SVG pode carregar código.
-- 10 MB para fundos e prints; 5 MB para logos.
UPDATE storage.buckets
  SET file_size_limit = 10485760, allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
  WHERE id IN ('backgrounds', 'discord-images');
UPDATE storage.buckets
  SET file_size_limit = 5242880, allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
  WHERE id = 'logos';
