const state = {
  sort: 'title',
  order: 'asc',
  randomMode: false,
  allProjects: [],
};

async function fetchProjects() {
  console.log('fetchProjects called');
  const params = new URLSearchParams();
  const q = document.getElementById('search').value.trim();
  const year = document.getElementById('year').value.trim();
  const curator = document.getElementById('curator').value.trim();
  const sortByElement = document.getElementById('sortBy');
  const sortBy = sortByElement ? sortByElement.value.trim() : '';
  
  if (q) params.set('q', q);
  if (year) params.set('year', year);
  if (curator) params.set('curator', curator);
  
  // Parse sortBy value to set sort and order
  if (sortBy) {
    const [field, order] = sortBy.split('_');
    params.set('sort', field);
    params.set('order', order);
  } else {
    params.set('sort', state.sort);
    params.set('order', state.order);
  }
  
  console.log('Filter params:', { q, year, curator, sortBy, sort: params.get('sort'), order: params.get('order') });
  console.log('API URL:', `/api/projects?${params.toString()}`);
  
  const res = await fetch(`/api/projects?${params.toString()}`);
  const data = await res.json();
  console.log('Received', data.length, 'projects');
  
  // Store filtered results for display
  const filteredData = data;
  
  // Always fetch all projects to keep state.allProjects up to date
  const allRes = await fetch('/api/projects');
  state.allProjects = await allRes.json();
  console.log('Fetched all projects for filters:', state.allProjects.length);
  
  if (state.randomMode) {
    console.log('Showing random projects');
    showRandomProjects();
  } else {
    console.log('Showing filtered projects');
    renderGrid(filteredData);
  }
  // Always populate filters with ALL projects, not just filtered results
  populateFilters(state.allProjects);
}

function renderGrid(rows) {
  console.log('renderGrid called with', rows.length, 'rows');
  const grid = document.getElementById('projectGrid');
  if (!grid) {
    console.error('Project grid not found');
    return;
  }
  grid.innerHTML = '';
  for (const row of rows) {
    const card = document.createElement('div');
    card.className = 'card';
    const imgSrc = row.thumbnail_image ? `/uploads/images/${encodeURIComponent(row.thumbnail_image)}` : null;
    const hasVideoOnly = !imgSrc && row.video_count > 0;
    
    // Generate star rating HTML - only show if rating > 0
    const rating = row.rating || 0;
    const starsHtml = rating > 0 ? Array.from({length: 3}, (_, i) => 
      `<span class="star ${i < rating ? 'active' : ''}">★</span>`
    ).join('') : '';
    
    // Create media HTML with rating included (only if rating exists)
    let mediaWithRating = '';
    if (imgSrc) {
      mediaWithRating = `<div class="card-image" style="background-image:url('${imgSrc}')" data-id="${row.id}">${starsHtml ? `<div class="card-rating">${starsHtml}</div>` : ''}</div>`;
    } else if (hasVideoOnly) {
      mediaWithRating = `
        <div class="card-image" data-id="${row.id}">
          <video class="card-video" preload="metadata" muted playsinline>
            <source src="/uploads/videos/${encodeURIComponent(row.thumbnail_video || '')}" />
          </video>
          <div class="card-video-overlay">
            <div class="card-play-icon"></div>
          </div>
          <div class="video-badge">▶</div>
          ${starsHtml ? `<div class="card-rating">${starsHtml}</div>` : ''}
        </div>`;
    } else {
      mediaWithRating = `<div class="card-image" data-id="${row.id}"><div class="no-thumb">No Media</div>${starsHtml ? `<div class="card-rating">${starsHtml}</div>` : ''}</div>`;
    }
    
    // Generate tags HTML
    const tagsHtml = '';

    card.innerHTML = `
      ${mediaWithRating}
      <div class="card-title">${escapeHtml(row.title)}</div>
      ${row.curator ? `<div class="card-curator"><span class="curator-badge ${row.curator.toLowerCase()}">${row.curator}</span></div>` : ''}
      <div class="card-meta">
        ${row.year ? `<span>${row.year}${(row.video_count > 0 || row.video_url) ? ' 🎥' : ''}${row.project_link ? ' 🔗' : ''}</span>` : ''}
      </div>
      ${tagsHtml}
    `;
    grid.appendChild(card);
  }

  // Handle video play/pause toggle
  grid.querySelectorAll('.card-video-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      e.stopPropagation();
      const video = overlay.parentElement.querySelector('.card-video');
      const playIcon = overlay.querySelector('.card-play-icon');
      
      if (video.paused) {
        video.play();
        overlay.classList.add('playing');
        playIcon.innerHTML = '⏸';
      } else {
        video.pause();
        overlay.classList.remove('playing');
        playIcon.innerHTML = '';
      }
    });
  });

  // Reset overlay when video ends
  grid.querySelectorAll('.card-video').forEach((video) => {
    video.addEventListener('ended', () => {
      const overlay = video.parentElement.querySelector('.card-video-overlay');
      const playIcon = overlay.querySelector('.card-play-icon');
      overlay.classList.remove('playing');
      playIcon.innerHTML = '';
    });
  });

  // Only make the white space below videos clickable for project modal
  grid.querySelectorAll('.card-title, .card-meta').forEach((el) => {
    el.addEventListener('click', async (e) => {
      const card = el.closest('.card');
      const id = card.querySelector('.card-image').getAttribute('data-id');
      if (!id) return;
      const res = await fetch(`/api/projects/${id}`);
      const proj = await res.json();
      const projectIndex = rows.findIndex(row => row.id == id);
      showProjectInfo(proj, projectIndex);
    });
  });

  // Handle image clicks (non-video projects)
  grid.querySelectorAll('.card-image').forEach((el) => {
    // Only add click handler if it's not a video (no video overlay)
    if (!el.querySelector('.card-video-overlay')) {
      el.addEventListener('click', async (e) => {
        const id = el.getAttribute('data-id');
        if (!id) return;
        const res = await fetch(`/api/projects/${id}`);
        const proj = await res.json();
        const projectIndex = rows.findIndex(row => row.id == id);
        showProjectInfo(proj, projectIndex);
      });
    }
  });

  grid.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (!confirm('Delete this project?')) return;
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      fetchProjects();
    });
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setupSort() {
  document.querySelectorAll('#projectsTable thead th[data-sort]').forEach((th) => {
    th.addEventListener('click', () => {
      const column = th.getAttribute('data-sort');
      if (state.sort === column) {
        state.order = state.order === 'asc' ? 'desc' : 'asc';
      } else {
        state.sort = column;
        state.order = 'asc';
      }
      fetchProjects();
    });
  });
}

