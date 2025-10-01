// Gallery Media Client for Supabase
// Handles multiple images and videos per project with gallery functionality

class GalleryMediaClient {
  constructor(supabaseUrl, supabaseKey) {
    this.supabase = supabase.createClient(supabaseUrl, supabaseKey);
    this.storageBucket = 'project-media'; // Configure your bucket name
  }

  // Get all projects with their media for gallery display
  async getProjectsWithMedia(filters = {}) {
    try {
      let query = this.supabase
        .from('gallery_media')
        .select(`
          project_id,
          project_title,
          media_type,
          filename,
          original_name,
          file_size,
          mime_type,
          width,
          height,
          duration,
          public_url,
          thumbnail_url,
          display_order,
          is_primary,
          metadata,
          created_at
        `)
        .order('project_id')
        .order('display_order');

      // Apply filters
      if (filters.mediaType) {
        query = query.eq('media_type', filters.mediaType);
      }
      if (filters.year) {
        // Note: You'd need to join with projects table for year filtering
        // This is a simplified version
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Group media by project
      const projectsMap = new Map();
      
      data.forEach(media => {
        if (!projectsMap.has(media.project_id)) {
          projectsMap.set(media.project_id, {
            project_id: media.project_id,
            title: media.project_title,
            media: [],
            primaryMedia: null
          });
        }
        
        const project = projectsMap.get(media.project_id);
        project.media.push(media);
        
        if (media.is_primary) {
          project.primaryMedia = media;
        }
      });

      return Array.from(projectsMap.values());
    } catch (error) {
      console.error('Error fetching projects with media:', error);
      throw error;
    }
  }

  // Get a single project with all its media
  async getProjectWithMedia(projectId) {
    try {
      const { data, error } = await this.supabase
        .rpc('get_project_with_media', { project_id_param: projectId });

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error fetching project with media:', error);
      throw error;
    }
  }

  // Upload media file to Supabase Storage
  async uploadMedia(file, projectId, mediaType, options = {}) {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const filename = `${timestamp}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
      
      // Determine storage path
      const folder = mediaType === 'image' ? 'images' : 'videos';
      const storagePath = `projects/${projectId}/${folder}/${filename}`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from(this.storageBucket)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(this.storageBucket)
        .getPublicUrl(storagePath);

      // Get file metadata
      const metadata = await this.getFileMetadata(file, mediaType);

      // Insert media record
      const { data: mediaData, error: mediaError } = await this.supabase
        .from('media')
        .insert({
          project_id: projectId,
          media_type: mediaType,
          filename: filename,
          original_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          width: metadata.width,
          height: metadata.height,
          duration: metadata.duration,
          storage_path: storagePath,
          public_url: urlData.publicUrl,
          thumbnail_url: metadata.thumbnailUrl,
          display_order: options.displayOrder || 0,
          is_primary: options.isPrimary || false,
          metadata: metadata.exif || null
        })
        .select()
        .single();

      if (mediaError) throw mediaError;

      return mediaData;
    } catch (error) {
      console.error('Error uploading media:', error);
      throw error;
    }
  }

  // Get file metadata (dimensions, duration, etc.)
  async getFileMetadata(file, mediaType) {
    return new Promise((resolve) => {
      const metadata = {
        width: null,
        height: null,
        duration: null,
        thumbnailUrl: null,
        exif: null
      };

      if (mediaType === 'image') {
        const img = new Image();
        img.onload = () => {
          metadata.width = img.naturalWidth;
          metadata.height = img.naturalHeight;
          resolve(metadata);
        };
        img.src = URL.createObjectURL(file);
      } else if (mediaType === 'video') {
        const video = document.createElement('video');
        video.onloadedmetadata = () => {
          metadata.width = video.videoWidth;
          metadata.height = video.videoHeight;
          metadata.duration = video.duration;
          
          // Create thumbnail
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          
          metadata.thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(metadata);
        };
        video.src = URL.createObjectURL(file);
      } else {
        resolve(metadata);
      }
    });
  }

  // Delete media file
  async deleteMedia(mediaId) {
    try {
      // Get media record first
      const { data: media, error: fetchError } = await this.supabase
        .from('media')
        .select('storage_path, project_id')
        .eq('id', mediaId)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage
      const { error: storageError } = await this.supabase.storage
        .from(this.storageBucket)
        .remove([media.storage_path]);

      if (storageError) console.warn('Storage deletion failed:', storageError);

      // Delete from database
      const { error: dbError } = await this.supabase
        .from('media')
        .delete()
        .eq('id', mediaId);

      if (dbError) throw dbError;

      return true;
    } catch (error) {
      console.error('Error deleting media:', error);
      throw error;
    }
  }

  // Reorder media in gallery
  async reorderMedia(mediaIds, projectId) {
    try {
      const { data, error } = await this.supabase
        .rpc('reorder_media', {
          media_ids: mediaIds,
          project_id_param: projectId
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error reordering media:', error);
      throw error;
    }
  }

  // Set primary media for a project
  async setPrimaryMedia(mediaId, projectId) {
    try {
      const { data, error } = await this.supabase
        .rpc('set_primary_media', {
          media_id_param: mediaId,
          project_id_param: projectId
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error setting primary media:', error);
      throw error;
    }
  }

  // Get gallery statistics
  async getGalleryStats() {
    try {
      const { data, error } = await this.supabase
        .rpc('get_gallery_stats');

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error fetching gallery stats:', error);
      throw error;
    }
  }

  // Create project with initial media
  async createProjectWithMedia(projectData, mediaFiles = []) {
    try {
      // Filter out undefined/null values and only include fields that exist
      const cleanProjectData = {};
      const allowedFields = ['title', 'description', 'student_name', 'year', 'curator', 'rating', 'project_link'];
      
      allowedFields.forEach(field => {
        if (projectData[field] !== undefined && projectData[field] !== null) {
          cleanProjectData[field] = projectData[field];
        }
      });
      
      // Ensure required fields are present
      if (!cleanProjectData.title) {
        throw new Error('Project title is required');
      }
      
      // Create project first
      const { data: project, error: projectError } = await this.supabase
        .from('projects')
        .insert(cleanProjectData)
        .select()
        .single();

      if (projectError) throw projectError;

      // Upload media files
      const mediaResults = [];
      for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i];
        const mediaType = file.type.startsWith('image/') ? 'image' : 'video';
        
        const media = await this.uploadMedia(file, project.id, mediaType, {
          displayOrder: i,
          isPrimary: i === 0 // First file is primary
        });
        
        mediaResults.push(media);
      }

      return {
        project,
        media: mediaResults
      };
    } catch (error) {
      console.error('Error creating project with media:', error);
      throw error;
    }
  }

  // Update project media
  async updateProjectMedia(projectId, updates) {
    try {
      const { data, error } = await this.supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  // Search media by filename or metadata
  async searchMedia(searchTerm, filters = {}) {
    try {
      let query = this.supabase
        .from('gallery_media')
        .select('*')
        .or(`original_name.ilike.%${searchTerm}%,filename.ilike.%${searchTerm}%`);

      if (filters.mediaType) {
        query = query.eq('media_type', filters.mediaType);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error searching media:', error);
      throw error;
    }
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GalleryMediaClient;
} else {
  window.GalleryMediaClient = GalleryMediaClient;
}
