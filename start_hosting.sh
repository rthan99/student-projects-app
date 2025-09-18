#!/bin/bash

echo "🌐 Student Projects App - Hosting Options"
echo "========================================"
echo ""
echo "Choose your hosting method:"
echo "1) 🌍 Local Network (WiFi only) - RECOMMENDED"
echo "2) ☁️  Cloud Deployment (Railway/Render)"
echo "3) 🔧 Manual Setup"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Starting local network hosting..."
        echo "📡 This will make your app accessible to anyone on your WiFi"
        echo "⚠️  Note: Port 5000 is used by macOS, using port 8080 instead"
        echo ""
        python3 run_website.py
        ;;
    2)
        echo ""
        echo "☁️  Starting cloud deployment..."
        python3 run_cloud.py
        ;;
    3)
        echo ""
        echo "🔧 Manual Setup Instructions:"
        echo "============================="
        echo ""
        echo "Option A: Local Network Access"
        echo "  Run: python3 run_website.py"
        echo "  Share: http://YOUR_IP:8080"
        echo ""
        echo "Option B: Cloud Hosting (Free)"
        echo "  1. Go to https://railway.app"
        echo "  2. Connect your GitHub repository"
        echo "  3. Deploy automatically"
        echo ""
        echo "Option C: Alternative Cloud Hosting"
        echo "  1. Go to https://render.com"
        echo "  2. Create new Web Service"
        echo "  3. Connect GitHub repo"
        echo "  4. Use: python3 run_website.py"
        echo ""
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        ;;
esac