function setupFilters() {
  const randomBtn = document.getElementById('randomProjects');
  if (!randomBtn) {
    console.error('Random projects button not found');
    return;
  }

  // Mobile filter toggle functionality (similar to create form)
  const filterToggle = document.getElementById('filterToggle');
  const controlsFilters = document.getElementById('controlsFilters');
  
  if (filterToggle && controlsFilters) {
    // Check if we're on mobile (screen width <= 768px)
    const isMobile = () => window.innerWidth <= 768;
    
    // Initialize mobile state - filters hidden by default on mobile
    if (isMobile()) {
      controlsFilters.style.maxHeight = '0px';
    } else {
      // On desktop, show filters by default
      controlsFilters.classList.add('open');
    }
    
    // Toggle filters (works like create form)
    filterToggle.addEventListener('click', () => {
      const willOpen = !controlsFilters.classList.contains('open');
      
      if (willOpen) {
        controlsFilters.classList.add('open');
        // Measure content height by temporarily setting max-height to large value
        const scrollH = controlsFilters.scrollHeight;
        controlsFilters.style.maxHeight = scrollH + 'px';
        filterToggle.classList.add('active');
        filterToggle.querySelector('.icon').textContent = '✕';
        filterToggle.querySelector('.text').textContent = 'Close';
      } else {
        // Collapse with transition
        const scrollH = controlsFilters.scrollHeight;
        controlsFilters.style.maxHeight = scrollH + 'px';
        requestAnimationFrame(() => {
          controlsFilters.style.maxHeight = '0px';
          controlsFilters.classList.remove('open');
        });
        filterToggle.classList.remove('active');
        filterToggle.querySelector('.icon').textContent = '🔍';
        filterToggle.querySelector('.text').textContent = 'Filter';
      }
      // Fade handled via opacity coupled to .open class
      controlsFilters.style.opacity = willOpen ? '1' : '0';
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
      if (!isMobile()) {
        // On desktop, always show filters
        controlsFilters.classList.add('open');
        controlsFilters.style.maxHeight = 'none';
        controlsFilters.style.opacity = '1';
        filterToggle.classList.remove('active');
        filterToggle.querySelector('.icon').textContent = '🔍';
        filterToggle.querySelector('.text').textContent = 'Filter';
      } else {
        // On mobile, hide filters by default
        controlsFilters.classList.remove('open');
        controlsFilters.style.maxHeight = '0px';
        controlsFilters.style.opacity = '0';
        filterToggle.classList.remove('active');
        filterToggle.querySelector('.icon').textContent = '🔍';
        filterToggle.querySelector('.text').textContent = 'Filter';
      }
    });
  }
  
  randomBtn.addEventListener('click', () => {
    state.randomMode = !state.randomMode;
    const button = document.getElementById('randomProjects');
    
    if (state.randomMode) {
      button.textContent = '📋 Show all projects';
      button.classList.add('showing-all');
      showRandomProjects();
    } else {
      button.textContent = '🎲 Show me 4 random projects';
      button.classList.remove('showing-all');
      fetchProjects();
    }
  });
  
  // Add immediate event listeners for all filter inputs
  document.getElementById('search').addEventListener('input', () => {
    state.randomMode = false;
    const randomBtn = document.getElementById('randomProjects');
    randomBtn.textContent = '🎲 Show me 4 random projects';
    randomBtn.classList.remove('showing-all');
    fetchProjects();
  });

  document.getElementById('year').addEventListener('change', () => {
    state.randomMode = false;
    const randomBtn = document.getElementById('randomProjects');
    randomBtn.textContent = '🎲 Show me 4 random projects';
    randomBtn.classList.remove('showing-all');
    fetchProjects();
  });

  // Handle rating/sortBy select (whichever exists)
  const ratingElement = document.getElementById('rating');
  const sortByElement = document.getElementById('sortBy');
  
  if (ratingElement) {
    ratingElement.addEventListener('change', () => {
      state.randomMode = false;
      const randomBtn = document.getElementById('randomProjects');
      randomBtn.textContent = '🎲 Show me 4 random projects';
      randomBtn.classList.remove('showing-all');
      fetchProjects();
    });
  }
  
  if (sortByElement) {
    sortByElement.addEventListener('change', () => {
      state.randomMode = false;
      const randomBtn = document.getElementById('randomProjects');
      randomBtn.textContent = '🎲 Show me 4 random projects';
      randomBtn.classList.remove('showing-all');
      fetchProjects();
    });
  }

  document.getElementById('applyFilters').addEventListener('click', () => {
    state.randomMode = false;
    const randomBtn = document.getElementById('randomProjects');
    randomBtn.textContent = '🎲 Show me 4 random projects';
    randomBtn.classList.remove('showing-all');
    fetchProjects();
  });
  
  document.getElementById('clearFilters').addEventListener('click', () => {
    document.getElementById('search').value = '';
    document.getElementById('year').value = '';
    document.getElementById('curator').value = '';
    const sortByElement = document.getElementById('sortBy');
    if (sortByElement) sortByElement.value = 'title_asc';
    state.randomMode = false;
    const randomBtn = document.getElementById('randomProjects');
    randomBtn.textContent = '🎲 Show me 4 random projects';
    randomBtn.classList.remove('showing-all');
    fetchProjects();
  });

  // Auto-apply filters when inputs change
  document.getElementById('search').addEventListener('input', () => {
    state.randomMode = false;
    const randomBtn = document.getElementById('randomProjects');
    randomBtn.textContent = '🎲 Show me 4 random projects';
    randomBtn.classList.remove('showing-all');
    fetchProjects();
  });


  document.getElementById('year').addEventListener('change', () => {
    state.randomMode = false;
    const randomBtn = document.getElementById('randomProjects');
    randomBtn.textContent = '🎲 Show me 4 random projects';
    randomBtn.classList.remove('showing-all');
    fetchProjects();
  });

  document.getElementById('curator').addEventListener('change', () => {
    state.randomMode = false;
    const randomBtn = document.getElementById('randomProjects');
    randomBtn.textContent = '🎲 Show me 4 random projects';
    randomBtn.classList.remove('showing-all');
    fetchProjects();
  });


  // Rating element no longer exists - handled by sortBy element above
  const importBtn = document.getElementById('importBtn');
  if (importBtn) {
    importBtn.addEventListener('click', async () => {
      const fileInput = document.getElementById('import_file');
      const file = fileInput.files?.[0];
      if (!file) {
        alert('Select a CSV or XLSX file');
        return;
      }
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/projects/import', { method: 'POST', body: form });
      if (res.ok) {
        const result = await res.json();
        let msg = `Created ${result.created} projects.`;
        if (result.errors?.length) msg += ` Skipped ${result.errors.length} rows.`;
        alert(msg);
        fileInput.value = '';
        fetchProjects();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Import failed');
      }
    });
  }
  const createToggle = document.getElementById('createToggle');
  if (createToggle) {
    createToggle.addEventListener('click', () => {
      const sec = document.querySelector('.create-form');
      const content = sec;
      const willOpen = !sec.classList.contains('open');
      if (willOpen) {
        sec.classList.add('open');
        // measure content height by temporarily setting max-height to large value
        const scrollH = content.scrollHeight;
        sec.style.maxHeight = scrollH + 'px';
        createToggle.classList.add('rotated');
      } else {
        // collapse with transition
        const scrollH = content.scrollHeight;
        sec.style.maxHeight = scrollH + 'px';
        requestAnimationFrame(() => {
          sec.style.maxHeight = '0px';
          sec.classList.remove('open');
        });
        createToggle.classList.remove('rotated');
      }
      // fade handled via opacity coupled to .open class
      sec.style.opacity = willOpen ? '1' : '0';
    });
  }
}

