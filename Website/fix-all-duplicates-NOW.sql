-- COMPLETE FIX FOR DUPLICATE IMAGES AND VIDEOS
-- Run this entire script in your Supabase SQL Editor

-- Step 1: Clear ALL image_url fields (data should be in image_urls array only)
UPDATE projects 
SET image_url = NULL 
WHERE image_url IS NOT NULL;

-- Step 2: Clear uploaded video URLs from video_url field (keep external URLs)
-- These should be in video_urls array
UPDATE projects 
SET video_url = NULL 
WHERE video_url IS NOT NULL 
  AND video_url LIKE '%/storage/v1/object/public/%';

-- Step 3: Remove external videos (YouTube, Vimeo) from video_urls array
-- External videos should ONLY be in video_url field, NOT in the array
UPDATE projects
SET video_urls = '{}'::text[]
WHERE video_url IS NOT NULL 
  AND video_url NOT LIKE '%/storage/v1/object/public/%'
  AND video_urls IS NOT NULL
  AND array_length(video_urls, 1) > 0;

-- Step 4: Verify the fix
SELECT 
  id,
  title,
  CASE 
    WHEN image_url IS NOT NULL THEN 'Has old image_url (BAD)'
    ELSE 'OK'
  END as image_status,
  array_length(image_urls, 1) as num_images,
  CASE 
    WHEN video_url IS NOT NULL AND video_url LIKE '%/storage/v1/object/public/%' THEN 'Has uploaded video in video_url (BAD)'
    WHEN video_url IS NOT NULL AND video_url NOT LIKE '%/storage/v1/object/public/%' THEN 'Has external video (OK)'
    ELSE 'No video_url'
  END as video_url_status,
  array_length(video_urls, 1) as num_uploaded_videos,
  video_url
FROM projects
WHERE 
  image_urls IS NOT NULL 
  OR video_urls IS NOT NULL 
  OR video_url IS NOT NULL
ORDER BY id DESC
LIMIT 20;

