/**
 * Dynamic Form Generator
 * Generates forms based on configuration from the backend
 */

class DynamicFormGenerator {
    constructor() {
        this.fieldConfig = null;
        this.commentTypes = null;
        this.tagCategories = null;
    }

    async loadConfig(forEdit = false) {
        try {
            const fieldsUrl = forEdit ? '/api/config/fields?for_edit=true' : '/api/config/fields';
            const [fieldsResponse, commentTypesResponse, tagCategoriesResponse] = await Promise.all([
                fetch(fieldsUrl),
                fetch('/api/config/comment-types'),
                fetch('/api/config/tag-categories')
            ]);

            this.fieldConfig = await fieldsResponse.json();
            this.commentTypes = await commentTypesResponse.json();
            this.tagCategories = await tagCategoriesResponse.json();
        } catch (error) {
            console.error('Failed to load configuration:', error);
        }
    }

    generateProjectForm(containerId, formData = {}) {
        if (!this.fieldConfig) {
            console.error('Field configuration not loaded');
            return;
        }

        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        container.innerHTML = '';

        // Generate sections
        const sections = Object.keys(this.fieldConfig);

        sections.forEach(sectionName => {
            const section = this.fieldConfig[sectionName];
            const sectionElement = this.createSection(section, formData);
            container.appendChild(sectionElement);
        });
    }

    async generateEditForm(containerId, projectData = {}) {
        // Load edit configuration
        await this.loadConfig(true);
        
        if (!this.fieldConfig) {
            console.error('Field configuration not loaded');
            return;
        }

        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        container.innerHTML = '';

        // Generate sections with existing project data
        const sections = Object.keys(this.fieldConfig);

        sections.forEach(sectionName => {
            // Handle media section specially - include video URL and upload functionality
            if (sectionName === 'media') {
                const section = this.fieldConfig[sectionName];
                const sectionElement = this.createCombinedMediaSection(section, projectData, sectionName);
                container.appendChild(sectionElement);
                return;
            }
            
            const section = this.fieldConfig[sectionName];
            const sectionElement = this.createSection(section, projectData);
            container.appendChild(sectionElement);
        });

        // Add existing media section
        this.addExistingMediaSection(container, projectData);
        
        // Setup drag and drop functionality
        this.setupDragAndDrop();
    }

    createCombinedMediaSection(section, formData, sectionName) {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'form-section';
        sectionDiv.setAttribute('data-section', section.name);

        // Section header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'section-header';
        headerDiv.innerHTML = `
            <h3>${section.title}</h3>
            <p class="section-description">${section.description}</p>
        `;
        sectionDiv.appendChild(headerDiv);

        // Fields container for video URL
        const fieldsContainer = document.createElement('div');
        fieldsContainer.className = 'form-fields';

        // Get fields for this section, excluding file upload fields
        const fields = this.fieldConfig[sectionName].fields.filter(field => 
            field.type !== 'file' && field.name !== 'cover_image' && field.name !== 'video_file'
        );

        fields.forEach(field => {
            const value = formData[field.name];
            const fieldElement = this.createField(field, value);
            fieldsContainer.appendChild(fieldElement);
        });

        sectionDiv.appendChild(fieldsContainer);

        // Add upload area
        const uploadArea = document.createElement('div');
        uploadArea.className = 'media-upload-area';
        uploadArea.innerHTML = `
            <div class="dnd-zone" id="dnd_zone">
                <div class="dnd-content">
                    <div class="dnd-icon">📷🎥</div>
                    <p class="dnd-text">Drop images and videos here or click to browse</p>
                    <p class="dnd-subtext">Supports JPG, PNG, WebP, MP4, MOV</p>
                </div>
                <input type="file" id="dnd_input" accept="image/*,video/*" multiple style="display:none" />
            </div>
            <div class="video-upload">
                <label class="video-upload-label">
                    <span class="video-icon">🎥</span>
                    <span class="video-text">Upload Video</span>
                    <input type="file" id="video_input" accept=".mp4,.mov,video/mp4,video/quicktime" />
                </label>
            </div>
        `;
        sectionDiv.appendChild(uploadArea);

        return sectionDiv;
    }

