#!/usr/bin/env python3
"""
Simple script to test authentication endpoints manually.
Run the backend server first, then run this script.

Usage:
    python backend/test_auth_example.py
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def print_response(response, title):
    """Pretty print response"""
    print(f"\n{'='*60}")
    print(f"{title}")
    print(f"{'='*60}")
    print(f"Status Code: {response.status_code}")
    print(f"Response:")
    print(json.dumps(response.json(), indent=2))

def main():
    print("\n🔐 Testing Authentication API\n")
    
    # Test data
    test_email = input("Enter test email: ").strip()
    test_password = input("Enter test password: ").strip()
    test_name = input("Enter test full name: ").strip()
    
    # 1. Signup
    print("\n1️⃣  Testing Signup...")
    signup_response = requests.post(
        f"{BASE_URL}/api/auth/signup",
        json={
            "email": test_email,
            "password": test_password,
            "full_name": test_name,
        }
    )
    print_response(signup_response, "SIGNUP RESPONSE")
    
    if signup_response.status_code == 201:
        token = signup_response.json()["access_token"]
        user_id = signup_response.json()["user"]["id"]
        print(f"✅ Signup successful! User ID: {user_id}")
    else:
        print("❌ Signup failed!")
        if signup_response.status_code == 400:
            print("   (User might already exist - this is expected if you ran this script before)")
        return
    
    # 2. Get user info with token
    print("\n2️⃣  Testing Get Current User...")
    me_response = requests.get(
        f"{BASE_URL}/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    print_response(me_response, "GET CURRENT USER RESPONSE")
    
    if me_response.status_code == 200:
        print("✅ Token authentication successful!")
    else:
        print("❌ Token authentication failed!")
    
    # 3. Login
    print("\n3️⃣  Testing Login...")
    login_response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={
            "email": test_email,
            "password": test_password,
        }
    )
    print_response(login_response, "LOGIN RESPONSE")
    
    if login_response.status_code == 200:
        new_token = login_response.json()["access_token"]
        print(f"✅ Login successful! New token received.")
    else:
        print("❌ Login failed!")
    
    # 4. Test wrong password
    print("\n4️⃣  Testing Login with Wrong Password...")
    wrong_login_response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={
            "email": test_email,
            "password": "wrongpassword",
        }
    )
    print_response(wrong_login_response, "LOGIN WITH WRONG PASSWORD")
    
    if wrong_login_response.status_code == 401:
        print("✅ Wrong password correctly rejected!")
    else:
        print("❌ Expected 401 error!")
    
    # 5. Test missing token
    print("\n5️⃣  Testing Protected Endpoint without Token...")
    no_token_response = requests.get(f"{BASE_URL}/api/auth/me")
    print_response(no_token_response, "GET USER WITHOUT TOKEN")
    
    if no_token_response.status_code == 401:
        print("✅ Missing token correctly rejected!")
    else:
        print("❌ Expected 401 error!")
    
    print("\n" + "="*60)
    print("✨ Testing Complete!")
    print("="*60)
    print("\nNote: To test Google OAuth, you need to:")
    print("1. Set GOOGLE_CLIENT_ID environment variable")
    print("2. Implement Google Sign-In on the frontend")
    print("3. Send the ID token to /api/auth/google")
    print("\n")

if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("\n❌ Error: Could not connect to the backend server!")
        print("   Make sure the server is running on http://localhost:8000")
        print("\n   Start the server with:")
        print("   cd backend && uvicorn app.main:app --reload")
        print()

