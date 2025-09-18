from typing import List, Optional, Dict, Any
from .db import get_connection


def create_project(
    title: str,
    student_name: str,
    category: Optional[str] = None,
    tags: Optional[List[str]] = None,
    description: Optional[str] = None,
    year: Optional[int] = None,
    video_url: Optional[str] = None,
    rating: Optional[int] = 0,
) -> int:
    tags_str = ",".join(tags) if tags else None
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(
            """
            INSERT INTO projects (title, student_name, category, tags, description, year, video_url, rating)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (title, student_name, category, tags_str, description, year, video_url, rating),
        )
        return cursor.lastrowid


def list_projects(
    search: Optional[str] = None,
    category: Optional[str] = None,
    year: Optional[int] = None,
    rating: Optional[int] = None,
    sort_by: str = "created_at",
    order: str = "desc",
) -> List[Dict[str, Any]]:
    valid_sort = {"created_at", "title", "student_name", "year", "category"}
    if sort_by not in valid_sort:
        sort_by = "created_at"
    order = "ASC" if order.lower() == "asc" else "DESC"

    query = "SELECT * FROM projects WHERE 1=1"
    params: List[Any] = []
    if search:
        query += " AND (title LIKE ? OR student_name LIKE ? OR description LIKE ?)"
        like = f"%{search}%"
        params.extend([like, like, like])
    if category:
        query += " AND (category = ? OR category LIKE ? OR category LIKE ? OR category LIKE ?)"
        params.extend([
            category,  # Exact match
            f"{category},%",  # Category at start of comma-separated list
            f"%,{category},%",  # Category in middle of comma-separated list
            f"%,{category}"  # Category at end of comma-separated list
        ])
    if year:
        query += " AND year = ?"
        params.append(year)
    if rating is not None:
        query += " AND rating = ?"
        params.append(rating)

    query += f" ORDER BY {sort_by} {order}"

    with get_connection() as connection:
        cursor = connection.cursor()
        rows = cursor.execute(query, params).fetchall()
        projects = [dict(row) for row in rows]

    # Attach media counts and thumbnail image
    with get_connection() as connection:
        cursor = connection.cursor()
        for project in projects:
            media_counts = cursor.execute(
                "SELECT media_type, COUNT(*) as count FROM media WHERE project_id = ? GROUP BY media_type",
                (project["id"],),
            ).fetchall()
            counts = {row["media_type"]: row["count"] for row in media_counts}
            project["image_count"] = counts.get("image", 0)
            project["video_count"] = counts.get("video", 0)
            thumb_row = cursor.execute(
                "SELECT filename FROM media WHERE project_id = ? AND media_type = 'image' ORDER BY created_at DESC LIMIT 1",
                (project["id"],),
            ).fetchone()
            project["thumbnail_image"] = thumb_row["filename"] if thumb_row else None
            if project["thumbnail_image"] is None and project["video_count"] > 0:
                vrow = cursor.execute(
                    "SELECT filename FROM media WHERE project_id = ? AND media_type = 'video' ORDER BY created_at DESC LIMIT 1",
                    (project["id"],),
                ).fetchone()
                project["thumbnail_video"] = vrow["filename"] if vrow else None
            else:
                project["thumbnail_video"] = None
    return projects


def add_media(project_id: int, media_type: str, filename: str, original_name: str) -> int:
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(
            "INSERT INTO media (project_id, media_type, filename, original_name) VALUES (?, ?, ?, ?)",
            (project_id, media_type, filename, original_name),
        )
        return cursor.lastrowid


def get_project(project_id: int) -> Optional[Dict[str, Any]]:
    with get_connection() as connection:
        cursor = connection.cursor()
        row = cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        if row is None:
            return None
        project = dict(row)
        media_rows = cursor.execute(
            "SELECT id, media_type, filename, original_name FROM media WHERE project_id = ? ORDER BY created_at DESC",
            (project_id,),
        ).fetchall()
        project["media"] = [dict(r) for r in media_rows]
        return project


def delete_project(project_id: int) -> None:
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute("DELETE FROM media WHERE project_id = ?", (project_id,))
        cursor.execute("DELETE FROM projects WHERE id = ?", (project_id,))


def get_media(media_id: int) -> Optional[Dict[str, Any]]:
    with get_connection() as connection:
        cursor = connection.cursor()
        row = cursor.execute(
            "SELECT id, project_id, media_type, filename, original_name FROM media WHERE id = ?",
            (media_id,),
        ).fetchone()
        return dict(row) if row else None


def delete_media(media_id: int) -> None:
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute("DELETE FROM media WHERE id = ?", (media_id,))

def update_project(
    project_id: int,
    title: Optional[str] = None,
    student_name: Optional[str] = None,
    category: Optional[str] = None,
    tags: Optional[List[str]] = None,
    description: Optional[str] = None,
    year: Optional[int] = None,
    video_url: Optional[str] = None,
    rating: Optional[int] = None,
) -> None:
    fields = []
    params: List[Any] = []
    if title is not None:
        fields.append("title = ?")
        params.append(title)
    if student_name is not None:
        fields.append("student_name = ?")
        params.append(student_name)
    if category is not None:
        fields.append("category = ?")
        params.append(category)
    if tags is not None:
        tags_str = ",".join(tags) if tags else None
        fields.append("tags = ?")
        params.append(tags_str)
    if description is not None:
        fields.append("description = ?")
        params.append(description)
    if year is not None:
        fields.append("year = ?")
        params.append(year)
    if video_url is not None:
        fields.append("video_url = ?")
        params.append(video_url)
    if rating is not None:
        fields.append("rating = ?")
        params.append(rating)
    if not fields:
        return
    params.append(project_id)
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(f"UPDATE projects SET {', '.join(fields)} WHERE id = ?", params)