    createSection(section, formData) {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'form-section';
        sectionDiv.setAttribute('data-section', section.name);

        // Section header
        const header = document.createElement('div');
        header.className = 'section-header';
        header.innerHTML = `
            <h3>${section.title}</h3>
            ${section.description ? `<p class="section-description">${section.description}</p>` : ''}
        `;
        sectionDiv.appendChild(header);

        // Fields container
        const fieldsContainer = document.createElement('div');
        fieldsContainer.className = 'fields-container';

        // Generate fields (sort by display_order)
        const sortedFields = section.fields.sort((a, b) => a.display_order - b.display_order);
        sortedFields.forEach(field => {
            const value = formData[field.name];
            if (field.name === 'curator') {
                console.log('Curator field:', field, 'Value:', value, 'FormData:', formData);
            }
            const fieldElement = this.createField(field, value);
            fieldsContainer.appendChild(fieldElement);
        });

        sectionDiv.appendChild(fieldsContainer);
        return sectionDiv;
    }

    createField(field, value = '') {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'form-group';
        fieldDiv.setAttribute('data-field', field.name);

        // Label
        const label = document.createElement('label');
        label.setAttribute('for', `edit_${field.name}`);
        label.className = 'form-label';
        label.textContent = field.label;
        if (field.required) {
            label.classList.add('required');
            label.innerHTML += ' <span class="required-asterisk">*</span>';
        }
        fieldDiv.appendChild(label);

        // Input element
        const input = this.createInput(field, value);
        fieldDiv.appendChild(input);

        // Validation message container
        const validationDiv = document.createElement('div');
        validationDiv.className = 'validation-message';
        validationDiv.style.display = 'none';
        fieldDiv.appendChild(validationDiv);

        return fieldDiv;
    }

    createInput(field, value) {
        let input;

        switch (field.type) {
            case 'text':
            case 'email':
            case 'url':
            case 'number':
                input = document.createElement('input');
                input.type = field.type;
                input.id = `edit_${field.name}`;
                input.name = field.name;
                input.value = value;
                if (field.placeholder) input.placeholder = field.placeholder;
                if (field.validation) {
                    if (field.validation.min) input.min = field.validation.min;
                    if (field.validation.max) input.max = field.validation.max;
                }
                break;

            case 'textarea':
                input = document.createElement('textarea');
                input.id = `edit_${field.name}`;
                input.name = field.name;
                input.value = value;
                input.rows = 3;
                if (field.placeholder) input.placeholder = field.placeholder;
                break;

            case 'select':
                input = document.createElement('select');
                input.id = `edit_${field.name}`;
                input.name = field.name;
                
                // Add empty option
                const emptyOption = document.createElement('option');
                emptyOption.value = '';
                emptyOption.textContent = `Select ${field.label.toLowerCase()}...`;
                input.appendChild(emptyOption);

                // Add options
                if (field.options) {
                    field.options.forEach(option => {
                        const optionElement = document.createElement('option');
                        optionElement.value = option;
                        optionElement.textContent = option;
                        if (value === option) {
                            optionElement.selected = true;
                            console.log(`Selected option: ${option} for field: ${field.name}`);
                        }
                        input.appendChild(optionElement);
                    });
                }
                console.log(`Created select field ${field.name} with value: ${value}`);
                break;

            case 'multiselect':
                input = this.createMultiSelect(field, value);
                break;

            case 'rating':
                input = this.createRatingInput(field, value);
                break;

            case 'file':
                input = document.createElement('input');
                input.type = 'file';
                input.id = `edit_${field.name}`;
                input.name = field.name;
                if (field.validation && field.validation.accept) {
                    input.accept = field.validation.accept;
                }
                break;

            default:
                input = document.createElement('input');
                input.type = 'text';
                input.id = `edit_${field.name}`;
                input.name = field.name;
                input.value = value;
                break;
        }

        input.className = 'form-input';
        input.required = field.required;
        return input;
    }

