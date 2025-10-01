-- Script to randomly assign 8 projects to each editor
-- Run this in your Supabase SQL editor

-- First, let's see how many projects we have
SELECT COUNT(*) as total_projects FROM projects;

-- Check current curator assignments
SELECT 
  curator,
  COUNT(*) as project_count
FROM projects 
WHERE curator IS NOT NULL AND curator != ''
GROUP BY curator
ORDER BY curator;

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

-- Show sample of assignments
SELECT 
  id,
  title,
  curator
FROM projects 
WHERE curator IS NOT NULL AND curator != ''
ORDER BY curator, title
LIMIT 20;
