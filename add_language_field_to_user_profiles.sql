-- Add language field to user_profiles table
-- This migration is safe and won't break existing functionality

-- Add the language column with default value 'en'
ALTER TABLE user_profiles 
ADD COLUMN language VARCHAR(2) DEFAULT 'en' NOT NULL;

-- Update any existing NULL values to 'en' (safety measure)
UPDATE user_profiles SET language = 'en' WHERE language IS NULL;

-- Add a comment to document the change
COMMENT ON COLUMN user_profiles.language IS 'User language preference: en (English) or es (Spanish)'; 