function populateFilters(rows) {
  const yearSel = document.getElementById('year');
  const curatorSel = document.getElementById('curator');
  
  if (!yearSel || !curatorSel) return;
  
  const prevYear = yearSel.value;
  const prevCurator = curatorSel.value;

  // Populate years
  const years = Array.from(new Set(rows.map(r => r.year).filter(Boolean))).sort();
  yearSel.innerHTML = '<option value="">All Years</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
  if (prevYear && years.includes(Number(prevYear))) yearSel.value = prevYear;

  // Populate curators
  const curators = Array.from(new Set(rows.map(r => r.curator).filter(Boolean))).sort();
  curatorSel.innerHTML = '<option value="">All Curators</option>' + curators.map(c => `<option value="${c}">${c}</option>`).join('');
  if (prevCurator && curators.includes(prevCurator)) curatorSel.value = prevCurator;
}

function showRandomProjects() {
  if (state.allProjects.length === 0) return;
  
  // Get 5 random projects
  const shuffled = [...state.allProjects].sort(() => 0.5 - Math.random());
  const randomProjects = shuffled.slice(0, 4);
  
  renderGrid(randomProjects);
}



function setupCreate() {
  const createBtn = document.getElementById('createBtn');
  const titleInput = document.getElementById('new_title');
  
  // Setup star rating for create form
  const createRating = document.getElementById('new_rating');
  let selectedRating = 0;
  
  if (createRating) {
    createRating.addEventListener('click', (e) => {
      if (e.target.classList.contains('star')) {
        selectedRating = parseInt(e.target.dataset.rating);
        // Update all stars
        createRating.querySelectorAll('.star').forEach((star, index) => {
          star.classList.toggle('active', index < selectedRating);
        });
      }
    });
  }
  
  
  // Update button state based on form content
  function updateButtonState() {
    const hasTitle = titleInput.value.trim() !== '';
    createBtn.disabled = !hasTitle;
    createBtn.className = hasTitle ? 'create-ready' : 'create-disabled';
  }
  
  // Listen for input changes
  titleInput.addEventListener('input', updateButtonState);
  
  // Enhanced file upload functionality
  function setupFileUpload(inputId, infoId) {
    const input = document.getElementById(inputId);
    const info = document.getElementById(infoId);
    const uploadArea = input?.closest('.media-upload-area');
    
    if (!input || !info || !uploadArea) return;
    
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const size = (file.size / 1024 / 1024).toFixed(1);
        info.textContent = `✓ ${file.name} (${size} MB)`;
        uploadArea.classList.add('has-file');
      } else {
        info.textContent = '';
        uploadArea.classList.remove('has-file');
      }
    });
    
    // Drag and drop functionality
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        input.files = files;
        input.dispatchEvent(new Event('change'));
      }
    });
  }
  
  setupFileUpload('new_image', 'image-info');
  setupFileUpload('new_video', 'video-info');
  
  // Form validation
  function validateForm() {
    const title = titleInput.value.trim();
    const year = document.getElementById('new_year').value;
    const yearNum = parseInt(year);
    
    if (!title) {
      showStatus('Please enter a project title', 'error');
      return false;
    }
    
    if (year && (isNaN(yearNum) || yearNum < 2020 || yearNum > 2030)) {
      showStatus('Please enter a valid year (2020-2030)', 'error');
      return false;
    }
    
    return true;
  }
  
  function showStatus(message, type) {
    const statusDiv = document.getElementById('create-status');
    if (statusDiv) {
      statusDiv.textContent = message;
      statusDiv.className = `form-status ${type}`;
      setTimeout(() => {
        statusDiv.textContent = '';
        statusDiv.className = 'form-status';
      }, 5000);
    }
  }
  
  // Initial state
  updateButtonState();
  
  createBtn.addEventListener('click', async () => {
    if (!validateForm()) return;
    
    const title = titleInput.value.trim();
    createBtn.disabled = true;
    createBtn.innerHTML = '<span class="btn-icon">⏳</span>Creating...';
    showStatus('Creating project...', 'success');
    
    const form = new FormData();
    form.append('title', title);
    form.append('student_name', 'NEMO x Delft');
    
    // Only add fields that exist in the HTML
    const year = parseInt(document.getElementById('new_year').value, 10);
    const description = document.getElementById('new_desc').value.trim();
    const imgInput = document.getElementById('new_image');
    const vidInput = document.getElementById('new_video');
    if (!Number.isNaN(year)) form.append('year', String(year));
    if (description) form.append('description', description);
    if (selectedRating > 0) form.append('rating', String(selectedRating));
    if (imgInput?.files?.[0]) form.append('image', imgInput.files[0]);
    if (vidInput?.files?.[0]) form.append('video', vidInput.files[0]);

    try {
      const res = await fetch('/api/projects', { method: 'POST', body: form });
      if (res.ok) {
        const result = await res.json();
        showCreateNotice(result);
        showStatus('Project created successfully! ✨', 'success');
        
        // Clear form
        titleInput.value = '';
        document.getElementById('new_year').value = '';
        document.getElementById('new_desc').value = '';
        document.getElementById('new_video_url').value = '';
        imgInput.value = '';
        vidInput.value = '';
        
        // Clear file info displays
        document.getElementById('image-info').textContent = '';
        document.getElementById('video-info').textContent = '';
        
        // Clear rating
        selectedRating = 0;
        createRating.querySelectorAll('.star').forEach(star => star.classList.remove('active'));
        
        // Remove has-file class from upload areas
        document.querySelectorAll('.media-upload-area').forEach(area => {
          area.classList.remove('has-file');
        });
        
        updateButtonState();
        fetchProjects();
      } else {
        const err = await res.json();
        showStatus(err.error || 'Failed to create project', 'error');
      }
    } catch (error) {
      showStatus('Network error. Please try again.', 'error');
    } finally {
      createBtn.disabled = false;
      createBtn.innerHTML = '<span class="btn-icon">✨</span>Create Project';
    }
  });
}

function showCreateNotice(projectData) {
  const formSection = document.querySelector('.create-form');
  if (!formSection) return;
  
  // Create a simple notification
  const notice = document.createElement('div');
  notice.className = 'create-toast';
  notice.style.opacity = '0';
  notice.style.transform = 'translateY(-20px)';
  notice.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  notice.innerHTML = '✅ Project added!';
  
  // Insert after the form
  formSection.parentNode.insertBefore(notice, formSection.nextSibling);
  
  // Animate in
  setTimeout(() => {
    notice.style.opacity = '1';
    notice.style.transform = 'translateY(0)';
  }, 100);
  
  // Animate out and remove
  setTimeout(() => {
    notice.style.opacity = '0';
    notice.style.transform = 'translateY(-20px)';
    setTimeout(() => notice.remove(), 500);
  }, 2000);
}

