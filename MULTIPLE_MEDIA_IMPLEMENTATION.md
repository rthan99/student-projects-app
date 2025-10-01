# Multiple Media Implementation

## Overview
The project has been updated to support **multiple images and videos** per project instead of a single `image_url`. Projects can now store arrays of media URLs.

## Database Changes

### New Columns
- `image_urls` - TEXT[] array to store multiple image URLs
- `video_urls` - TEXT[] array to store multiple video URLs

### Migration
Run the SQL migration script to update your database:
```bash
psql -U your_user -d your_database -f migrate-to-media-arrays.sql
```

Or execute directly in Supabase SQL editor:
```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS video_urls TEXT[] DEFAULT '{}';

-- Migrate existing data
UPDATE projects 
SET image_urls = ARRAY[image_url]::TEXT[]
WHERE image_url IS NOT NULL AND image_url != '';

UPDATE projects 
SET video_urls = ARRAY[video_url]::TEXT[]
WHERE video_url IS NOT NULL AND video_url != '';
```

## Code Changes

### 1. supabase-client.js
**New Functions:**
- `addImageToProject(projectId, imageUrl)` - Add an image URL to the array
- `removeImageFromProject(projectId, imageUrl)` - Remove an image URL from the array
- `addVideoToProject(projectId, videoUrl)` - Add a video URL to the array
- `removeVideoFromProject(projectId, videoUrl)` - Remove a video URL from the array
- `uploadAndAddImage(file, projectId)` - Upload a file and add to array in one step
- `uploadAndAddVideo(file, projectId)` - Upload a file and add to array in one step

**Updated Functions:**
- `fetchProjects()` - Now returns `image_count` and `video_count` based on array lengths
- `createProject()` - Initializes empty `image_urls` and `video_urls` arrays

### 2. main.js
**Updated Sections:**
- **Project Display Modal** - Shows all images and videos from the arrays
- **Edit Modal** - Displays current media with delete buttons for each item
- **Upload Handlers** - Now adds media to arrays instead of replacing single URLs
- **Delete Handlers** - Removes individual items from arrays

**Key Changes:**
```javascript
// Display all images
if (project.image_urls && project.image_urls.length > 0) {
  project.image_urls.forEach(imageUrl => {
    // Display each image
  });
}

// Display all videos
if (project.video_urls && project.video_urls.length > 0) {
  project.video_urls.forEach(videoUrl => {
    // Display each video
  });
}
```

### 3. main-standalone.js
**Updated Sections:**
- **Card Display** - Shows first image/video from arrays as thumbnail
- **Filter Functions** - Updated to check array lengths
- **Project Modal** - Displays all media from arrays
- **Upload Functions** - Adds to arrays instead of replacing

**Media Filters:**
```javascript
// Has media filter now checks arrays
filtered = filtered.filter(project => 
  (project.image_urls && project.image_urls.length > 0) || 
  (project.video_urls && project.video_urls.length > 0) ||
  project.video_url
);
```

## Usage

### Adding Images/Videos to a Project
When uploading media through the UI:
1. Select one or more files
2. Each upload **adds** to the existing media (doesn't replace)
3. All media is stored in the `image_urls` or `video_urls` array

### Removing Images/Videos
Each media item in the edit modal has a delete button:
1. Click the × button on any media item
2. Confirm deletion
3. The specific URL is removed from the array
4. The file is deleted from Supabase storage

### Displaying Media
- **Grid View**: Shows the first image or video as a thumbnail
- **Project Modal**: Displays all images and videos in a gallery layout
- **Edit Mode**: Shows all current media with individual delete buttons

## Backward Compatibility

The old `image_url` and `video_url` columns are **kept for now** to ensure backward compatibility:
- External video URLs (YouTube, Vimeo) still use `video_url`
- Old projects will have their single URL migrated to the array
- You can drop the old columns once migration is complete

## Benefits

1. **Multiple Media Support** - Projects can showcase multiple angles, stages, or aspects
2. **Flexible Management** - Add or remove individual media items without affecting others
3. **Better Organization** - Separate arrays for images and videos
4. **Scalable** - Arrays can grow as needed without schema changes

## Testing

After migration, verify:
1. ✅ Existing projects display their media correctly
2. ✅ New projects can accept multiple images/videos
3. ✅ Deleting individual media items works
4. ✅ Uploading new media adds to arrays
5. ✅ Filters work correctly (has media, no media, etc.)

## Troubleshooting

### Seeing Duplicate Images or Videos?

If you see duplicate media in the modal after migration, it's because both old and new fields contain the same data.

**For Images:** Both `image_url` field and `image_urls` array contain the same image.

**For Videos:** External videos (YouTube, Vimeo) were copied to `video_urls` array but should stay in `video_url` field for embedding.

**Quick Fix:** Run this SQL script to fix duplicates:
```bash
psql -U your_user -d your_database -f fix-duplicate-images.sql
```

Or in Supabase SQL editor:
```sql
-- 1. Clear old image_url field
UPDATE projects SET image_url = NULL WHERE image_url IS NOT NULL;

-- 2. Clear uploaded video URLs (keep external URLs for embedding)
UPDATE projects SET video_url = NULL 
WHERE video_url IS NOT NULL AND video_url LIKE '%/storage/v1/object/public/%';

-- 3. Remove external videos from array (they belong in video_url field)
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
```

**Important Design:**
- **Uploaded videos** → `video_urls` array (from Supabase storage)
- **External videos** → `video_url` field (YouTube, Vimeo for embedding)
- **Uploaded images** → `image_urls` array (from Supabase storage)

## Next Steps

1. Run the migration script (`migrate-to-media-arrays.sql`)
2. If you see duplicates, run the fix script (`fix-duplicate-images.sql`)
3. Test with existing projects
4. Try uploading multiple images/videos to a project
5. Once confident, you can drop old columns:
   ```sql
   ALTER TABLE projects DROP COLUMN image_url;
   ALTER TABLE projects DROP COLUMN video_url;
   ```

