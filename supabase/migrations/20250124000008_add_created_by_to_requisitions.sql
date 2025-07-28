-- Add created_by field to requisitions table
ALTER TABLE public.requisitions 
ADD COLUMN created_by text;

-- Add created_by field to requisition_items table
ALTER TABLE public.requisition_items 
ADD COLUMN created_by text;

-- Update existing requisitions to have a default created_by value
UPDATE public.requisitions 
SET created_by = 'Unknown User' 
WHERE created_by IS NULL;

-- Update existing requisition_items to have a default created_by value
UPDATE public.requisition_items 
SET created_by = 'Unknown User' 
WHERE created_by IS NULL; 