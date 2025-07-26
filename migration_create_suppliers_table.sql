-- Migration: Create suppliers table and migrate supplier data from catalog
-- Date: 2024-12-19

-- Step 1: Create the suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    rfc VARCHAR(12) NOT NULL UNIQUE,
    created_by VARCHAR(255) DEFAULT 'system',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Extract unique suppliers from catalog table and insert into suppliers table
-- Note: RFC values are placeholders - you'll need to update them with actual RFC codes
INSERT INTO suppliers (name, rfc, created_by)
SELECT DISTINCT 
    supplier as name,
    -- Generate a placeholder RFC (12 characters) based on supplier name
    -- You should replace these with actual RFC codes
    CASE 
        WHEN supplier IS NOT NULL AND supplier != '' THEN
            UPPER(SUBSTRING(REPLACE(supplier, ' ', ''), 1, 8)) || 
            LPAD(CAST(ABS(HASH(supplier)) % 9999 AS TEXT), 4, '0')
        ELSE 'RFC0000000000'
    END as rfc,
    'system' as created_by
FROM catalog 
WHERE supplier IS NOT NULL 
    AND supplier != ''
    AND supplier NOT IN (SELECT name FROM suppliers)
ON CONFLICT (name) DO NOTHING;

-- Step 3: Add supplier_id column to catalog table (optional - for foreign key relationship)
-- Uncomment the following lines if you want to establish a foreign key relationship
/*
ALTER TABLE catalog ADD COLUMN IF NOT EXISTS supplier_id UUID;
ALTER TABLE catalog ADD CONSTRAINT fk_catalog_supplier 
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id);

-- Update catalog table to reference supplier_id instead of supplier name
UPDATE catalog 
SET supplier_id = s.id 
FROM suppliers s 
WHERE catalog.supplier = s.name;

-- After confirming the data is correct, you can remove the supplier column
-- ALTER TABLE catalog DROP COLUMN supplier;
*/

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_rfc ON suppliers(rfc);
CREATE INDEX IF NOT EXISTS idx_suppliers_created_by ON suppliers(created_by);

-- Step 5: Add a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_suppliers_updated_at 
    BEFORE UPDATE ON suppliers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Verification queries (run these to check the migration)
-- SELECT COUNT(*) as total_suppliers FROM suppliers;
-- SELECT name, rfc, created_by FROM suppliers ORDER BY name;
-- SELECT DISTINCT supplier FROM catalog WHERE supplier NOT IN (SELECT name FROM suppliers); 