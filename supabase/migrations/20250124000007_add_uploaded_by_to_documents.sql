-- Add uploaded_by field to documents table
ALTER TABLE public.documents 
ADD COLUMN uploaded_by text;

-- Add stage field to documents table (if not already present)
ALTER TABLE public.documents 
ADD COLUMN stage text;

-- Add url field to documents table (if not already present)
ALTER TABLE public.documents 
ADD COLUMN url text;

-- Update existing documents to have a default uploaded_by value
-- This will set existing documents to show the stage name as uploaded_by
UPDATE public.documents 
SET uploaded_by = 'Unknown User', 
    stage = 'resident' 
WHERE uploaded_by IS NULL; 