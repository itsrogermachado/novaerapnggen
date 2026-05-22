-- Create is_admin helper function to break policy recursion
CREATE OR REPLACE FUNCTION public.check_is_admin(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_uuid AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop recursive policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins full access on invite_tokens" ON public.invite_tokens;

-- Recreate policies using the helper function
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.check_is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.check_is_admin(auth.uid()));

CREATE POLICY "Admins full access on invite_tokens" ON public.invite_tokens
  USING (public.check_is_admin(auth.uid()));
