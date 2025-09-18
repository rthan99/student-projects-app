# Student Projects App

A Flask web application for managing and displaying student projects with image and video support.

## Features

- **Project Gallery**: View projects in a responsive grid layout
- **Media Support**: Upload and display images and videos
- **Random Projects**: Click "🎲 Show me 5 random projects" to see random selections
- **Search & Filter**: Search by title, description, or filter by category/year
- **Project Creation**: Add new projects with images and videos
- **Project Editing**: Edit existing projects and manage media
- **Import Projects**: Bulk import from Excel/CSV files
- **Video Playback**: Play videos directly in the gallery view

## Quick Start

### Prerequisites
- Python 3.7 or higher
- pip (Python package installer)

### Installation

1. **Extract the zip file** to your desired location
2. **Open Terminal/Command Prompt** and navigate to the project folder
3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Run the application**:
   ```bash
   python run.py
   ```
5. **Open your browser** and go to: `http://127.0.0.1:5050`

## Usage

### Viewing Projects
- **All Projects**: Default view shows all projects alphabetically
- **Random Projects**: Click "🎲 Show me 5 random projects" for random selection
- **Search**: Use the search box to find projects by title or description
- **Filter**: Use category and year dropdowns to filter projects

### Creating Projects
1. Click the **"+"** button to open the create form
2. Fill in the project details (title is required)
3. Upload images (JPG, PNG, GIF) or videos (MP4, MOV)
4. Click **"Create"** to add the project

### Editing Projects
1. Click on any project image/title to view details
2. Click the **pencil icon** (✏️) to edit
3. Modify project details or upload new media
4. Click **"Save Changes"** to update

### Importing Projects
1. Prepare an Excel (.xlsx) or CSV file with project data
2. Click **"Choose File"** and select your file
3. Click **"Import"** to add projects in bulk

## File Structure

```
student-projects-app/
├── app/
│   ├── __init__.py          # Flask app initialization
│   ├── db.py               # Database connection
│   ├── models.py           # Database models and functions
│   ├── routes.py           # API endpoints
│   ├── seed.py             # Database seeding
│   ├── database.sqlite3    # SQLite database
│   ├── static/
│   │   ├── main.js         # Frontend JavaScript
│   │   └── styles.css      # CSS styling
│   └── templates/
│       └── index.html      # Main HTML template
├── uploads/
│   ├── images/            # Uploaded images
│   └── videos/            # Uploaded videos
├── run.py                 # Application entry point
├── requirements.txt       # Python dependencies
└── README.md             # This file
```

## API Endpoints

- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/<id>` - Get project details
- `PUT /api/projects/<id>` - Update project
- `DELETE /api/projects/<id>` - Delete project
- `POST /api/projects/import` - Import projects from file
- `DELETE /api/media/<id>` - Delete media file

## Troubleshooting

### Port Already in Use
If you get "Address already in use" error:
```bash
python run.py --port 5051
```

### Missing Dependencies
If you get import errors:
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Database Issues
If the database seems corrupted, delete `app/database.sqlite3` and restart the app.

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support  
- Safari: Full support
- Mobile browsers: Responsive design supported

## Support

For issues or questions, check the browser console (F12) for error messages.
