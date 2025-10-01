-- Fix duplicate images and videos issue
-- Run this if you're seeing duplicates after migration

-- 1. Clear old image_url field (data is now in image_urls array)
UPDATE projects 
SET image_url = NULL 
WHERE image_url IS NOT NULL;

-- 2. Clear old video_url field for uploaded videos (keep external URLs like YouTube)
-- External video URLs don't start with /storage/v1/object/public/
UPDATE projects 
SET video_url = NULL 
WHERE video_url IS NOT NULL 
  AND video_url LIKE '%/storage/v1/object/public/%';

-- 3. Remove external videos from video_urls array (they should only be in video_url field)
-- This fixes the issue where YouTube/Vimeo videos appear twice
UPDATE projects
SET video_urls = ARRAY(
  SELECT unnest(video_urls) 
  WHERE unnest(video_urls) LIKE '%/storage/v1/object/public/%'
)
WHERE video_urls IS NOT NULL 
  AND array_length(video_urls, 1) > 0
  AND EXISTS (
    SELECT 1 FROM unnest(video_urls) AS url 
    WHERE url NOT LIKE '%/storage/v1/object/public/%'
  );

-- 4. Verify the changes
SELECT 
  id, 
  title, 
  image_url,
  array_length(image_urls, 1) as num_images,
  video_url,
  array_length(video_urls, 1) as num_videos,
  video_url as external_video
FROM projects
WHERE image_urls IS NOT NULL 
   OR video_urls IS NOT NULL 
   OR video_url IS NOT NULL
ORDER BY id DESC
LIMIT 10;

