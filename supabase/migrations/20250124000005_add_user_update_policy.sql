-- Add policy for admin users to update user profiles
CREATE POLICY "Admin users can update user profiles" ON public.user_profiles
  FOR UPDATE USING (public.is_admin_user()); 