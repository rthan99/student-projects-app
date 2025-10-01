-- SIMPLE ONE-COMMAND FIX FOR DUPLICATE VIDEOS
-- Copy this ENTIRE command and run it in Supabase SQL Editor:

UPDATE projects
SET video_urls = '{}'
WHERE video_url IS NOT NULL 
  AND video_url NOT LIKE '%/storage/v1/object/public/%';