    createMultiSelect(field, value) {
        const container = document.createElement('div');
        container.className = 'multiselect-container';

        const selectedValues = value ? (Array.isArray(value) ? value : value.split(',')) : [];

        field.options.forEach(option => {
            const label = document.createElement('label');
            label.className = 'checkbox-label';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = field.name;
            checkbox.value = option;
            checkbox.checked = selectedValues.includes(option);

            const span = document.createElement('span');
            span.textContent = option;

            label.appendChild(checkbox);
            label.appendChild(span);
            container.appendChild(label);
        });

        return container;
    }

    createRatingInput(field, value) {
        const container = document.createElement('div');
        container.className = 'rating-container';

        const maxStars = field.validation?.max_stars || 5;
        
        for (let i = 1; i <= maxStars; i++) {
            const star = document.createElement('span');
            star.className = 'star';
            star.setAttribute('data-rating', i);
            star.innerHTML = '★';
            star.style.cursor = 'pointer';
            
            if (i <= value) {
                star.classList.add('active');
            }

            star.addEventListener('click', () => {
                this.updateRating(container, i);
            });

            container.appendChild(star);
        }

        // Hidden input to store the value
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = field.name;
        hiddenInput.value = value || 0;
        container.appendChild(hiddenInput);

        return container;
    }

    updateRating(container, rating) {
        const stars = container.querySelectorAll('.star');
        const hiddenInput = container.querySelector('input[type="hidden"]');

        stars.forEach((star, index) => {
            star.classList.toggle('active', index < rating);
        });

        hiddenInput.value = rating;
    }

