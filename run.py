from app import create_app

app = create_app()

if __name__ == "__main__":
    # For local dev, Flask built-in server is fine
    app.run(host="127.0.0.1", port=5050, debug=True)


