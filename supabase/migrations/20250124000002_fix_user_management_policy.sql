-- Drop the problematic policy
DROP POLICY IF EXISTS "Admin users can view all profiles" ON public.user_profiles;

-- Create a function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND can_manage_users = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add policy for user management access using the function
CREATE POLICY "Admin users can view all profiles" ON public.user_profiles
  FOR SELECT USING (public.is_admin_user()); 