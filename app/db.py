import os
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "database.sqlite3"


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database() -> None:
    os.makedirs(BASE_DIR, exist_ok=True)
    with get_connection() as connection:
        cursor = connection.cursor()

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                student_name TEXT NOT NULL,
                category TEXT,
                tags TEXT,
                description TEXT,
                year INTEGER,
                video_url TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            """
        )
        
        # Add video_url column if it doesn't exist (for existing databases)
        try:
            cursor.execute("ALTER TABLE projects ADD COLUMN video_url TEXT;")
        except sqlite3.OperationalError:
            # Column already exists
            pass
            
        # Add rating column if it doesn't exist (for existing databases)
        try:
            cursor.execute("ALTER TABLE projects ADD COLUMN rating INTEGER DEFAULT 0;")
        except sqlite3.OperationalError:
            # Column already exists
            pass

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS media (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                media_type TEXT NOT NULL CHECK(media_type IN ('image','video')),
                filename TEXT NOT NULL,
                original_name TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            );
            """
        )

        # Create categories table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            """
        )

        # Create project_categories junction table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS project_categories (
                project_id INTEGER NOT NULL,
                category_id INTEGER NOT NULL,
                PRIMARY KEY (project_id, category_id),
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
            );
            """
        )

        connection.commit()


def reset_database() -> None:
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute("DROP TABLE IF EXISTS media;")
        cursor.execute("DROP TABLE IF EXISTS projects;")
        connection.commit()
        initialize_database()


