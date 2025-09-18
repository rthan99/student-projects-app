#!/usr/bin/env python3
"""
Cloud deployment script for free hosting platforms
"""
import os
import subprocess
import sys

def check_requirements():
    """Check if required tools are installed"""
    tools = {
        'git': 'Git is required for deployment',
        'python3': 'Python 3 is required'
    }
    
    missing = []
    for tool, message in tools.items():
        if subprocess.run(['which', tool], capture_output=True).returncode != 0:
            missing.append(f"❌ {tool}: {message}")
    
    if missing:
        print("🚨 Missing requirements:")
        for msg in missing:
            print(msg)
        return False
    
    print("✅ All requirements met!")
    return True

def deploy_to_railway():
    """Deploy to Railway (free tier available)"""
    print("🚂 Deploying to Railway...")
    
    # Check if Railway CLI is installed
    if subprocess.run(['which', 'railway'], capture_output=True).returncode != 0:
        print("📦 Installing Railway CLI...")
        subprocess.run(['npm', 'install', '-g', '@railway/cli'], check=True)
    
    print("🔐 Please login to Railway:")
    subprocess.run(['railway', 'login'], check=True)
    
    print("🚀 Deploying your app...")
    subprocess.run(['railway', 'init'], check=True)
    subprocess.run(['railway', 'up'], check=True)
    
    print("✅ Deployment complete!")
    print("🌐 Your app is now live on Railway!")

def deploy_to_render():
    """Instructions for Render deployment"""
    print("🎨 Render Deployment Instructions:")
    print("=" * 40)
    print("1. Go to https://render.com")
    print("2. Sign up for a free account")
    print("3. Click 'New +' → 'Web Service'")
    print("4. Connect your GitHub repository")
    print("5. Use these settings:")
    print("   - Build Command: pip install -r requirements.txt")
    print("   - Start Command: python3 run_production.py")
    print("6. Click 'Create Web Service'")
    print("")
    print("✅ Your app will be live in a few minutes!")

def main():
    print("☁️  Cloud Deployment Options")
    print("=" * 30)
    print("1) Railway (Automatic deployment)")
    print("2) Render (Manual deployment)")
    print("3) Local network only")
    print("")
    
    choice = input("Choose option (1-3): ").strip()
    
    if choice == "1":
        if check_requirements():
            deploy_to_railway()
        else:
            print("❌ Please install missing requirements first")
    
    elif choice == "2":
        deploy_to_render()
    
    elif choice == "3":
        print("🌐 Starting local network server...")
        os.system("python3 run_simple.py")
    
    else:
        print("❌ Invalid choice")

if __name__ == "__main__":
    main()
