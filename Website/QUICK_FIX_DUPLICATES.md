# Quick Fix for Duplicate Videos

## The Problem
You're seeing duplicate videos (like Archimedean Screw showing twice) because external video URLs (YouTube, Vimeo) were copied to both:
1. The `video_urls` array (new)
2. The `video_url` field (old - for embedding)

## The Solution

Run these SQL commands in your **Supabase SQL Editor**:

### Option 1: Simple Fix (Recommended)

Copy and paste this entire SQL command:

```sql
UPDATE projects
SET video_urls = '{}' 
WHERE video_url IS NOT NULL 
  AND video_url NOT LIKE '%/storage/v1/object/public/%';
```

**Important:** Make sure you copy the entire command including the semicolon at the end!

This clears the `video_urls` array for any project that has an external video URL (YouTube, Vimeo, etc.), since those should stay in the `video_url` field for proper embedding.

### Option 2: Full Fix (More Thorough)

Run the complete fix script:
```bash
psql -U your_user -d your_database -f fix-duplicate-images.sql
```

Or copy all the SQL from `fix-duplicate-images.sql` into Supabase SQL Editor.

## After the Fix

- **Uploaded videos**: Will be in `video_urls` array (can have multiple)
- **External videos** (YouTube, Vimeo): Will be in `video_url` field (for embedding)
- **No more duplicates!** ✓

## Verify It Worked

Run this to check:
```sql
SELECT 
  title,
  video_url as external_video,
  array_length(video_urls, 1) as num_uploaded_videos
FROM projects
WHERE video_url IS NOT NULL OR video_urls IS NOT NULL
ORDER BY title;
```

You should see:
- `external_video` has YouTube/Vimeo URLs
- `num_uploaded_videos` is `NULL` or `0` for projects with external videos

