-- Update existing user permissions to match role requirements
-- Set can_manage_users = true for procurement, treasury, and ceo roles
UPDATE public.user_profiles 
SET can_manage_users = true 
WHERE role IN ('procurement', 'treasury', 'ceo') 
AND can_manage_users = false;

-- Set can_manage_users = false for resident and storekeeper roles
UPDATE public.user_profiles 
SET can_manage_users = false 
WHERE role IN ('resident', 'storekeeper') 
AND can_manage_users = true; 