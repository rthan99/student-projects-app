-- Migration script to convert image_url and video_url to arrays
-- This allows projects to have multiple images and videos

-- Step 1: Add new array columns
ALTER TABLE projects ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS video_urls TEXT[] DEFAULT '{}';

-- Step 2: Migrate existing data from single URL fields to arrays
-- Only migrate uploaded files (storage URLs), not external URLs
UPDATE projects 
SET image_urls = ARRAY[image_url]::TEXT[]
WHERE image_url IS NOT NULL 
  AND image_url != '' 
  AND (image_urls IS NULL OR array_length(image_urls, 1) IS NULL);

-- Only migrate uploaded videos (from storage), NOT external videos (YouTube, Vimeo, etc.)
UPDATE projects 
SET video_urls = ARRAY[video_url]::TEXT[]
WHERE video_url IS NOT NULL 
  AND video_url != '' 
  AND video_url LIKE '%/storage/v1/object/public/%'
  AND (video_urls IS NULL OR array_length(video_urls, 1) IS NULL);

-- Step 3: Clear the old single URL fields to prevent duplicates
-- Clear all image_url fields (they're now in the array)
UPDATE projects SET image_url = NULL WHERE image_url IS NOT NULL;

-- Only clear uploaded video URLs (storage), keep external URLs (YouTube, Vimeo)
UPDATE projects SET video_url = NULL 
WHERE video_url IS NOT NULL 
  AND video_url LIKE '%/storage/v1/object/public/%';

-- Step 4: Optional - Drop the old columns after verifying the migration
-- Uncomment these lines once you've verified everything works:
-- ALTER TABLE projects DROP COLUMN IF EXISTS image_url;
-- ALTER TABLE projects DROP COLUMN IF EXISTS video_url;

-- Note: The old columns are kept but cleared to avoid duplicates
-- External video URLs (YouTube, Vimeo) are still supported via video_url for embeds