function renderComments(comments) {
  if (!comments || comments.length === 0) {
    return '<div class="no-comments">No comments yet. Be the first to comment!</div>';
  }
  
  return comments.map(comment => {
    const commentType = comment.comment_type || 'general';
    const commentTypeInfo = window.formGenerator.commentTypes?.find(ct => ct.name === commentType);
    
    return `
      <div class="comment-item" data-comment-id="${comment.id}">
        <div class="comment-content">
          <div class="comment-header">
            <span class="comment-type-badge ${commentType}">
              ${commentTypeInfo ? commentTypeInfo.icon : '💬'} ${commentTypeInfo ? commentTypeInfo.label : commentType}
            </span>
            <span class="comment-date">${new Date(comment.created_at).toLocaleDateString()}</span>
            ${comment.updated_at !== comment.created_at ? 
              `<span class="comment-edited">(edited)</span>` : ''}
          </div>
          <div class="comment-text">${escapeHtml(comment.comment_text)}</div>
        </div>
        <div class="comment-actions">
          <button class="btn btn-sm edit-comment-btn" data-comment-id="${comment.id}" title="Edit">✏️</button>
          <button class="btn btn-sm delete-comment-btn" data-comment-id="${comment.id}" title="Delete">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

function setupCommentHandlers() {
  // Add comment handlers
  document.querySelectorAll('.add-comment-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const projectId = e.target.getAttribute('data-project-id');
      const commentSection = e.target.closest('.comment-section');
      const textarea = commentSection.querySelector('.comment-input');
      const commentText = textarea.value.trim();
      
      if (!commentText) {
        alert('Please enter a comment');
        return;
      }
      
      try {
        console.log('Adding comment for project ID:', projectId);
        console.log('Comment text:', commentText);
        
        // Get comment type
        const commentTypeSelect = document.querySelector('#comment-type');
        const commentType = commentTypeSelect ? commentTypeSelect.value : 'general';
        
        const response = await fetch(`/api/projects/${projectId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            comment_text: commentText,
            comment_type: commentType
          })
        });
        
        if (response.ok) {
          textarea.value = '';
          // Reload the modal to show the new comment
          const projectIndex = document.querySelector('.modal-overlay').getAttribute('data-project-index');
          const res = await fetch(`/api/projects/${projectId}`);
          const project = await res.json();
          document.querySelector('.modal-overlay').remove();
          showProjectInfo(project, projectIndex ? parseInt(projectIndex) : null);
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Failed to add comment:', response.status, errorData);
          alert(`Failed to add comment: ${errorData.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error adding comment:', error);
        alert('Error adding comment');
      }
    });
  });

  // Edit comment handlers
  document.querySelectorAll('.edit-comment-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const commentId = e.target.getAttribute('data-comment-id');
      const commentItem = e.target.closest('.comment-item');
      const commentText = commentItem.querySelector('.comment-text');
      const currentText = commentText.textContent;
      
      const newText = prompt('Edit comment:', currentText);
      if (newText !== null && newText.trim() !== currentText) {
        try {
          const response = await fetch(`/api/comments/${commentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment_text: newText.trim() })
          });
          
          if (response.ok) {
          // Reload the modal to show the updated comment
          const projectId = document.querySelector('.modal-overlay').getAttribute('data-project-id');
          const projectIndex = document.querySelector('.modal-overlay').getAttribute('data-project-index');
          const res = await fetch(`/api/projects/${projectId}`);
          const project = await res.json();
          document.querySelector('.modal-overlay').remove();
          showProjectInfo(project, projectIndex ? parseInt(projectIndex) : null);
          } else {
            alert('Failed to update comment');
          }
        } catch (error) {
          console.error('Error updating comment:', error);
          alert('Error updating comment');
        }
      }
    });
  });

  // Delete comment handlers
  document.querySelectorAll('.delete-comment-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const commentId = e.target.getAttribute('data-comment-id');
      
      if (!confirm('Are you sure you want to delete this comment?')) {
        return;
      }
      
      try {
        const response = await fetch(`/api/comments/${commentId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          // Reload the modal to show the updated comments
          const projectId = document.querySelector('.modal-overlay').getAttribute('data-project-id');
          const projectIndex = document.querySelector('.modal-overlay').getAttribute('data-project-index');
          const res = await fetch(`/api/projects/${projectId}`);
          const project = await res.json();
          document.querySelector('.modal-overlay').remove();
          showProjectInfo(project, projectIndex ? parseInt(projectIndex) : null);
        } else {
          alert('Failed to delete comment');
        }
      } catch (error) {
        console.error('Error deleting comment:', error);
        alert('Error deleting comment');
      }
    });
  });
}


function showProjectModal(project) {
  let html = `<div class="modal-overlay"><div class="modal edit-modal">`;
  
  // Header
  html += `<div class="modal-header">
    <h2>Edit Project</h2>
    <div class="header-actions">
      <button class="icon-btn edit-btn" title="Edit" aria-label="Edit"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
      <button class="modal-close-btn" title="Close" aria-label="Close">×</button>
    </div>
  </div>`;
  
  // Main content
  html += `<div class="modal-content">`;
  
  // Dynamic form sections will be generated here
  html += `<div id="edit-form-container"></div>`;

  // Current Media
  const hasCurrentImages = project.image_urls && project.image_urls.length > 0;
  const hasCurrentVideos = project.video_urls && project.video_urls.length > 0;
  
  if (hasCurrentImages || hasCurrentVideos) {
    html += `<div class="form-section">
      <h3>Current Media</h3>
      <div class="media-grid">`;
    
    // Display images
    if (hasCurrentImages) {
      project.image_urls.forEach((imageUrl, index) => {
        html += `<div class="media-item">
          <img src="${escapeHtml(imageUrl)}" alt="Project image ${index + 1}" />
          <button class="media-delete-btn" data-url="${escapeHtml(imageUrl)}" data-type="image" title="Remove">×</button>
        </div>`;
      });
    }
    
    // Display videos
    if (hasCurrentVideos) {
      project.video_urls.forEach((videoUrl, index) => {
        html += `<div class="media-item">
          <video controls src="${escapeHtml(videoUrl)}"></video>
          <button class="media-delete-btn" data-url="${escapeHtml(videoUrl)}" data-type="video" title="Remove">×</button>
        </div>`;
      });
    }
    
    html += `</div></div>`;
  }

  html += `</div>`; // Close modal-content
  
  // Footer with actions
  html += `<div class="modal-footer">
    <button class="btn btn-primary" id="save_project">Save Changes</button>
  </div>`;
  
  html += `</div></div>`; // Close modal
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  const modalOverlay = wrapper.firstChild;
  modalOverlay.setAttribute('data-project-id', project.id);
  document.body.appendChild(modalOverlay);
  
  // Generate dynamic form with current project data
  if (window.formGenerator) {
    window.formGenerator.generateEditForm('edit-form-container', project).then(() => {
      // Form generation completed
    }).catch(error => {
      console.error('Failed to generate edit form:', error);
    });
  }
  
  // Close modal event listener
  document.querySelector('.modal-close-btn').addEventListener('click', () => {
    document.querySelector('.modal-overlay').remove();
  });



  // Save edits
  document.getElementById('save_project').addEventListener('click', async () => {
    // Collect form data dynamically
    const payload = {};
    const formContainer = document.getElementById('edit-form-container');
    
    if (window.formGenerator && formContainer) {
      // Use form generator to collect form data
      const formData = window.formGenerator.collectFormData(formContainer);
      console.log('Collected form data:', formData);
      Object.assign(payload, formData);
    } else {
      // Fallback to manual field collection
      payload.title = document.getElementById('edit_title')?.value?.trim() || '';
      payload.student_name = document.getElementById('edit_student')?.value?.trim() || '';
      payload.year = parseInt(document.getElementById('edit_year')?.value, 10) || null;
      payload.description = document.getElementById('edit_desc')?.value?.trim() || null;
      payload.tags = document.getElementById('edit_tags')?.value?.trim() || null;
      payload.project_link = document.getElementById('edit_project_link')?.value?.trim() || null;
    }
    
    console.log('Sending payload to server:', payload);
    
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        console.error('Save failed:', response.statusText);
        return;
      }
      document.querySelector('.modal-overlay').remove();
      fetchProjects();
    } catch (error) {
      console.error('Save error:', error);
    }
  });

  // Drag and drop uploader (images)
  const zone = document.getElementById('dnd_zone');
  const input = document.getElementById('dnd_input');
  zone.addEventListener('click', () => input.click());
  ;['dragenter','dragover'].forEach(evt => zone.addEventListener(evt, (e) => { e.preventDefault(); zone.classList.add('dragover'); }));
  ;['dragleave','drop'].forEach(evt => zone.addEventListener(evt, (e) => { e.preventDefault(); zone.classList.remove('dragover'); }));
  zone.addEventListener('drop', (e) => {
    const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
    handleImageUploads(project.id, files);
  });
  input.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    handleImageUploads(project.id, files);
    input.value = '';
  });

  // Delete media handlers
  document.querySelectorAll('.media-delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const mediaUrl = btn.getAttribute('data-url');
      const mediaType = btn.getAttribute('data-type');
      if (!mediaUrl) return;
      if (!confirm('Remove this media?')) return;
      
      try {
        // Remove from array using supabaseAPI
        if (mediaType === 'image') {
          await window.supabaseAPI.removeImageFromProject(project.id, mediaUrl);
        } else if (mediaType === 'video') {
          await window.supabaseAPI.removeVideoFromProject(project.id, mediaUrl);
        }
        
        // Refresh the edit modal
        const res = await fetch(`/api/projects/${project.id}`);
        const proj = await res.json();
        document.querySelector('.modal-overlay').remove();
        showProjectModal(proj);
      } catch (error) {
        console.error('Error removing media:', error);
        alert('Failed to remove media');
      }
    });
  });


  const vinput = document.getElementById('video_input');
  vinput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      // Upload and add to video_urls array
      await window.supabaseAPI.uploadAndAddVideo(file, project.id);
      
      // Refresh the modal
      const res = await fetch(`/api/projects/${project.id}`);
      const proj = await res.json();
      document.querySelector('.modal-overlay').remove();
      showProjectModal(proj);
    } catch (error) {
      console.error('Error uploading video:', error);
      alert('Failed to upload video');
    }
  });
}

async function handleImageUploads(projectId, files) {
  try {
    for (const file of files) {
      // Upload and add to image_urls array
      await window.supabaseAPI.uploadAndAddImage(file, projectId);
    }
    
    // Refresh details view
    const res = await fetch(`/api/projects/${projectId}`);
    const proj = await res.json();
    document.querySelector('.modal-overlay').remove();
    showProjectModal(proj);
  } catch (error) {
    console.error('Error uploading images:', error);
    alert('Failed to upload images');
  }
}

function createMosaicLayout(images) {
  if (!images || images.length === 0) return '';
  
  let html = '';
  const maxImagesPerRow = window.innerWidth > 768 ? 3 : 1;
  const imageHeight = window.innerWidth > 768 ? 250 : 200;
  
  // Create rows with equal height images
  const rows = [];
  for (let i = 0; i < images.length; i += maxImagesPerRow) {
    const rowImages = images.slice(i, i + maxImagesPerRow);
    rows.push(rowImages);
  }
  
  // Generate HTML for each row
  rows.forEach((rowImages, rowIndex) => {
    html += '<div class="image-row">';
    
    rowImages.forEach((image, imageIndex) => {
      const isLastInRow = imageIndex === rowImages.length - 1;
      const isLastRow = rowIndex === rows.length - 1;
      
      html += `<img class="project-image" 
        src="/uploads/images/${encodeURIComponent(image.filename)}" 
        alt="${escapeHtml(image.original_name || '')}" 
        onclick="showLightbox('/uploads/images/${encodeURIComponent(image.filename)}')"
        style="height: ${imageHeight}px;"/>`;
    });
    
    html += '</div>';
  });
  
  return html;
}

function convertToEmbedUrl(url) {
  if (!url) return null;
  
  // YouTube URL patterns
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }
  
  // Vimeo URL patterns
  const vimeoRegex = /vimeo\.com\/(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  
  return null;
}

function showProjectInfo(project, projectIndex = null) {
  let html = `<div class="modal-overlay"><div class="modal modal-wide">
    <div class="modal-header">
      <h3>${escapeHtml(project.title)}</h3>
      <div class="header-actions">
        <button class="icon-btn edit-btn" title="Edit" aria-label="Edit"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
        <button class="modal-close-btn" title="Close" aria-label="Close">×</button>
      </div>
    </div>
    <div class="modal-content">`;
  
  // Media Section - First
  const hasImages = project.image_urls && project.image_urls.length > 0;
  const hasVideos = project.video_urls && project.video_urls.length > 0;
  
  if (hasImages || hasVideos) {
    html += `<div class="media-section">`;
    
    // Display all images from image_urls array
    if (hasImages) {
      const imageCount = project.image_urls.length;
      html += `<h4>📸 Images (${imageCount})</h4>`;
      html += `<div class="project-images">`;
      
      const maxImagesPerRow = 2;
      const imageHeight = 450;
      
      // Create rows with equal height images
      const rows = [];
      for (let i = 0; i < project.image_urls.length; i += maxImagesPerRow) {
        const rowImages = project.image_urls.slice(i, i + maxImagesPerRow);
        rows.push(rowImages);
      }
      
      // Generate HTML for each row
      rows.forEach((rowImages) => {
        html += '<div class="image-row">';
        
        rowImages.forEach((imageUrl) => {
          html += `<img class="project-image" 
            src="${escapeHtml(imageUrl)}" 
            alt="Project image" 
            onclick="showLightbox('${escapeHtml(imageUrl)}')"
            style="height: ${imageHeight}px;"/>`;
        });
        
        html += '</div>';
      });
      
      html += `</div>`;
    }
    
    // Display all videos from video_urls array
    if (hasVideos) {
      const videoCount = project.video_urls.length;
      html += `<h4>🎬 Videos (${videoCount})</h4>`;
      html += `<div class="project-images">`;
      
      project.video_urls.forEach(videoUrl => {
        html += `<video controls src="${escapeHtml(videoUrl)}"></video>`;
      });
      
      html += `</div>`;
    }
    
    html += `</div>`;
  }
  
  // Compact Project Details - All in one section
  html += `<div class="project-details-compact">`;
  
  // Basic info in a compact grid
  html += `<div class="info-grid">`;
  
  if (project.student_name) {
    html += `<div class="info-item">
      <span class="info-label">Student:</span>
      <span class="info-value">${escapeHtml(project.student_name)}</span>
    </div>`;
  }
  
  if (project.year) {
    html += `<div class="info-item">
      <span class="info-label">Year:</span>
      <span class="info-value">${project.year}</span>
    </div>`;
  }
  
  if (project.curator) {
    html += `<div class="info-item">
      <span class="info-label">Curator:</span>
      <span class="info-value curator-badge ${project.curator.toLowerCase()}">${escapeHtml(project.curator)}</span>
    </div>`;
  }
  
  if (project.interaction_type) {
    html += `<div class="info-item">
      <span class="info-label">Type:</span>
      <span class="info-value interaction-type-badge">${escapeHtml(project.interaction_type)}</span>
    </div>`;
  }
  
  if (project.phenomena) {
    html += `<div class="info-item">
      <span class="info-label">Phenomena:</span>
      <span class="info-value">${escapeHtml(project.phenomena)}</span>
    </div>`;
  }
  
  if (project.category) {
    html += `<div class="info-item">
      <span class="info-label">Category:</span>
      <span class="info-value">${escapeHtml(project.category)}</span>
    </div>`;
  }
  
  if (project.difficulty) {
    html += `<div class="info-item">
      <span class="info-label">Difficulty:</span>
      <span class="info-value">${escapeHtml(project.difficulty)}</span>
    </div>`;
  }
  
  if (project.duration) {
    html += `<div class="info-item">
      <span class="info-label">Duration:</span>
      <span class="info-value">${escapeHtml(project.duration)}</span>
    </div>`;
  }
  
  html += `</div>`;
  
  // Tags
  if (project.tags && project.tags !== '0' && project.tags.trim() !== '0') {
    html += `<div class="tags-section">
      <div class="project-tags">${project.tags.split(',').map(tag => 
        `<span class="tag">${escapeHtml(tag.trim())}</span>`
      ).join('')}</div>
    </div>`;
  }
  
  // Rating
  html += `<div class="rating-section">`;
  if (project.rating && project.rating > 0) {
    const starsHtml = Array.from({length: 3}, (_, i) => 
      `<span class="star ${i < project.rating ? 'active' : ''}" data-rating="${i + 1}">★</span>`
    ).join('');
    html += `<div class="rating-stars">${starsHtml}</div>`;
  } else {
    html += `<div class="rating-stars">
      <span class="star" data-rating="1">★</span>
      <span class="star" data-rating="2">★</span>
      <span class="star" data-rating="3">★</span>
    </div>`;
  }
  html += `</div>`;
  
  // Description
  if (project.description) {
    html += `<div class="description-section">
      <div class="project-description">${escapeHtml(project.description)}</div>
    </div>`;
  }
  
  // Links
  if (project.project_link || project.github_repo || project.documentation) {
    html += `<div class="links-section">`;
    
    if (project.project_link) {
      html += `<a href="${escapeHtml(project.project_link)}" target="_blank" rel="noopener noreferrer" class="project-link">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
        </svg>
        Visit Project
      </a>`;
    }
    
    if (project.github_repo) {
      html += `<a href="${escapeHtml(project.github_repo)}" target="_blank" rel="noopener noreferrer" class="project-link">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
        </svg>
        View Code
      </a>`;
    }
    
    if (project.documentation) {
      html += `<a href="${escapeHtml(project.documentation)}" target="_blank" rel="noopener noreferrer" class="project-link">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14,2 14,8 20,8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10,9 9,9 8,9"></polyline>
        </svg>
        View Docs
      </a>`;
    }
    
    html += `</div>`;
  }
  
  // Feedback
  if (project.feedback) {
    html += `<div class="feedback-section">
      <div class="project-feedback">${escapeHtml(project.feedback)}</div>
    </div>`;
  }
  
  html += `</div>`; // Close project-details-compact
  
  // Comments Section
  html += `<div class="project-comments-section">
    <h4>Comments for "${escapeHtml(project.title)}"</h4>
    <div class="comment-section" id="comment-section-${project.id}">
      <!-- Dynamic comment form will be generated here -->
    </div>
  </div>`;
  
  html += '</div>'; // Close modal-content
  html += '<div class="modal-footer">'
      + '<button class="icon-btn delete-btn" title="Delete" aria-label="Delete"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"></polyline><path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>'
       + '</div></div></div>';
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  const modalOverlay = wrapper.firstChild;
  document.body.appendChild(modalOverlay);
  
  // Add navigation info to modal
  modalOverlay.setAttribute('data-project-id', project.id);
  modalOverlay.setAttribute('data-project-index', projectIndex);
  
  // Event listeners
  modalOverlay.querySelector('.modal-close-btn').addEventListener('click', () => modalOverlay.remove());
  
  // Close modal when clicking outside (on overlay)
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.remove();
    }
  });
  
  modalOverlay.querySelector('.edit-btn').addEventListener('click', () => {
    modalOverlay.remove();
    showProjectModal(project);
  });
  
  const deleteBtn = modalOverlay.querySelector('.delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Delete this project?')) return;
      await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
      modalOverlay.remove();
      fetchProjects();
    });
  }
  
  // Star rating functionality
  const stars = modalOverlay.querySelectorAll('.rating-stars .star');
  stars.forEach(star => {
    star.addEventListener('click', async () => {
      const rating = parseInt(star.dataset.rating);
      
      // Update visual state
      stars.forEach((s, index) => {
        s.classList.toggle('active', index < rating);
      });
      
      // Update project data
      project.rating = rating;
      
      // Save to database
      try {
        await fetch(`/api/projects/${project.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: project.title,
            student_name: project.student_name,
            year: project.year,
            description: project.description,
            tags: project.tags,
            rating: rating
          }),
        });
        
        // Refresh the gallery to show updated rating
        fetchProjects();
      } catch (error) {
        console.error('Failed to update rating:', error);
        // Revert visual state on error
        stars.forEach((s, index) => {
          s.classList.toggle('active', index < (project.rating || 0));
        });
      }
    });
  });
  
  // Generate dynamic comment form
  if (window.formGenerator && window.formGenerator.commentTypes) {
    window.formGenerator.generateCommentSection(`comment-section-${project.id}`, project.id);
    
    // Add existing comments to the comments list
    const commentsList = document.querySelector(`#comment-section-${project.id} .comments-list`);
    if (commentsList && project.comments) {
      commentsList.innerHTML = renderComments(project.comments);
    }
  }
  
  // Comment handlers
  setupCommentHandlers();
  
  // Keyboard navigation
  const handleKeydown = (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      navigateToProject(e.key === 'ArrowLeft' ? -1 : 1);
    } else if (e.key === 'Escape') {
      modalOverlay.remove();
    }
  };
  
  document.addEventListener('keydown', handleKeydown);
  
  // Clean up event listener when modal is closed
  const originalRemove = modalOverlay.remove;
  modalOverlay.remove = function() {
    document.removeEventListener('keydown', handleKeydown);
    originalRemove.call(this);
  };
}