    generateCommentSection(containerId, projectId) {
        if (!this.commentTypes) {
            console.error('Comment types not loaded');
            return;
        }

        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        container.innerHTML = '';

        // Comment type selector
        const typeSelector = document.createElement('div');
        typeSelector.className = 'comment-type-selector';
        
        const typeLabel = document.createElement('label');
        typeLabel.textContent = 'Comment Type:';
        typeSelector.appendChild(typeLabel);

        const typeSelect = document.createElement('select');
        typeSelect.id = 'comment-type';
        typeSelect.className = 'form-input';

        this.commentTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.name;
            option.textContent = `${type.icon} ${type.label}`;
            typeSelect.appendChild(option);
        });

        typeSelector.appendChild(typeSelect);
        container.appendChild(typeSelector);

        // Comment type description
        const descriptionDiv = document.createElement('div');
        descriptionDiv.className = 'comment-type-description';
        descriptionDiv.id = 'comment-type-description';
        container.appendChild(descriptionDiv);

        // Update description when comment type changes
        const updateDescription = () => {
            const selectedType = typeSelect.value;
            const commentType = this.commentTypes.find(type => type.name === selectedType);
            if (commentType) {
                descriptionDiv.textContent = commentType.description;
                descriptionDiv.style.display = 'block';
            } else {
                descriptionDiv.style.display = 'none';
            }
        };

        // Set initial description
        updateDescription();

        // Add event listener for changes
        typeSelect.addEventListener('change', updateDescription);

        // Comment input
        const commentInput = document.createElement('div');
        commentInput.className = 'comment-input-area';
        
        const textarea = document.createElement('textarea');
        textarea.className = 'comment-input';
        textarea.placeholder = 'Add a comment... (Press Enter to submit, Shift+Enter for new line)';
        textarea.rows = 3;
        commentInput.appendChild(textarea);

        const addButton = document.createElement('button');
        addButton.className = 'btn btn-primary add-comment-btn';
        addButton.setAttribute('data-project-id', projectId);
        addButton.textContent = 'Add Comment';
        commentInput.appendChild(addButton);

        // Add hint text for keyboard shortcuts
        const hintText = document.createElement('div');
        hintText.className = 'comment-hint';
        hintText.textContent = '💡 Tip: Press Enter to submit, Shift+Enter for new line';
        commentInput.appendChild(hintText);

        // Add Enter key functionality to submit comments
        textarea.addEventListener('keydown', (e) => {
            // Submit on Enter (but not Shift+Enter)
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // Prevent default newline behavior
                
                // Get the comment text
                const commentText = textarea.value.trim();
                if (commentText) {
                    // Get the selected comment type
                    const commentType = typeSelect.value;
                    
                    // Trigger the same action as clicking the Add Comment button
                    addButton.click();
                }
            }
        });

        container.appendChild(commentInput);

        // Comments list
        const commentsList = document.createElement('div');
        commentsList.className = 'comments-list';
        commentsList.setAttribute('data-project-id', projectId);
        container.appendChild(commentsList);
    }

    getFormData(formContainerId) {
        const container = document.getElementById(formContainerId);
        if (!container) return {};

        const formData = {};

        // Get all form inputs
        const inputs = container.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            if (input.type === 'checkbox') {
                // Handle multiselect checkboxes
                if (!formData[input.name]) formData[input.name] = [];
                if (input.checked) formData[input.name].push(input.value);
            } else if (input.type === 'hidden') {
                formData[input.name] = input.value;
            } else {
                formData[input.name] = input.value;
            }
        });

        return formData;
    }

    validateForm(formContainerId) {
        const container = document.getElementById(formContainerId);
        if (!container) return { valid: true, errors: [] };

        const errors = [];
        const requiredFields = container.querySelectorAll('[required]');

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                const label = container.querySelector(`label[for="${field.name}"]`);
                errors.push(`${label ? label.textContent.replace('*', '').trim() : field.name} is required`);
                
                // Show validation error
                this.showFieldError(field, 'This field is required');
            } else {
                this.clearFieldError(field);
            }
        });

        return { valid: errors.length === 0, errors };
    }

    showFieldError(field, message) {
        const fieldGroup = field.closest('.form-group');
        const validationDiv = fieldGroup.querySelector('.validation-message');
        
        if (validationDiv) {
            validationDiv.textContent = message;
            validationDiv.style.display = 'block';
            validationDiv.className = 'validation-message error';
        }
        
        field.classList.add('error');
    }

    clearFieldError(field) {
        const fieldGroup = field.closest('.form-group');
        const validationDiv = fieldGroup.querySelector('.validation-message');
        
        if (validationDiv) {
            validationDiv.style.display = 'none';
            validationDiv.className = 'validation-message';
        }
        
        field.classList.remove('error');
    }

    addMediaUploadSection(container) {
        const mediaSection = document.createElement('div');
        mediaSection.className = 'form-section';
        mediaSection.innerHTML = `
            <div class="section-header">
                <h3>Media</h3>
                <p class="section-description">Upload images and videos for your project</p>
            </div>
            <div class="media-upload-area">
                <div class="dnd-zone" id="dnd_zone">
                    <div class="dnd-content">
                        <div class="dnd-icon">📷</div>
                        <p class="dnd-text">Drop images here or click to browse</p>
                        <p class="dnd-subtext">Supports JPG, PNG, WebP</p>
                    </div>
                    <input type="file" id="dnd_input" accept="image/*" multiple style="display:none" />
                </div>
                <div class="video-upload">
                    <label class="video-upload-label">
                        <span class="video-icon">🎥</span>
                        <span class="video-text">Upload Video</span>
                        <input type="file" id="video_input" accept=".mp4,.mov,video/mp4,video/quicktime" />
                    </label>
                </div>
            </div>
        `;
        container.appendChild(mediaSection);
    }

    addExistingMediaSection(container, projectData) {
        if (!projectData.media || projectData.media.length === 0) {
            return;
        }
        
        const existingMediaSection = document.createElement('div');
        existingMediaSection.className = 'form-section';
        existingMediaSection.innerHTML = `
            <div class="section-header">
                <h3>Existing Media</h3>
                <p class="section-description">Current images and videos for this project</p>
            </div>
            <div class="existing-media-grid" id="existing-media-grid">
                <!-- Media items will be populated here -->
            </div>
        `;
        container.appendChild(existingMediaSection);
        
        // Populate existing media
        this.populateExistingMedia(projectData.media);
    }
    
    populateExistingMedia(mediaItems) {
        const grid = document.getElementById('existing-media-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        mediaItems.forEach((media, index) => {
            const mediaItem = document.createElement('div');
            mediaItem.className = 'existing-media-item draggable-media';
            mediaItem.setAttribute('data-media-id', media.id);
            mediaItem.setAttribute('data-display-order', media.display_order || index);
            mediaItem.setAttribute('draggable', 'true');
            
            if (media.media_type === 'image') {
                mediaItem.innerHTML = `
                    <div class="media-preview">
                        <img src="/uploads/images/${encodeURIComponent(media.filename)}" alt="${escapeHtml(media.original_name || '')}" />
                        <div class="media-overlay">
                            <button class="delete-media-btn" data-media-id="${media.id}" title="Delete image">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3,6 5,6 21,6"></polyline>
                                    <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="media-info">
                        <span class="media-type">📷 Image</span>
                        <span class="media-name">${escapeHtml(media.original_name || media.filename)}</span>
                        <span class="media-order">Order: ${media.display_order || index + 1}</span>
                    </div>
                `;
            } else if (media.media_type === 'video') {
                mediaItem.innerHTML = `
                    <div class="media-preview">
                        <video src="/uploads/videos/${encodeURIComponent(media.filename)}" muted></video>
                        <div class="media-overlay">
                            <button class="delete-media-btn" data-media-id="${media.id}" title="Delete video">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3,6 5,6 21,6"></polyline>
                                    <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="media-info">
                        <span class="media-type">🎥 Video</span>
                        <span class="media-name">${escapeHtml(media.original_name || media.filename)}</span>
                        <span class="media-order">Order: ${media.display_order || index + 1}</span>
                    </div>
                `;
            }
            
            grid.appendChild(mediaItem);
        });
        
        // Add delete event listeners
        this.setupMediaDeleteHandlers();
        
        // Add drag and drop event listeners
        this.setupDragAndDropHandlers();
    }
    
    setupMediaDeleteHandlers() {
        const deleteButtons = document.querySelectorAll('.delete-media-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation();
                const mediaId = button.getAttribute('data-media-id');
                
                if (!confirm('Are you sure you want to delete this media file?')) {
                    return;
                }
                
                try {
                    const response = await fetch(`/api/media/${mediaId}`, {
                        method: 'DELETE'
                    });
                    
                    if (response.ok) {
                        // Remove the media item from the UI
                        const mediaItem = button.closest('.existing-media-item');
                        mediaItem.remove();
                        
                        this.showUploadSuccess('Media deleted successfully!');
                        
                        // Update order numbers for remaining items
                        this.updateOrderNumbers();
                        
                        // Check if grid is empty and hide section if needed
                        const grid = document.getElementById('existing-media-grid');
                        if (grid && grid.children.length === 0) {
                            const section = grid.closest('.form-section');
                            if (section) {
                                section.style.display = 'none';
                            }
                        }
                    } else {
                        const error = await response.json();
                        this.showUploadError(error.error || 'Failed to delete media');
                    }
                } catch (error) {
                    console.error('Delete error:', error);
                    this.showUploadError('Network error during deletion');
                }
            });
        });
    }
    
    setupDragAndDropHandlers() {
        const draggableItems = document.querySelectorAll('.draggable-media');
        const grid = document.getElementById('existing-media-grid');
        
        if (!grid) return;
        
        draggableItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', item.getAttribute('data-media-id'));
                item.classList.add('dragging');
            });
            
            item.addEventListener('dragend', (e) => {
                item.classList.remove('dragging');
            });
        });
        
        grid.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = this.getDragAfterElement(grid, e.clientY);
            const dragging = document.querySelector('.dragging');
            if (afterElement == null) {
                grid.appendChild(dragging);
            } else {
                grid.insertBefore(dragging, afterElement);
            }
        });
        
        grid.addEventListener('drop', async (e) => {
            e.preventDefault();
            const mediaId = e.dataTransfer.getData('text/plain');
            const draggedItem = document.querySelector(`[data-media-id="${mediaId}"]`);
            
            if (draggedItem) {
                await this.updateMediaOrder();
            }
        });
    }
    
    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.draggable-media:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    async updateMediaOrder() {
        const grid = document.getElementById('existing-media-grid');
        if (!grid) return;
        
        const mediaItems = grid.querySelectorAll('.draggable-media');
        const mediaOrders = [];
        
        mediaItems.forEach((item, index) => {
            const mediaId = parseInt(item.getAttribute('data-media-id'));
            mediaOrders.push({
                media_id: mediaId,
                display_order: index + 1
            });
            
            // Update the order display
            const orderSpan = item.querySelector('.media-order');
            if (orderSpan) {
                orderSpan.textContent = `Order: ${index + 1}`;
            }
        });
        
        const projectId = this.getCurrentProjectId();
        if (!projectId) return;
        
        try {
            const response = await fetch(`/api/projects/${projectId}/media/order`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ media_orders: mediaOrders })
            });
            
            if (response.ok) {
                this.showUploadSuccess('Media order updated successfully!');
            } else {
                const error = await response.json();
                this.showUploadError(error.error || 'Failed to update media order');
            }
        } catch (error) {
            console.error('Update order error:', error);
            this.showUploadError('Network error during order update');
        }
    }

    setupDragAndDrop() {
        const dndZone = document.getElementById('dnd_zone');
        const dndInput = document.getElementById('dnd_input');
        const videoInput = document.getElementById('video_input');
        
        if (!dndZone || !dndInput) return;
        
        // Click to browse files
        dndZone.addEventListener('click', () => {
            dndInput.click();
        });
        
        // Handle file selection
        dndInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            const imageFiles = files.filter(file => file.type.startsWith('image/'));
            const videoFiles = files.filter(file => file.type.startsWith('video/'));
            
            // Handle images
            if (imageFiles.length > 0) {
                this.handleImageUploads(imageFiles);
            }
            
            // Handle videos
            if (videoFiles.length > 0) {
                this.handleVideoUploads(videoFiles);
            }
        });
        
        // Drag and drop events
        dndZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dndZone.classList.add('dragover');
        });
        
        dndZone.addEventListener('dragleave', () => {
            dndZone.classList.remove('dragover');
        });
        
        dndZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dndZone.classList.remove('dragover');
            
            const files = Array.from(e.dataTransfer.files);
            const imageFiles = files.filter(file => file.type.startsWith('image/'));
            const videoFiles = files.filter(file => file.type.startsWith('video/'));
            
            // Handle images
            if (imageFiles.length > 0) {
                this.handleImageUploads(imageFiles);
            }
            
            // Handle videos
            if (videoFiles.length > 0) {
                this.handleVideoUploads(videoFiles);
            }
        });
        
        // Video upload handling
        if (videoInput) {
            videoInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleVideoUpload(file);
                }
            });
        }
    }

    async handleVideoUploads(files) {
        const projectId = this.getCurrentProjectId();
        if (!projectId) {
            this.showUploadError('No project selected');
            return;
        }

        for (const file of files) {
            await this.handleVideoUpload(file);
        }
    }

    async handleImageUploads(files) {
        const projectId = this.getCurrentProjectId();
        if (!projectId) {
            console.error('No project ID found for upload');
            return;
        }
        
        for (const file of files) {
            try {
                const formData = new FormData();
                formData.append('file', file);
                
                const response = await fetch(`/api/projects/${projectId}/upload/image`, {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('Image uploaded:', result.filename);
                    this.showUploadSuccess('Image uploaded successfully!');
                    // Refresh the existing media section
                    await this.refreshExistingMedia();
                } else {
                    const error = await response.json();
                    console.error('Upload failed:', error);
                    this.showUploadError(error.error || 'Upload failed');
                }
            } catch (error) {
                console.error('Upload error:', error);
                this.showUploadError('Network error during upload');
            }
        }
    }
    
    async handleVideoUpload(file) {
        const projectId = this.getCurrentProjectId();
        if (!projectId) {
            console.error('No project ID found for upload');
            return;
        }
        
        // Check file size (450MB limit)
        const maxSize = 450 * 1024 * 1024; // 450MB
        if (file.size > maxSize) {
            this.showUploadError(`File too large. Maximum size is 450MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB`);
            return;
        }
        
        // Show upload progress
        this.showUploadMessage(`Uploading video "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)}MB)...`, 'info');
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch(`/api/projects/${projectId}/upload/video`, {
                method: 'POST',
                body: formData,
                // Add timeout for large files (5 minutes)
                signal: AbortSignal.timeout(300000)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('Video uploaded:', result.filename);
                this.showUploadSuccess('Video uploaded successfully!');
                // Refresh the existing media section
                await this.refreshExistingMedia();
            } else {
                const error = await response.json();
                console.error('Upload failed:', error);
                this.showUploadError(error.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            if (error.name === 'TimeoutError') {
                this.showUploadError('Upload timeout. Please try a smaller file or check your connection.');
            } else if (error.name === 'AbortError') {
                this.showUploadError('Upload cancelled or network error occurred.');
            } else {
                this.showUploadError('Network error during upload. Please check your connection.');
            }
        }
    }
    
    getCurrentProjectId() {
        // Try to get project ID from the modal
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            return modal.getAttribute('data-project-id');
        }
        return null;
    }
    
    showUploadSuccess(message) {
        this.showUploadMessage(message, 'success');
    }
    
    showUploadError(message) {
        this.showUploadMessage(message, 'error');
    }
    
    showUploadMessage(message, type) {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.className = `upload-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    async refreshExistingMedia() {
        const projectId = this.getCurrentProjectId();
        if (!projectId) return;
        
        try {
            // Fetch updated project data
            const response = await fetch(`/api/projects/${projectId}`);
            if (response.ok) {
                const projectData = await response.json();
                
                // Find the existing media section
                const existingSection = document.querySelector('#existing-media-grid')?.closest('.form-section');
                if (existingSection) {
                    // Remove the old section
                    existingSection.remove();
                }
                
                // Add the updated media section
                const container = document.querySelector('.modal-content');
                if (container) {
                    this.addExistingMediaSection(container, projectData);
                }
            }
        } catch (error) {
            console.error('Error refreshing media:', error);
        }
    }
    
    updateOrderNumbers() {
        const mediaItems = document.querySelectorAll('.draggable-media');
        mediaItems.forEach((item, index) => {
            const orderSpan = item.querySelector('.media-order');
            if (orderSpan) {
                orderSpan.textContent = `Order: ${index + 1}`;
            }
        });
    }

    collectFormData(container) {
        const formData = {};
        
        // Get all input elements within the container
        const inputs = container.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            const fieldName = input.name || input.id?.replace('edit_', '');
            if (!fieldName) return;
            
            let value = input.value;
            
            // Handle different input types
            if (input.type === 'number') {
                value = value ? parseInt(value, 10) : null;
            } else if (input.type === 'checkbox') {
                value = input.checked;
            } else if (input.tagName === 'SELECT') {
                value = input.value || null;
            } else if (input.tagName === 'TEXTAREA') {
                value = value.trim() || null;
            } else if (input.type === 'text' || input.type === 'url') {
                value = value.trim() || null;
            }
            
            // Handle multiselect fields (tags)
            if (fieldName === 'tags' && Array.isArray(value)) {
                value = value.join(', ');
            }
            
            formData[fieldName] = value;
        });
        
        return formData;
    }
}

// Global instance
window.formGenerator = new DynamicFormGenerator();
