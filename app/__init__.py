from flask import Flask
from flask_cors import CORS
from pathlib import Path
from .db import initialize_database


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["UPLOAD_FOLDER_IMAGES"] = str(Path.cwd() / "uploads" / "images")
    app.config["UPLOAD_FOLDER_VIDEOS"] = str(Path.cwd() / "uploads" / "videos")
    app.config["MAX_CONTENT_LENGTH"] = 1024 * 1024 * 1024  # up to 1GB uploads

    CORS(app)

    # Ensure DB and upload directories exist
    initialize_database()
    Path(app.config["UPLOAD_FOLDER_IMAGES"]).mkdir(parents=True, exist_ok=True)
    Path(app.config["UPLOAD_FOLDER_VIDEOS"]).mkdir(parents=True, exist_ok=True)

    from .routes import bp as api_bp

    app.register_blueprint(api_bp)

    @app.route("/")
    def index():
        from flask import render_template

        return render_template("index.html")

    return app