async function navigateToProject(direction) {
  const currentModal = document.querySelector('.modal-overlay');
  if (!currentModal) return;
  
  const currentIndex = parseInt(currentModal.getAttribute('data-project-index'));
  if (currentIndex === null) return;
  
  // Get the current project list (either filtered or all projects)
  const currentProjects = state.randomMode ? 
    state.allProjects.filter(() => Math.random() < 0.1).slice(0, 5) : 
    state.allProjects;
    
  const newIndex = currentIndex + direction;
  
  if (newIndex >= 0 && newIndex < currentProjects.length) {
    const nextProjectId = currentProjects[newIndex].id;
    // Fetch full project data with media
    const res = await fetch(`/api/projects/${nextProjectId}`);
    const nextProject = await res.json();
    currentModal.remove();
    showProjectInfo(nextProject, newIndex);
  }
}

function showLightbox(src) {
  const wrap = document.createElement('div');
  wrap.className = 'lightbox';
  wrap.innerHTML = `<img src="${src}" alt="image" />`;
  wrap.addEventListener('click', () => wrap.remove());
  document.body.appendChild(wrap);
}

window.addEventListener('DOMContentLoaded', async () => {
  console.log('DOMContentLoaded - setting up app');
  
  // Load configuration first
  await window.formGenerator.loadConfig();
  
  setupSort();
  setupFilters();
  setupCreate();
  setupAdmin();
  console.log('About to call fetchProjects on page load');
  fetchProjects();
});

