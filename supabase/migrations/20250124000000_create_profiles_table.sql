-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role public.user_role;
    can_manage boolean;
BEGIN
    -- Set role and permissions based on user metadata or default
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'resident')::public.user_role;
    
    -- Set can_manage_users based on role
    can_manage := CASE 
        WHEN user_role IN ('procurement', 'treasury', 'ceo') THEN true
        ELSE false
    END;
    
    INSERT INTO public.user_profiles (id, email, full_name, role, can_manage_users, is_active)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        user_role,
        can_manage,
        true
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 