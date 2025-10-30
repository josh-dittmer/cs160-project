"""
Test script for Video Generation API

This script tests the video generation endpoints.
Make sure your backend is running and you have:
1. GEMINI_API_KEY set in your .env file
2. Admin credentials for authentication
"""

import requests
import time
import json
import base64
from pathlib import Path


# Configuration
BASE_URL = "http://localhost:8000"
# Update these with your admin credentials
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin123"


def login_admin():
    """Login and get authentication token"""
    print("\n🔐 Logging in as admin...")
    
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        token = data.get("access_token")
        print(f"✅ Login successful! Token: {token[:20]}...")
        return token
    else:
        print(f"❌ Login failed: {response.status_code}")
        print(response.text)
        return None


def check_health(token):
    """Check if video generation API is configured"""
    print("\n🏥 Checking API health...")
    
    response = requests.get(
        f"{BASE_URL}/api/admin/video/health",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ API Health: {json.dumps(data, indent=2)}")
        return data.get("configured", False)
    else:
        print(f"❌ Health check failed: {response.status_code}")
        print(response.text)
        return False


def test_sync_generation(token):
    """Test synchronous video generation (blocks until complete)"""
    print("\n🎬 Testing synchronous video generation...")
    print("⏳ This will take 30-60 seconds...")
    
    prompt = "A fresh red apple rotating slowly on a white surface with soft lighting and a subtle shadow"
    
    response = requests.post(
        f"{BASE_URL}/api/admin/video/generate-sync",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        json={
            "prompt": prompt,
            "model": "veo-3.1-fast-generate-preview"  # Use fast model for quicker results
        },
        timeout=120  # 2 minute timeout
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Video generated successfully!")
        print(f"   Status: {data['status']}")
        print(f"   Prompt: {data['prompt']}")
        
        # Save video to file
        if data.get('video_data'):
            save_video(data['video_data'], "sync_test_video.mp4")
        
        return True
    else:
        print(f"❌ Generation failed: {response.status_code}")
        print(response.text)
        return False


def test_async_generation(token):
    """Test asynchronous video generation (with polling)"""
    print("\n🎬 Testing asynchronous video generation...")
    
    prompt = "A basket of colorful fresh vegetables on a wooden table with morning sunlight"
    
    # Step 1: Start generation
    print("📤 Starting video generation...")
    response = requests.post(
        f"{BASE_URL}/api/admin/video/generate",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        json={
            "prompt": prompt,
            "model": "veo-3.1-fast-generate-preview"
        }
    )
    
    if response.status_code != 200:
        print(f"❌ Failed to start generation: {response.status_code}")
        print(response.text)
        return False
    
    data = response.json()
    operation_id = data.get('operation_id')
    print(f"✅ Generation started!")
    print(f"   Operation ID: {operation_id}")
    print(f"   Status: {data['status']}")
    
    # Step 2: Poll for completion
    print("\n⏳ Polling for completion (checking every 5 seconds)...")
    max_attempts = 24  # 2 minutes max (24 * 5 seconds)
    attempts = 0
    
    while attempts < max_attempts:
        time.sleep(5)
        attempts += 1
        
        status_response = requests.get(
            f"{BASE_URL}/api/admin/video/status/{operation_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if status_response.status_code != 200:
            print(f"❌ Status check failed: {status_response.status_code}")
            return False
        
        status_data = status_response.json()
        status = status_data.get('status')
        
        print(f"   Attempt {attempts}: {status}")
        
        if status == 'completed':
            print(f"✅ Video generation completed!")
            
            # Save video to file
            if status_data.get('video_data'):
                save_video(status_data['video_data'], "async_test_video.mp4")
            
            # Clean up operation
            delete_response = requests.delete(
                f"{BASE_URL}/api/admin/video/operation/{operation_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            if delete_response.status_code == 200:
                print(f"✅ Operation cleaned up")
            
            return True
        
        elif status == 'failed':
            print(f"❌ Video generation failed: {status_data.get('message')}")
            return False
    
    print(f"⏱️ Timeout: Video generation took too long")
    return False


def save_video(video_data_uri, filename):
    """Save base64 video data to file"""
    try:
        # Extract base64 data from data URI
        if video_data_uri.startswith('data:'):
            video_data_uri = video_data_uri.split(',', 1)[1]
        
        # Decode base64
        video_bytes = base64.b64decode(video_data_uri)
        
        # Save to file
        output_path = Path(__file__).parent / filename
        with open(output_path, 'wb') as f:
            f.write(video_bytes)
        
        file_size = len(video_bytes) / (1024 * 1024)  # MB
        print(f"💾 Video saved to: {output_path}")
        print(f"   File size: {file_size:.2f} MB")
        
    except Exception as e:
        print(f"❌ Failed to save video: {str(e)}")


def test_error_handling(token):
    """Test error handling with invalid inputs"""
    print("\n🧪 Testing error handling...")
    
    # Test 1: Invalid model
    print("\n  Test 1: Invalid model name")
    response = requests.post(
        f"{BASE_URL}/api/admin/video/generate",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        json={
            "prompt": "Test video",
            "model": "invalid-model"
        }
    )
    if response.status_code == 400:
        print(f"  ✅ Correctly rejected invalid model")
    else:
        print(f"  ❌ Expected 400, got {response.status_code}")
    
    # Test 2: Empty prompt
    print("\n  Test 2: Empty prompt")
    response = requests.post(
        f"{BASE_URL}/api/admin/video/generate",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        json={
            "prompt": "",
            "model": "veo-3.1-generate-preview"
        }
    )
    if response.status_code == 422:
        print(f"  ✅ Correctly rejected empty prompt")
    else:
        print(f"  ❌ Expected 422, got {response.status_code}")
    
    # Test 3: Non-existent operation
    print("\n  Test 3: Non-existent operation ID")
    response = requests.get(
        f"{BASE_URL}/api/admin/video/status/fake-operation-id",
        headers={"Authorization": f"Bearer {token}"}
    )
    if response.status_code == 404:
        print(f"  ✅ Correctly returned 404 for non-existent operation")
    else:
        print(f"  ❌ Expected 404, got {response.status_code}")


def main():
    """Run all tests"""
    print("=" * 60)
    print("🎥 Video Generation API Test Suite")
    print("=" * 60)
    
    # Login
    token = login_admin()
    if not token:
        print("\n❌ Cannot proceed without authentication")
        return
    
    # Check health
    is_configured = check_health(token)
    if not is_configured:
        print("\n❌ API is not properly configured")
        print("   Make sure GEMINI_API_KEY is set in your .env file")
        return
    
    # Run tests
    print("\n" + "=" * 60)
    print("Running Tests")
    print("=" * 60)
    
    # Test error handling first (fast)
    test_error_handling(token)
    
    # Ask user which generation tests to run
    print("\n" + "=" * 60)
    print("Choose test to run:")
    print("1. Synchronous generation (simpler, blocks 30-60s)")
    print("2. Asynchronous generation (polling, 30-60s)")
    print("3. Both")
    print("4. Skip generation tests")
    choice = input("Enter choice (1-4): ").strip()
    
    if choice == '1' or choice == '3':
        test_sync_generation(token)
    
    if choice == '2' or choice == '3':
        test_async_generation(token)
    
    print("\n" + "=" * 60)
    print("✅ Test suite completed!")
    print("=" * 60)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️ Test interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()

