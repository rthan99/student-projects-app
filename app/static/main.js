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
  const category = document.getElementById('category').value.trim();
  const year = document.getElementById('year').value.trim();
  const rating = document.getElementById('rating').value.trim();
  if (q) params.set('q', q);
  if (category) params.set('category', category);
  if (year) params.set('year', year);
  if (rating) params.set('rating', rating);
  params.set('sort', state.sort);
  params.set('order', state.order);
  
  console.log('Filter params:', { q, category, year, rating, sort: state.sort, order: state.order });
  console.log('API URL:', `/api/projects?${params.toString()}`);
  
  const res = await fetch(`/api/projects?${params.toString()}`);
  const data = await res.json();
  console.log('Received', data.length, 'projects');
  
  // Store filtered results for display
  const filteredData = data;
  
  // If we don't have all projects yet, fetch them for filter population
  if (!state.allProjects || state.allProjects.length === 0) {
    const allRes = await fetch('/api/projects');
    state.allProjects = await allRes.json();
    console.log('Fetched all projects for filters:', state.allProjects.length);
  }
  
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
    
    card.innerHTML = `
      ${mediaWithRating}
      <div class="card-title">${escapeHtml(row.title)}</div>
      <div class="card-meta">
        ${row.category ? `<span>${escapeHtml(row.category)}</span>` : ''}
        ${row.year ? `<span>${row.year}${(row.video_count > 0 || row.video_url) ? ' 🎥' : ''}</span>` : ''}
      </div>
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
  
  document.getElementById('applyFilters').addEventListener('click', () => {
    state.randomMode = false;
    const randomBtn = document.getElementById('randomProjects');
    randomBtn.textContent = '🎲 Show me 4 random projects';
    randomBtn.classList.remove('showing-all');
    fetchProjects();
  });
  
  document.getElementById('clearFilters').addEventListener('click', () => {
    document.getElementById('search').value = '';
    document.getElementById('category').value = '';
    document.getElementById('year').value = '';
    document.getElementById('rating').value = '';
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

  document.getElementById('category').addEventListener('change', () => {
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

  document.getElementById('rating').addEventListener('change', () => {
    state.randomMode = false;
    const randomBtn = document.getElementById('randomProjects');
    randomBtn.textContent = '🎲 Show me 4 random projects';
    randomBtn.classList.remove('showing-all');
    fetchProjects();
  });
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
  const catSel = document.getElementById('category');
  if (!yearSel || !catSel) return;
  const prevYear = yearSel.value;
  const prevCat = catSel.value;

  const years = Array.from(new Set(rows.map(r => r.year).filter(Boolean))).sort();
  
  // Split comma-separated categories and flatten them
  const allCategories = rows
    .map(r => r.category)
    .filter(Boolean)
    .flatMap(category => category.split(',').map(cat => cat.trim()))
    .filter(Boolean);
  
  const cats = Array.from(new Set(allCategories)).sort((a,b)=>a.localeCompare(b));

  yearSel.innerHTML = '<option value="">All Years</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
  catSel.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');

  if (prevYear && years.includes(Number(prevYear))) yearSel.value = prevYear;
  if (prevCat && cats.includes(prevCat)) catSel.value = prevCat;
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
  
  // Initial state
  updateButtonState();
  
  createBtn.addEventListener('click', async () => {
    const title = titleInput.value.trim();
    if (!title) {
      alert('Title is required');
      return;
    }
    
    const form = new FormData();
    form.append('title', title);
    form.append('student_name', 'NEMO x Delft');
    
    // Only add fields that exist in the HTML
    const category = document.getElementById('new_category').value.trim();
    const year = parseInt(document.getElementById('new_year').value, 10);
    const description = document.getElementById('new_desc').value.trim();
    const videoUrl = document.getElementById('new_video_url').value.trim();
    const imgInput = document.getElementById('new_image');
    const vidInput = document.getElementById('new_video');
    
    if (category) form.append('category', category);
    if (!Number.isNaN(year)) form.append('year', String(year));
    if (description) form.append('description', description);
    if (videoUrl) form.append('video_url', videoUrl);
    if (selectedRating > 0) form.append('rating', String(selectedRating));
    if (imgInput?.files?.[0]) form.append('image', imgInput.files[0]);
    if (vidInput?.files?.[0]) form.append('video', vidInput.files[0]);

    const res = await fetch('/api/projects', { method: 'POST', body: form });
    if (res.ok) {
      const result = await res.json();
      showCreateNotice(result);
      // Clear only the fields that exist
      titleInput.value = '';
      document.getElementById('new_category').value = '';
      document.getElementById('new_year').value = '';
      document.getElementById('new_desc').value = '';
      document.getElementById('new_video_url').value = '';
      imgInput.value = '';
      vidInput.value = '';
      // Clear rating
      selectedRating = 0;
      createRating.querySelectorAll('.star').forEach(star => star.classList.remove('active'));
      updateButtonState();
      fetchProjects();
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to create');
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

function showProjectModal(project) {
  let html = `<div class="modal-overlay"><div class="modal">`;
  html += `<div class="form-grid">
    <label>Title <input id="edit_title" value="${escapeHtml(project.title)}" /></label>
    <label>Student <input id="edit_student" value="${escapeHtml(project.student_name)}" /></label>
    <label>Category <input id="edit_category" value="${escapeHtml(project.category || '')}" /></label>
    <label>Year <input id="edit_year" type="number" value="${project.year ?? ''}" /></label>
    <label>Tags <input id="edit_tags" value="${escapeHtml(project.tags || '')}" placeholder="comma,separated" /></label>
    <label>Description <textarea id="edit_desc">${escapeHtml(project.description || '')}</textarea></label>
    <label>YouTube/Vimeo URL <input id="edit_video_url" value="${escapeHtml(project.video_url || '')}" placeholder="https://youtube.com/watch?v=..." /></label>
    <div class="rating-input">
      <label>Rating:</label>
      <div class="star-rating" id="edit_rating">
        <span class="star" data-rating="1">★</span>
        <span class="star" data-rating="2">★</span>
        <span class="star" data-rating="3">★</span>
      </div>
      <button type="button" id="clear_rating" class="clear-rating-btn">Clear Rating</button>
    </div>
  </div>`;

  html += '<div class="dnd-zone" id="dnd_zone">'
       + '<p>Drag & drop images here or click to select</p>'
       + '<input type="file" id="dnd_input" accept="image/*" multiple style="display:none" />'
       + '</div>';

  html += '<div class="uploader-row">'
       + '<label>Upload Video (MP4 or MOV): <input type="file" id="video_input" accept=".mp4,.mov,video/mp4,video/quicktime" /></label>'
       + '</div>';

  if (project.media?.length) {
    html += '<div class="media-grid">';
    for (const m of project.media) {
      if (m.media_type === 'image') {
        html += `<div class="media-item"><img src="/uploads/images/${encodeURIComponent(m.filename)}" alt="${escapeHtml(m.original_name || '')}" /><button class="icon-btn del-media" data-id="${m.id}" title="Remove">🗑️</button></div>`;
      } else {
        html += `<div class="media-item"><video controls src="/uploads/videos/${encodeURIComponent(m.filename)}"></video><button class="icon-btn del-media" data-id="${m.id}" title="Remove">🗑️</button></div>`;
      }
    }
    html += '</div>';
  }
  html += '<div class="modal-actions"><button id="save_project">Save</button><button class="close-modal">Close</button></div></div></div>';
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper.firstChild);
  document.querySelector('.close-modal').addEventListener('click', () => {
    document.querySelector('.modal-overlay').remove();
  });

  // Setup star rating for edit modal
  const editRating = document.getElementById('edit_rating');
  let selectedEditRating = project.rating || 0;
  
  if (editRating) {
    // Set initial rating
    editRating.querySelectorAll('.star').forEach((star, index) => {
      star.classList.toggle('active', index < selectedEditRating);
    });
    
    editRating.addEventListener('click', (e) => {
      if (e.target.classList.contains('star')) {
        selectedEditRating = parseInt(e.target.dataset.rating);
        // Update all stars
        editRating.querySelectorAll('.star').forEach((star, index) => {
          star.classList.toggle('active', index < selectedEditRating);
        });
      }
    });
  }

  // Setup clear rating button
  const clearRatingBtn = document.getElementById('clear_rating');
  if (clearRatingBtn) {
    clearRatingBtn.addEventListener('click', () => {
      selectedEditRating = 0;
      editRating.querySelectorAll('.star').forEach(star => {
        star.classList.remove('active');
      });
    });
  }

  // Save edits
  document.getElementById('save_project').addEventListener('click', async () => {
    const payload = {
      title: document.getElementById('edit_title').value.trim(),
      student_name: document.getElementById('edit_student').value.trim(),
      category: document.getElementById('edit_category').value.trim() || null,
      year: parseInt(document.getElementById('edit_year').value, 10) || null,
      description: document.getElementById('edit_desc').value.trim() || null,
      tags: document.getElementById('edit_tags').value.trim(),
      video_url: document.getElementById('edit_video_url').value.trim() || null,
      rating: selectedEditRating,
    };
    await fetch(`/api/projects/${project.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    document.querySelector('.modal-overlay').remove();
    fetchProjects();
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
  document.querySelectorAll('.del-media').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const mid = btn.getAttribute('data-id');
      if (!mid) return;
      if (!confirm('Remove this media?')) return;
      await fetch(`/api/media/${mid}`, { method: 'DELETE' });
      const res = await fetch(`/api/projects/${project.id}`);
      const proj = await res.json();
      document.querySelector('.modal-overlay').remove();
      showProjectModal(proj);
    });
  });

  const vinput = document.getElementById('video_input');
  vinput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    await fetch(`/api/projects/${project.id}/upload/video`, { method: 'POST', body: form });
    const res = await fetch(`/api/projects/${project.id}`);
    const proj = await res.json();
    document.querySelector('.modal-overlay').remove();
    showProjectModal(proj);
  });
}

