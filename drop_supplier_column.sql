-- Script to drop the supplier column from catalog table
-- WARNING: Only run this AFTER confirming the suppliers table migration worked correctly
-- Date: 2024-12-19

-- Step 1: First, verify that all suppliers from catalog are in the suppliers table
-- Run this query to check for any missing suppliers
SELECT DISTINCT supplier 
FROM catalog 
WHERE supplier IS NOT NULL 
    AND supplier != '' 
    AND supplier NOT IN (SELECT name FROM suppliers);

-- If the above query returns any results, those suppliers need to be added to the suppliers table first
-- If it returns no results, you can proceed with dropping the column

-- Step 2: Optional - Create a backup of the catalog table before dropping the column
-- CREATE TABLE catalog_backup AS SELECT * FROM catalog;

-- Step 3: Drop the supplier column from catalog table
-- Only run this if Step 1 returned no results
ALTER TABLE catalog DROP COLUMN IF EXISTS supplier;

-- Step 4: Verify the column was dropped
-- This should show the current structure of the catalog table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'catalog' 
ORDER BY ordinal_position;

-- Step 5: Verify no data was lost
-- This should return the same count as before
SELECT COUNT(*) as total_catalog_items FROM catalog; 