-- Add 'pending-resident' to the requisition_status enum
ALTER TYPE requisition_status ADD VALUE 'pending-resident' BEFORE 'pending-procurement'; 