// Environment Configuration for Supabase
// This file contains your Supabase credentials

const ENV = {
  // Your Supabase project URL (from Supabase Dashboard > Settings > API)
  SUPABASE_URL: 'https://djcryapejqcneuljlapd.supabase.co',
  
  // Your Supabase anon/public key (safe to use in frontend)
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqY3J5YXBlanFjbmV1bGpsYXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNzI1MTAsImV4cCI6MjA3Mzg0ODUxMH0.Bulg8Cp7yF2cj4GCU9DP5j9VTniDTgauSlJokS2TrHI',
  
  // Storage bucket name (must exist in your Supabase project)
  SUPABASE_BUCKET: 'project-media',
  
  // Table names (use defaults unless you customized them)
  PROJECTS_TABLE: 'projects',
  MEDIA_TABLE: 'media', 
  COMMENTS_TABLE: 'comments'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ENV;
} else {
  window.ENV = ENV;
}

// Validation helper
window.validateSupabaseConfig = function() {
  if (!ENV.SUPABASE_URL || ENV.SUPABASE_URL === 'your_supabase_project_url_here') {
    console.error('❌ SUPABASE_URL not configured in env.js');
    return false;
  }
  
  if (!ENV.SUPABASE_ANON_KEY || ENV.SUPABASE_ANON_KEY === 'your_supabase_anon_key_here') {
    console.error('❌ SUPABASE_ANON_KEY not configured in env.js');
    return false;
  }
  
  console.log('✅ Supabase configuration looks valid');
  return true;
};