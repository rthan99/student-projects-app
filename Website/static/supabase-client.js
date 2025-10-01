// Supabase JavaScript Client for Student Projects
// This file handles direct connection to Supabase from the frontend
// Fallback version that works with existing database structure

let supabaseClient = null;

// Initialize Supabase client
async function initializeSupabase() {
  if (!window.ENV) {
    throw new Error('Environment configuration not loaded. Please ensure env.js is included.');
  }
  
  if (!window.supabase) {
    throw new Error('Supabase library not loaded. Please include the Supabase CDN script.');
  }
  
  if (!window.validateSupabaseConfig()) {
    throw new Error('Invalid Supabase configuration. Please check env.js');
  }
  
  supabaseClient = window.supabase.createClient(
    window.ENV.SUPABASE_URL,
    window.ENV.SUPABASE_ANON_KEY
  );
  
  // Auto sign-in with anonymous user for private bucket access
  // This allows uploads to work with RLS policies
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      // Sign in anonymously (or with a service account)
      // For now, we'll check if already authenticated
      console.log('⚠️ No active session - uploads to private bucket may fail');
      console.log('ℹ️ Consider using service role key or setting up authentication');
    } else {
      console.log('✅ Authenticated session active');
    }
  } catch (error) {
    console.warn('Auth check failed:', error);
  }
  
  console.log('✅ Supabase client initialized');
  return supabaseClient;
}

// Get Supabase client (initialize if needed)
function getSupabaseClient() {
  if (!supabaseClient) {
    return initializeSupabase();
  }
  return supabaseClient;
}

