-- Drop the problematic policy first
DROP POLICY IF EXISTS "Admin users can view all profiles" ON public.user_profiles;

-- Add a simpler policy for user management access
-- Users with can_manage_users=true can view all profiles
CREATE POLICY "Admin users can view all profiles" ON public.user_profiles
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM public.user_profiles WHERE can_manage_users = true
    )
  ); 