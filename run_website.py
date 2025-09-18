#!/usr/bin/env python3
"""
Website runner that automatically finds an available port
"""
from app import create_app
import socket
import os

def find_free_port(start_port=8080):
    """Find a free port starting from start_port"""
    for port in range(start_port, start_port + 100):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('', port))
                return port
        except OSError:
            continue
    return None

def get_local_ip():
    """Get the local IP address"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except:
        return "127.0.0.1"

app = create_app()

if __name__ == "__main__":
    # Find a free port (avoiding 5000 which is used by macOS)
    port = find_free_port(8080)
    if not port:
        print("❌ No free ports available!")
        exit(1)
    
    host = '0.0.0.0'  # Allow external connections
    local_ip = get_local_ip()
    
    print("🌐 Student Projects App - Website Hosting")
    print("=" * 50)
    print(f"🚀 Starting Flask server on port {port}...")
    print(f"📡 Local access: http://localhost:{port}")
    print(f"🌐 Network access: http://{local_ip}:{port}")
    print(f"📱 Mobile access: http://{local_ip}:{port}")
    print("")
    print("📋 Share the network URL with anyone on your WiFi")
    print("⚠️  Keep this terminal open to keep the website running")
    print("🛑 Press Ctrl+C to stop the server")
    print("=" * 50)
    
    try:
        app.run(host=host, port=port, debug=False)
    except KeyboardInterrupt:
        print("\n🛑 Server stopped. Goodbye!")
    except Exception as e:
        print(f"\n❌ Error starting server: {e}")
        print("💡 Try running: python3 run_website.py")
