-- 1. Modificar a tabela profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 2. Migrar os acessos existentes da tabela invite_tokens para a profiles
UPDATE public.profiles p
SET 
  status = 'approved',
  expires_at = t.expires_at
FROM public.invite_tokens t
WHERE t.used_by = p.id AND t.is_revoked = false AND t.expires_at > now();

-- Os administradores têm status 'approved' permanente
UPDATE public.profiles
SET status = 'approved'
WHERE is_admin = true;

-- 3. Remover a obrigatoriedade de Token no Cadastro
DROP TRIGGER IF EXISTS before_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.validate_signup_invite();

-- 4. Atualizar a função de verificação de atividade do usuário
CREATE OR REPLACE FUNCTION public.is_user_active(user_uuid uuid)
RETURNS boolean AS $$
DECLARE
  profile_rec RECORD;
BEGIN
  -- Buscar status atual e isAdmin
  SELECT is_admin, status, expires_at INTO profile_rec FROM public.profiles WHERE id = user_uuid;
  
  -- Se for admin, sempre libera
  IF profile_rec.is_admin = true THEN
    RETURN true;
  END IF;

  -- Se for aprovado e estiver dentro da validade (se expires_at for null não bloqueia por data, embora no nosso sistema sempre terá validade)
  IF profile_rec.status = 'approved' AND (profile_rec.expires_at IS NULL OR profile_rec.expires_at > now()) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Limpeza: Remover a tabela de tokens antiga e sua função auxiliar
DROP FUNCTION IF EXISTS public.check_invite_token(text);
DROP TABLE IF EXISTS public.invite_tokens CASCADE;