async function handleImageUploads(projectId, files) {
  for (const file of files) {
    const form = new FormData();
    form.append('file', file);
    await fetch(`/api/projects/${projectId}/upload/image`, { method: 'POST', body: form });
  }
  // refresh details view
  const res = await fetch(`/api/projects/${projectId}`);
  const proj = await res.json();
  document.querySelector('.modal-overlay').remove();
  showProjectModal(proj);
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
  let html = `<div class="modal-overlay"><div class="modal">
    <button class="modal-close-btn" title="Close" aria-label="Close">×</button>`;
  
  // Project information first
  html += `<h3>${escapeHtml(project.title)}</h3>`;
  const meta = [];
  if (project.category) meta.push(escapeHtml(project.category));
  if (project.year) meta.push(String(project.year));
  if (meta.length) html += `<p><em>${meta.join(' • ')}</em></p>`;
  if (project.description) html += `<p>${escapeHtml(project.description)}</p>`;
  
  // Then images
  if (project.media?.length) {
    const images = project.media.filter(m => m.media_type === 'image');
    if (images.length > 0) {
      html += `<div class="project-images">`;
      images.forEach(image => {
        html += `<img style="width:100%;max-height:60vh;object-fit:cover;border-radius:8px;border:1px solid #ddd;cursor:zoom-in;margin-bottom:12px;" src="/uploads/images/${encodeURIComponent(image.filename)}" alt="${escapeHtml(image.original_name || '')}" onclick="showLightbox('/uploads/images/${encodeURIComponent(image.filename)}')"/>`;
      });
      html += `</div>`;
    }
  }
  
  // Then videos - check for embedded video URL first, then uploaded videos
  if (project.video_url) {
    const embedUrl = convertToEmbedUrl(project.video_url);
    if (embedUrl) {
      html += `<iframe src="${embedUrl}" style="width:100%;height:400px;margin-top:8px;border-radius:8px;border:1px solid #ddd;" frameborder="0" allowfullscreen></iframe>`;
    }
  } else {
    const firstVideo = project.media?.find(m => m.media_type === 'video');
    if (firstVideo) {
      html += `<video controls style="width:100%;margin-top:8px;border-radius:8px;border:1px solid #ddd;" src="/uploads/videos/${encodeURIComponent(firstVideo.filename)}"></video>`;
    }
  }
  html += '<div class="modal-actions">'
       + '<button class="icon-btn edit-btn" title="Edit" aria-label="Edit">✏️</button>'
       + '<button class="icon-btn delete-btn" title="Delete" aria-label="Delete">🗑️</button>'
       + '<button class="close-modal">Close</button>'
       + '</div></div></div>';
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  const modalOverlay = wrapper.firstChild;
  document.body.appendChild(modalOverlay);
  
  // Add navigation info to modal
  modalOverlay.setAttribute('data-project-id', project.id);
  modalOverlay.setAttribute('data-project-index', projectIndex);
  
  // Event listeners
  document.querySelector('.modal-close-btn').addEventListener('click', () => modalOverlay.remove());
  document.querySelector('.close-modal').addEventListener('click', () => modalOverlay.remove());
  
  // Close modal when clicking outside (on overlay)
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.remove();
    }
  });
  
  document.querySelector('.edit-btn').addEventListener('click', () => {
    modalOverlay.remove();
    showProjectModal(project);
  });
  document.querySelector('.delete-btn').addEventListener('click', async () => {
    if (!confirm('Delete this project?')) return;
    await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
    modalOverlay.remove();
    fetchProjects();
  });
  
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

window.addEventListener('DOMContentLoaded', () => {
  setupSort();
  setupFilters();
  setupCreate();
  fetchProjects();
});


