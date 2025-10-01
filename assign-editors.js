// Script to randomly assign 8 projects to each editor
// Run this in your Supabase SQL editor or as a Node.js script

const editors = [
  'Annemarie', 'Esther', 'Judith', 'Jose', 
  'Marije', 'Rooske', 'Inka', 'Mart', 'Katja'
];

// SQL script to randomly assign editors to projects
const sqlScript = `
-- First, let's see how many projects we have
SELECT COUNT(*) as total_projects FROM projects;

-- Randomly assign editors to projects (8 projects per editor)
-- This assumes you have at least 72 projects (9 editors × 8 projects each)

WITH project_assignments AS (
  SELECT 
    id,
    title,
    ROW_NUMBER() OVER (ORDER BY RANDOM()) as rn
  FROM projects
  WHERE curator IS NULL OR curator = ''
),
editor_list AS (
  SELECT unnest(ARRAY[
    'Annemarie', 'Esther', 'Judith', 'Jose', 
    'Marije', 'Rooske', 'Inka', 'Mart', 'Katja'
  ]) as editor_name
),
editor_assignments AS (
  SELECT 
    editor_name,
    generate_series(1, 8) as project_number
  FROM editor_list
)
UPDATE projects 
SET curator = ea.editor_name
FROM project_assignments pa
JOIN editor_assignments ea ON pa.rn = (ea.project_number - 1) * 9 + 
  CASE ea.editor_name
    WHEN 'Annemarie' THEN 1
    WHEN 'Esther' THEN 2
    WHEN 'Judith' THEN 3
    WHEN 'Jose' THEN 4
    WHEN 'Marije' THEN 5
    WHEN 'Rooske' THEN 6
    WHEN 'Inka' THEN 7
    WHEN 'Mart' THEN 8
    WHEN 'Katja' THEN 9
  END
WHERE projects.id = pa.id;

-- Verify the assignments
SELECT 
  curator,
  COUNT(*) as project_count
FROM projects 
WHERE curator IS NOT NULL AND curator != ''
GROUP BY curator
ORDER BY curator;
`;

console.log('SQL Script to assign editors:');
console.log(sqlScript);

// Alternative: If you want to run this as a Node.js script with Supabase
const { createClient } = require('@supabase/supabase-js');

async function assignEditors() {
  // You'll need to add your Supabase credentials here
  const supabaseUrl = 'YOUR_SUPABASE_URL';
  const supabaseKey = 'YOUR_SUPABASE_SERVICE_ROLE_KEY';
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Get all projects
    const { data: projects, error: fetchError } = await supabase
      .from('projects')
      .select('id, title')
      .order('id');
    
    if (fetchError) throw fetchError;
    
    console.log(`Found ${projects.length} projects`);
    
    if (projects.length < 72) {
      console.log('Warning: Need at least 72 projects for 9 editors × 8 projects each');
      return;
    }
    
    // Shuffle projects randomly
    const shuffledProjects = projects.sort(() => Math.random() - 0.5);
    
    // Assign 8 projects to each editor
    const assignments = [];
    let projectIndex = 0;
    
    for (const editor of editors) {
      for (let i = 0; i < 8; i++) {
        if (projectIndex < shuffledProjects.length) {
          assignments.push({
            id: shuffledProjects[projectIndex].id,
            curator: editor
          });
          projectIndex++;
        }
      }
    }
    
    console.log(`Assigning ${assignments.length} projects to editors...`);
    
    // Update projects in batches
    const batchSize = 10;
    for (let i = 0; i < assignments.length; i += batchSize) {
      const batch = assignments.slice(i, i + batchSize);
      
      for (const assignment of batch) {
        const { error } = await supabase
          .from('projects')
          .update({ curator: assignment.curator })
          .eq('id', assignment.id);
        
        if (error) {
          console.error(`Error updating project ${assignment.id}:`, error);
        }
      }
      
      console.log(`Updated batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(assignments.length/batchSize)}`);
    }
    
    // Verify assignments
    const { data: verification, error: verifyError } = await supabase
      .from('projects')
      .select('curator')
      .not('curator', 'is', null);
    
    if (verifyError) throw verifyError;
    
    const counts = verification.reduce((acc, project) => {
      acc[project.curator] = (acc[project.curator] || 0) + 1;
      return acc;
    }, {});
    
    console.log('Final assignment counts:');
    Object.entries(counts).forEach(([editor, count]) => {
      console.log(`${editor}: ${count} projects`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Uncomment the line below to run the assignment
// assignEditors();