// Supabase API functions that match the backend API
const supabaseAPI = {
  // Fetch projects with filtering and sorting
  async fetchProjects(params = {}) {
    const client = getSupabaseClient();
    let query = client.from(window.ENV.PROJECTS_TABLE).select('*');
    
    // Apply filters
    if (params.q) {
      const searchTerm = `%${params.q}%`;
      query = query.or(`title.ilike.${searchTerm},student_name.ilike.${searchTerm},description.ilike.${searchTerm}`);
    }
    
    if (params.year) {
      query = query.eq('year', parseInt(params.year));
    }
    
    if (params.curator) {
      query = query.eq('curator', params.curator);
    }
    
    if (params.rating) {
      query = query.gte('rating', parseInt(params.rating));
    }
    
    // Apply sorting
    const sortBy = params.sortBy || 'created_at';
    const sortOrder = params.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
    
    return data.map(project => ({
      ...project,
      // Set counts based on arrays in project table
      image_count: (project.image_urls && Array.isArray(project.image_urls)) ? project.image_urls.length : 0,
      video_count: (project.video_urls && Array.isArray(project.video_urls)) ? project.video_urls.length : 0,
      thumbnail_image: (project.image_urls && project.image_urls.length > 0) ? project.image_urls[0] : null,
      thumbnail_video: (project.video_urls && project.video_urls.length > 0) ? project.video_urls[0] : null
    }));
  },

  // Get single project
  async getProject(id) {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from(window.ENV.PROJECTS_TABLE)
      .select('*')
      .eq('id', parseInt(id))
      .single();
    
    if (error) {
      console.error('Error fetching project:', error);
      throw error;
    }
    
    return data;
  },

  // Create project
  async createProject(projectData) {
    const client = getSupabaseClient();
    
    const cleanProjectData = {
      title: projectData.title,
      student_name: projectData.student_name,
      description: projectData.description,
      year: projectData.year ? parseInt(projectData.year) : null,
      video_url: projectData.video_url,
      rating: projectData.rating ? parseInt(projectData.rating) : 0,
      project_link: projectData.project_link,
      curator: projectData.curator,
      tags: Array.isArray(projectData.tags) ? projectData.tags.join(',') : projectData.tags,
      github_repo: projectData.github_repo,
      documentation: projectData.documentation,
      feedback: projectData.feedback,
      image_urls: projectData.image_urls || [],
      video_urls: projectData.video_urls || []
    };
    
    // Remove undefined/null values
    Object.keys(cleanProjectData).forEach(key => {
      if (cleanProjectData[key] === undefined || cleanProjectData[key] === null) {
        delete cleanProjectData[key];
      }
    });
    
    const { data, error } = await client
      .from(window.ENV.PROJECTS_TABLE)
      .insert(cleanProjectData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating project:', error);
      throw error;
    }
    
    return data;
  },

  // Update project
  async updateProject(id, projectData) {
    const client = getSupabaseClient();
    
    const cleanProjectData = {
      title: projectData.title,
      student_name: projectData.student_name,
      description: projectData.description,
      year: projectData.year ? parseInt(projectData.year) : null,
      video_url: projectData.video_url,
      rating: projectData.rating ? parseInt(projectData.rating) : 0,
      project_link: projectData.project_link,
      curator: projectData.curator,
      tags: Array.isArray(projectData.tags) ? projectData.tags.join(',') : projectData.tags,
      github_repo: projectData.github_repo,
      documentation: projectData.documentation,
      feedback: projectData.feedback
    };
    
    // Remove undefined/null values
    Object.keys(cleanProjectData).forEach(key => {
      if (cleanProjectData[key] === undefined || cleanProjectData[key] === null) {
        delete cleanProjectData[key];
      }
    });
    
    const { data, error } = await client
      .from(window.ENV.PROJECTS_TABLE)
      .update(cleanProjectData)
      .eq('id', parseInt(id))
      .select()
      .single();
    
    if (error) {
      console.error('Error updating project:', error);
      throw error;
    }
    
    return data;
  },

  // Delete project
  async deleteProject(id) {
    const client = getSupabaseClient();
    
    // Get project first to clean up storage
    const project = await this.getProject(id);
    
    // Delete all images from storage (from image_urls array)
    if (project && project.image_urls && Array.isArray(project.image_urls)) {
      for (const imageUrl of project.image_urls) {
        if (imageUrl && imageUrl.includes('/storage/v1/object/public/')) {
          try {
            const urlParts = imageUrl.split('/storage/v1/object/public/');
            if (urlParts.length > 1) {
              const bucketPath = urlParts[1];
              const pathParts = bucketPath.split('/');
              const bucket = pathParts[0];
              const filePath = pathParts.slice(1).join('/');
              await client.storage.from(bucket).remove([filePath]);
            }
          } catch (storageError) {
            console.warn('Error deleting image from storage:', storageError);
          }
        }
      }
    }

    // Delete all videos from storage (from video_urls array)
    if (project && project.video_urls && Array.isArray(project.video_urls)) {
      for (const videoUrl of project.video_urls) {
        if (videoUrl && videoUrl.includes('/storage/v1/object/public/')) {
          try {
            const urlParts = videoUrl.split('/storage/v1/object/public/');
            if (urlParts.length > 1) {
              const bucketPath = urlParts[1];
              const pathParts = bucketPath.split('/');
              const bucket = pathParts[0];
              const filePath = pathParts.slice(1).join('/');
              await client.storage.from(bucket).remove([filePath]);
            }
          } catch (storageError) {
            console.warn('Error deleting video from storage:', storageError);
          }
        }
      }
    }
    
    const { error } = await client
      .from(window.ENV.PROJECTS_TABLE)
      .delete()
      .eq('id', parseInt(id));
    
    if (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  },

  // Upload image and get URL
  async uploadImageAndGetUrl(file, projectId) {
    const client = getSupabaseClient();
    
    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const filename = `image_${timestamp}.${fileExtension}`;
    const storagePath = `projects/${projectId}/${filename}`;
    
    // Upload to storage
    const { data: uploadData, error: uploadError } = await client.storage
      .from('project-media')
      .upload(storagePath, file);
    
    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      throw uploadError;
    }
    
    // Get public URL
    const { data: urlData } = client.storage
      .from('project-media')
      .getPublicUrl(storagePath);
    
    return urlData.publicUrl;
  },

  // Upload video and get URL
  async uploadVideoAndGetUrl(file, projectId) {
    const client = getSupabaseClient();
    
    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const filename = `video_${timestamp}.${fileExtension}`;
    const storagePath = `projects/${projectId}/${filename}`;
    
    // Upload to storage
    const { data: uploadData, error: uploadError } = await client.storage
      .from('project-media')
      .upload(storagePath, file);
    
    if (uploadError) {
      console.error('Error uploading video:', uploadError);
      throw uploadError;
    }
    
    // Get public URL
    const { data: urlData } = client.storage
      .from('project-media')
      .getPublicUrl(storagePath);
    
    return urlData.publicUrl;
  },


  // Add image to project's image_urls array
  async addImageToProject(projectId, imageUrl) {
    const client = getSupabaseClient();
    const project = await this.getProject(projectId);
    
    const currentImages = project.image_urls || [];
    const updatedImages = [...currentImages, imageUrl];
    
    const { error } = await client
      .from(window.ENV.PROJECTS_TABLE)
      .update({ image_urls: updatedImages })
      .eq('id', parseInt(projectId));
    
    if (error) {
      console.error('Error adding image to project:', error);
      throw error;
    }
  },

  // Remove image from project's image_urls array
  async removeImageFromProject(projectId, imageUrl) {
    const client = getSupabaseClient();
    const project = await this.getProject(projectId);
    
    const currentImages = project.image_urls || [];
    const updatedImages = currentImages.filter(url => url !== imageUrl);
    
    // Delete from storage
    if (imageUrl.includes('/storage/v1/object/public/')) {
      try {
        const urlParts = imageUrl.split('/storage/v1/object/public/');
        if (urlParts.length > 1) {
          const bucketPath = urlParts[1];
          const pathParts = bucketPath.split('/');
          const bucket = pathParts[0];
          const filePath = pathParts.slice(1).join('/');
          await client.storage.from(bucket).remove([filePath]);
        }
      } catch (storageError) {
        console.warn('Error deleting image from storage:', storageError);
      }
    }
    
    const { error } = await client
      .from(window.ENV.PROJECTS_TABLE)
      .update({ image_urls: updatedImages })
      .eq('id', parseInt(projectId));
    
    if (error) {
      console.error('Error removing image from project:', error);
      throw error;
    }
  },

  // Add video to project's video_urls array
  async addVideoToProject(projectId, videoUrl) {
    const client = getSupabaseClient();
    const project = await this.getProject(projectId);
    
    const currentVideos = project.video_urls || [];
    const updatedVideos = [...currentVideos, videoUrl];
    
    const { error } = await client
      .from(window.ENV.PROJECTS_TABLE)
      .update({ video_urls: updatedVideos })
      .eq('id', parseInt(projectId));
    
    if (error) {
      console.error('Error adding video to project:', error);
      throw error;
    }
  },

  // Remove video from project's video_urls array
  async removeVideoFromProject(projectId, videoUrl) {
    const client = getSupabaseClient();
    const project = await this.getProject(projectId);
    
    const currentVideos = project.video_urls || [];
    const updatedVideos = currentVideos.filter(url => url !== videoUrl);
    
    // Delete from storage
    if (videoUrl.includes('/storage/v1/object/public/')) {
      try {
        const urlParts = videoUrl.split('/storage/v1/object/public/');
        if (urlParts.length > 1) {
          const bucketPath = urlParts[1];
          const pathParts = bucketPath.split('/');
          const bucket = pathParts[0];
          const filePath = pathParts.slice(1).join('/');
          await client.storage.from(bucket).remove([filePath]);
        }
      } catch (storageError) {
        console.warn('Error deleting video from storage:', storageError);
      }
    }
    
    const { error } = await client
      .from(window.ENV.PROJECTS_TABLE)
      .update({ video_urls: updatedVideos })
      .eq('id', parseInt(projectId));
    
    if (error) {
      console.error('Error removing video from project:', error);
      throw error;
    }
  },

  // Upload image and add to project's image_urls array
  async uploadAndAddImage(file, projectId) {
    const imageUrl = await this.uploadImageAndGetUrl(file, projectId);
    await this.addImageToProject(projectId, imageUrl);
    return imageUrl;
  },

  // Upload video and add to project's video_urls array
  async uploadAndAddVideo(file, projectId) {
    const videoUrl = await this.uploadVideoAndGetUrl(file, projectId);
    await this.addVideoToProject(projectId, videoUrl);
    return videoUrl;
  },

  // Comments functionality
  async addComment(projectId, commentData) {
    const client = getSupabaseClient();
    
    const cleanCommentData = {
      project_id: parseInt(projectId),
      category: commentData.category,
      author: commentData.author,
      comment_text: commentData.comment_text || commentData.text, // Support both field names
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await client
      .from('comments')
      .insert(cleanCommentData)
      .select()
      .single();
    
    if (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
    
    return data;
  },

  async getComments(projectId) {
    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('comments')
      .select('*')
      .eq('project_id', parseInt(projectId))
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }
    
    return data || [];
  },

  async deleteComment(commentId) {
    const client = getSupabaseClient();
    
    const { error } = await client
      .from('comments')
      .delete()
      .eq('id', parseInt(commentId));
    
    if (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }
};

// Make API available globally
window.supabaseAPI = supabaseAPI;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  try {
    initializeSupabase();
    console.log('✅ Supabase API ready (fallback mode)');
  } catch (error) {
    console.error('❌ Failed to initialize Supabase:', error);
  }
});