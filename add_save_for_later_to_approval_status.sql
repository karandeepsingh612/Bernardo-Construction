-- Step 1: Create a new enum type with the correct values
CREATE TYPE approval_status_new AS ENUM ('pending', 'approved', 'rejected', 'partial', 'Save for Later');

-- Step 2: Remove the default constraint from the column
ALTER TABLE requisition_items 
  ALTER COLUMN approval_status DROP DEFAULT;

-- Step 3: Update the column to use the new type
ALTER TABLE requisition_items 
  ALTER COLUMN approval_status TYPE approval_status_new 
  USING (
    CASE 
      WHEN approval_status::text = 'save_for_later' THEN 'Save for Later'
      ELSE approval_status::text
    END::approval_status_new
  );

-- Step 4: Add back the default value with the new type
ALTER TABLE requisition_items
  ALTER COLUMN approval_status SET DEFAULT 'pending';

-- Step 5: Drop the old type
DROP TYPE approval_status;

-- Step 6: Rename the new type to the original name
ALTER TYPE approval_status_new RENAME TO approval_status; 