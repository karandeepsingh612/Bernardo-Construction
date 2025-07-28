-- Fix created_date to be proper timestamps instead of just dates
-- For now, just set created_date to last_modified to ensure it has proper timestamp format
-- This is a simpler approach that ensures consistency

UPDATE public.requisitions 
SET created_date = last_modified
WHERE created_date::text ~ '^\d{4}-\d{2}-\d{2} 00:00:00'; 