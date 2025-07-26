-- Script to update RFC codes with actual values
-- Run this after the initial migration to replace placeholder RFC codes

-- First, let's see what suppliers we have
SELECT id, name, rfc FROM suppliers ORDER BY name;

-- Example updates (replace with actual RFC codes)
-- Update these with the real RFC codes for each supplier

-- Example format:
-- UPDATE suppliers SET rfc = 'ACTUALRFC123' WHERE name = 'Supplier Name';

-- For example:
-- UPDATE suppliers SET rfc = 'CEMX010101ABC' WHERE name = 'Cemex';
-- UPDATE suppliers SET rfc = 'HOMD020202DEF' WHERE name = 'Home Depot';
-- UPDATE suppliers SET rfc = 'ELAR030303GHI' WHERE name = 'EL ARBOL STEEL SA DE CV';

-- After updating all RFC codes, verify the data:
-- SELECT name, rfc FROM suppliers ORDER BY name;

-- Check for any remaining placeholder RFC codes:
-- SELECT name, rfc FROM suppliers WHERE rfc LIKE 'RFC%' OR rfc LIKE '%0000'; 