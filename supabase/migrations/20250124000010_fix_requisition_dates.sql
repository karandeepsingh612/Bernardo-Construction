-- Fix requisition dates to match the date in the requisition number
-- This migration extracts the date from the requisition_number and updates created_date to match

UPDATE public.requisitions 
SET created_date = (
  CASE 
    WHEN requisition_number ~ '^REQ-(\d{4})-(\d{2})-(\d{2})-\d{3}$' 
    THEN (
      (regexp_match(requisition_number, '^REQ-(\d{4})-(\d{2})-(\d{2})-\d{3}$'))[1] || '-' ||
      (regexp_match(requisition_number, '^REQ-(\d{4})-(\d{2})-(\d{2})-\d{3}$'))[2] || '-' ||
      (regexp_match(requisition_number, '^REQ-(\d{4})-(\d{2})-(\d{2})-\d{3}$'))[3]
    )::date
    ELSE created_date
  END
)
WHERE requisition_number ~ '^REQ-(\d{4})-(\d{2})-(\d{2})-\d{3}$'; 