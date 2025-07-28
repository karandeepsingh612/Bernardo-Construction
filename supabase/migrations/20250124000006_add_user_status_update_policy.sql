-- Add policy for admin users to update user status (is_active field)
CREATE POLICY "Admin users can update user status" ON public.user_profiles
  FOR UPDATE USING (public.is_admin_user()); 