function setupAdmin() {
  const adminToggle = document.getElementById('adminToggle');
  const adminModal = document.getElementById('adminModal');
  const adminCloseBtn = document.querySelector('.admin-close-btn');
  const adminLoginBtn = document.getElementById('adminLoginBtn');
  const adminPin = document.getElementById('adminPin');
  const adminError = document.getElementById('adminError');
  const adminLogin = document.getElementById('adminLogin');
  const adminContent = document.getElementById('adminContent');

  // Open admin modal
  adminToggle.addEventListener('click', () => {
    adminModal.style.display = 'flex';
    adminLogin.style.display = 'flex';
    adminContent.style.display = 'none';
    adminError.style.display = 'none';
    adminPin.value = '';
    adminPin.focus();
  });

  // Close admin modal
  adminCloseBtn.addEventListener('click', () => {
    adminModal.style.display = 'none';
  });

  // Close modal when clicking outside
  adminModal.addEventListener('click', (e) => {
    if (e.target === adminModal) {
      adminModal.style.display = 'none';
    }
  });

  // Handle PIN input
  adminPin.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleAdminLogin();
    }
  });

  // Handle login button
  adminLoginBtn.addEventListener('click', handleAdminLogin);

  function handleAdminLogin() {
    const pin = adminPin.value.trim();
    
    if (pin === '1234') {
      adminLogin.style.display = 'none';
      adminContent.style.display = 'flex';
      adminError.style.display = 'none';
      loadAdminData();
    } else {
      adminError.style.display = 'block';
      adminPin.value = '';
      adminPin.focus();
    }
  }

  async function loadAdminData() {
    try {
      const response = await fetch('/api/projects');
      const projects = await response.json();
      
      // Update statistics
      const totalProjects = projects.length;
      const totalImages = projects.reduce((sum, p) => sum + (p.image_count || 0), 0);
      const totalVideos = projects.reduce((sum, p) => sum + (p.video_count || 0), 0);
      const ratedProjects = projects.filter(p => p.rating && p.rating > 0).length;
      
      document.getElementById('totalProjects').textContent = totalProjects;
      document.getElementById('totalImages').textContent = totalImages;
      document.getElementById('totalVideos').textContent = totalVideos;
      document.getElementById('ratedProjects').textContent = ratedProjects;
      
      // Populate table
      const tableBody = document.getElementById('adminTableBody');
      tableBody.innerHTML = '';
      
      projects.forEach(project => {
        const row = document.createElement('tr');
        
        // Rating display
        const ratingHtml = project.rating && project.rating > 0 
          ? Array.from({length: 3}, (_, i) => 
              `<span class="star ${i < project.rating ? 'active' : ''}">★</span>`
            ).join('')
          : '<span style="color: #6c757d;">-</span>';
        
        // Tags display
        const tagsDisplay = project.tags 
          ? `<div class="tags-display">${escapeHtml(project.tags)}</div>`
          : '<span style="color: #6c757d;">-</span>';
        
        // Description display
        const descriptionDisplay = project.description
          ? `<div class="description-display">${escapeHtml(project.description)}</div>`
          : '<span style="color: #6c757d;">-</span>';
        
        // Media count
        const mediaCount = (project.image_count || 0) + (project.video_count || 0);
        
        // Created date
        const createdDate = project.created_at 
          ? new Date(project.created_at).toLocaleDateString()
          : '-';
        
        // Interaction type display
        const interactionTypeDisplay = project.interaction_type 
          ? `<span style="background: #e3f2fd; color: #1976d2; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${escapeHtml(project.interaction_type)}</span>`
          : '<span style="color: #6c757d;">-</span>';
        
        // Phenomena display
        const phenomenaDisplay = project.phenomena 
          ? `<div style="font-size: 12px; color: #495057; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(project.phenomena)}</div>`
          : '<span style="color: #6c757d;">-</span>';

        row.innerHTML = `
          <td>${project.id}</td>
          <td class="editable" data-field="title" data-project-id="${project.id}">${escapeHtml(project.title)}</td>
          <td class="editable" data-field="student_name" data-project-id="${project.id}">${escapeHtml(project.student_name)}</td>
          <td class="editable" data-field="year" data-project-id="${project.id}">${project.year || '-'}</td>
          <td class="editable" data-field="rating" data-project-id="${project.id}"><div class="rating-display">${ratingHtml}</div></td>
          <td class="editable" data-field="interaction_type" data-project-id="${project.id}">${interactionTypeDisplay}</td>
          <td class="editable" data-field="phenomena" data-project-id="${project.id}">${phenomenaDisplay}</td>
          <td class="editable" data-field="tags" data-project-id="${project.id}">${tagsDisplay}</td>
          <td class="editable" data-field="description" data-project-id="${project.id}">${descriptionDisplay}</td>
          <td>${mediaCount}</td>
          <td>${createdDate}</td>
        `;
        
        tableBody.appendChild(row);
      });
      
      // Add event listeners for editable cells
      setupEditableCells();
      
    } catch (error) {
      console.error('Failed to load admin data:', error);
    }
  }

  function setupEditableCells() {
    const editableCells = document.querySelectorAll('.admin-table td.editable');
    
    editableCells.forEach(cell => {
      cell.addEventListener('click', () => {
        if (cell.classList.contains('editing')) return;
        
        const field = cell.dataset.field;
        const projectId = cell.dataset.projectId;
        const currentValue = cell.textContent.trim();
        
        startEdit(cell, field, projectId, currentValue);
      });
    });
  }

  function startEdit(cell, field, projectId, currentValue) {
    cell.classList.add('editing');
    const originalValue = currentValue;
    
    let input;
    
    if (field === 'rating') {
      // Special handling for rating - create star selector
      input = document.createElement('div');
      input.innerHTML = `
        <select style="width: 100%; border: none; padding: 8px; font-size: 14px; background: white; outline: 2px solid #007bff;">
          <option value="0" ${currentValue === '-' ? 'selected' : ''}>No Rating</option>
          <option value="1" ${currentValue.includes('★') && !currentValue.includes('★★') && !currentValue.includes('★★★') ? 'selected' : ''}>1 Star</option>
          <option value="2" ${currentValue.includes('★★') && !currentValue.includes('★★★') ? 'selected' : ''}>2 Stars</option>
          <option value="3" ${currentValue.includes('★★★') ? 'selected' : ''}>3 Stars</option>
        </select>
      `;
    } else if (field === 'interaction_type') {
      // Special handling for interaction type - create dropdown
      input = document.createElement('div');
      input.innerHTML = `
        <select style="width: 100%; border: none; padding: 8px; font-size: 14px; background: white; outline: 2px solid #007bff;">
          <option value="" ${currentValue === '-' ? 'selected' : ''}>Select Type</option>
          <option value="Hybrid" ${currentValue.includes('Hybrid') ? 'selected' : ''}>Hybrid</option>
          <option value="Hands-on" ${currentValue.includes('Hands-on') ? 'selected' : ''}>Hands-on</option>
          <option value="Static" ${currentValue.includes('Static') ? 'selected' : ''}>Static</option>
        </select>
      `;
    } else if (field === 'description') {
      input = document.createElement('textarea');
      input.value = currentValue === '-' ? '' : currentValue;
      input.placeholder = 'Enter description...';
    } else if (field === 'year') {
      input = document.createElement('input');
      input.type = 'number';
      input.value = currentValue === '-' ? '' : currentValue;
      input.placeholder = 'Year';
    } else {
      input = document.createElement('input');
      input.type = 'text';
      input.value = currentValue === '-' ? '' : currentValue;
      input.placeholder = `Enter ${field.replace('_', ' ')}...`;
    }
    
    const controls = document.createElement('div');
    controls.className = 'edit-controls';
    controls.innerHTML = `
      <button class="edit-btn-small">Save</button>
      <button class="cancel-btn-small">Cancel</button>
    `;
    
    cell.innerHTML = '';
    cell.appendChild(input);
    cell.appendChild(controls);
    
    // Focus the input
    const inputElement = input.querySelector ? input.querySelector('select') : input;
    inputElement.focus();
    
    // Save button
    controls.querySelector('.edit-btn-small').addEventListener('click', () => {
      const newValue = inputElement.value;
      saveEdit(cell, field, projectId, newValue, originalValue);
    });
    
    // Cancel button
    controls.querySelector('.cancel-btn-small').addEventListener('click', () => {
      cancelEdit(cell, originalValue);
    });
    
    // Enter key to save
    inputElement.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const newValue = inputElement.value;
        saveEdit(cell, field, projectId, newValue, originalValue);
      }
    });
    
    // Escape key to cancel
    inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        cancelEdit(cell, originalValue);
      }
    });
  }

  async function saveEdit(cell, field, projectId, newValue, originalValue) {
    try {
      // Prepare update data
      const updateData = {};
      updateData[field] = field === 'year' ? (newValue ? parseInt(newValue) : null) : newValue;
      
      // Send update to server
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      
      if (response.ok) {
        // Update the cell display
        updateCellDisplay(cell, field, newValue);
        cell.classList.remove('editing');
        
        // Refresh the main gallery if needed
        fetchProjects();
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      console.error('Failed to save edit:', error);
      alert('Failed to save changes. Please try again.');
      cancelEdit(cell, originalValue);
    }
  }

  function cancelEdit(cell, originalValue) {
    cell.classList.remove('editing');
    updateCellDisplay(cell, cell.dataset.field, originalValue);
  }

  function updateCellDisplay(cell, field, value) {
    if (field === 'rating') {
      const rating = parseInt(value);
      const ratingHtml = rating > 0 
        ? Array.from({length: 3}, (_, i) => 
            `<span class="star ${i < rating ? 'active' : ''}">★</span>`
          ).join('')
        : '<span style="color: #6c757d;">-</span>';
      cell.innerHTML = `<div class="rating-display">${ratingHtml}</div>`;
    } else if (field === 'interaction_type') {
      const interactionTypeDisplay = value 
        ? `<span style="background: #e3f2fd; color: #1976d2; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${escapeHtml(value)}</span>`
        : '<span style="color: #6c757d;">-</span>';
      cell.innerHTML = interactionTypeDisplay;
    } else if (field === 'phenomena') {
      const phenomenaDisplay = value
        ? `<div style="font-size: 12px; color: #495057; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(value)}</div>`
        : '<span style="color: #6c757d;">-</span>';
      cell.innerHTML = phenomenaDisplay;
    } else if (field === 'tags') {
      const tagsDisplay = value 
        ? `<div class="tags-display">${escapeHtml(value)}</div>`
        : '<span style="color: #6c757d;">-</span>';
      cell.innerHTML = tagsDisplay;
    } else if (field === 'description') {
      const descriptionDisplay = value
        ? `<div class="description-display">${escapeHtml(value)}</div>`
        : '<span style="color: #6c757d;">-</span>';
      cell.innerHTML = descriptionDisplay;
    } else {
      cell.textContent = value || '-';
    }
  }
}


