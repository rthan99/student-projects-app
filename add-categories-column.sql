-- Add categories column to projects table
-- This column will store multiple categories as a text array

-- Add the categories column
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS categories text[] DEFAULT '{}';

-- Add a comment to describe the column
COMMENT ON COLUMN projects.categories IS 'Array of category tags for the project (e.g., Physics, Chemistry, Biology, etc.)';

-- Optional: Create an index on categories for faster filtering
CREATE INDEX IF NOT EXISTS idx_projects_categories ON projects USING GIN (categories);

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'projects' AND column_name = 'categories';

