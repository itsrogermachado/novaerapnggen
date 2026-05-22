-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create invite_tokens table
CREATE TABLE IF NOT EXISTS public.invite_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for invite_tokens
ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

-- Policies for invite_tokens
CREATE POLICY "Admins full access on invite_tokens" ON public.invite_tokens
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Populate profiles for existing auth.users
INSERT INTO public.profiles (id, email, is_admin)
SELECT 
  id, 
  email, 
  (email IN ('rogermachado019@gmail.com', 'casadosvloogs@gmail.com')) AS is_admin
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Function and trigger for automatically creating user profiles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, is_admin)
  VALUES (
    new.id, 
    new.email, 
    (new.email IN ('rogermachado019@gmail.com', 'casadosvloogs@gmail.com'))
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      is_admin = EXCLUDED.is_admin;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function and trigger for verifying tokens BEFORE user creation
CREATE OR REPLACE FUNCTION public.validate_signup_invite()
RETURNS TRIGGER AS $$
DECLARE
  token_row RECORD;
BEGIN
  -- If user is one of the designated admins, bypass token check
  IF NEW.email IN ('rogermachado019@gmail.com', 'casadosvloogs@gmail.com') THEN
    RETURN NEW;
  END IF;

  -- Otherwise, a token is mandatory
  IF NEW.raw_user_meta_data IS NULL OR NEW.raw_user_meta_data->>'invite_token' IS NULL THEN
    RAISE EXCEPTION 'Um token de convite válido é obrigatório para cadastrar-se.';
  END IF;

  -- Verify the token
  SELECT * INTO token_row FROM public.invite_tokens
  WHERE token = NEW.raw_user_meta_data->>'invite_token'
    AND is_revoked = false
    AND used_by IS NULL
  FOR UPDATE;

  IF token_row IS NULL THEN
    RAISE EXCEPTION 'Token de convite inválido ou já utilizado.';
  END IF;

  IF token_row.expires_at < now() THEN
    RAISE EXCEPTION 'Este token de convite já expirou.';
  END IF;

  -- Token is valid! Update the token to link to this new user
  UPDATE public.invite_tokens
  SET used_by = NEW.id
  WHERE id = token_row.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '%', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER before_auth_user_created
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.validate_signup_invite();

-- RPC check_invite_token
CREATE OR REPLACE FUNCTION public.check_invite_token(token_val text)
RETURNS TABLE (is_valid boolean, expires_at timestamptz, description text) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS (
      SELECT 1 FROM public.invite_tokens
      WHERE token = token_val
        AND invite_tokens.expires_at > now()
        AND is_revoked = false
        AND used_by IS NULL
    ) AS is_valid,
    invite_tokens.expires_at,
    invite_tokens.description
  FROM public.invite_tokens
  WHERE token = token_val
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC is_user_active
CREATE OR REPLACE FUNCTION public.is_user_active(user_uuid uuid)
RETURNS boolean AS $$
DECLARE
  is_admin_val boolean;
  token_active boolean;
BEGIN
  -- Check if user is admin
  SELECT is_admin INTO is_admin_val FROM public.profiles WHERE id = user_uuid;
  IF is_admin_val = true THEN
    RETURN true;
  END IF;

  -- Check if user has an active (non-expired, non-revoked) token linked
  SELECT EXISTS (
    SELECT 1 FROM public.invite_tokens
    WHERE used_by = user_uuid
      AND expires_at > now()
      AND is_revoked = false
  ) INTO token_active;

  RETURN token_active;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Redefine backgrounds RLS policies with activity checks
DROP POLICY IF EXISTS "own backgrounds select" ON public.backgrounds;
DROP POLICY IF EXISTS "own backgrounds insert" ON public.backgrounds;
DROP POLICY IF EXISTS "own backgrounds update" ON public.backgrounds;
DROP POLICY IF EXISTS "own backgrounds delete" ON public.backgrounds;

CREATE POLICY "own backgrounds select" ON public.backgrounds
  FOR SELECT USING (auth.uid() = user_id AND public.is_user_active(auth.uid()));
CREATE POLICY "own backgrounds insert" ON public.backgrounds
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_user_active(auth.uid()));
CREATE POLICY "own backgrounds update" ON public.backgrounds
  FOR UPDATE USING (auth.uid() = user_id AND public.is_user_active(auth.uid()));
CREATE POLICY "own backgrounds delete" ON public.backgrounds
  FOR DELETE USING (auth.uid() = user_id AND public.is_user_active(auth.uid()));

-- Redefine logos RLS policies with activity checks
DROP POLICY IF EXISTS "own logos select" ON public.logos;
DROP POLICY IF EXISTS "own logos insert" ON public.logos;
DROP POLICY IF EXISTS "own logos update" ON public.logos;
DROP POLICY IF EXISTS "own logos delete" ON public.logos;

CREATE POLICY "own logos select" ON public.logos
  FOR SELECT USING (auth.uid() = user_id AND public.is_user_active(auth.uid()));
CREATE POLICY "own logos insert" ON public.logos
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_user_active(auth.uid()));
CREATE POLICY "own logos update" ON public.logos
  FOR UPDATE USING (auth.uid() = user_id AND public.is_user_active(auth.uid()));
CREATE POLICY "own logos delete" ON public.logos
  FOR DELETE USING (auth.uid() = user_id AND public.is_user_active(auth.uid()));
