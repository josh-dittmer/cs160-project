"""
Comprehensive test suite for authentication endpoints.
Tests signup, login, Google OAuth, and JWT token validation.
"""

import os
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, Base, engine
from app.models import User
from app.auth import get_password_hash

# Setup test client
client = TestClient(app)

# Test data
TEST_USER_EMAIL = "test@example.com"
TEST_USER_PASSWORD = "TestPassword@123!"
TEST_USER_NAME = "Test User"

GOOGLE_USER_EMAIL = "google@example.com"
GOOGLE_USER_ID = "google123456789"
GOOGLE_USER_NAME = "Google User"


def setup_module():
    """Setup test database before running tests"""
    Base.metadata.create_all(bind=engine)


def teardown_function():
    """Clean up test users after each test"""
    db = SessionLocal()
    try:
        db.query(User).filter(User.email.in_([TEST_USER_EMAIL, GOOGLE_USER_EMAIL])).delete(
            synchronize_session=False
        )
        db.commit()
    finally:
        db.close()


# ============ Signup Tests ============

def test_signup_success():
    """Test successful user registration"""
    response = client.post(
        "/api/auth/signup",
        json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "full_name": TEST_USER_NAME,
        },
    )
    
    assert response.status_code == 201
    data = response.json()
    
    # Check response structure
    assert "access_token" in data
    assert "token_type" in data
    assert data["token_type"] == "bearer"
    assert "user" in data
    
    # Check user data
    user = data["user"]
    assert user["email"] == TEST_USER_EMAIL
    assert user["full_name"] == TEST_USER_NAME
    assert user["is_active"] is True
    assert "id" in user
    assert "created_at" in user
    
    # Verify user in database
    db = SessionLocal()
    try:
        db_user = db.query(User).filter(User.email == TEST_USER_EMAIL).first()
        assert db_user is not None
        assert db_user.email == TEST_USER_EMAIL
        assert db_user.hashed_password is not None
    finally:
        db.close()


def test_signup_duplicate_email():
    """Test that duplicate email registration fails"""
    # First signup
    response1 = client.post(
        "/api/auth/signup",
        json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "full_name": TEST_USER_NAME,
        },
    )
    assert response1.status_code == 201
    
    # Try to signup with same email
    response2 = client.post(
        "/api/auth/signup",
        json={
            "email": TEST_USER_EMAIL,
            "password": "DifferentPass@123!",
            "full_name": "Different Name",
        },
    )
    assert response2.status_code == 400
    assert "already registered" in response2.json()["detail"].lower()


def test_signup_invalid_email():
    """Test that invalid email format fails"""
    response = client.post(
        "/api/auth/signup",
        json={
            "email": "not-an-email",
            "password": TEST_USER_PASSWORD,
        },
    )
    assert response.status_code == 422  # Validation error


def test_signup_short_password():
    """Test that short password fails validation"""
    response = client.post(
        "/api/auth/signup",
        json={
            "email": TEST_USER_EMAIL,
            "password": "Short@12345",  # Less than 14 characters
        },
    )
    assert response.status_code == 422  # Validation error


def test_signup_without_full_name():
    """Test that signup works without full_name (optional field)"""
    response = client.post(
        "/api/auth/signup",
        json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["user"]["full_name"] is None


# ============ Login Tests ============

def test_login_success():
    """Test successful login with correct credentials"""
    # First signup
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "full_name": TEST_USER_NAME,
        },
    )
    assert signup_response.status_code == 201
    
    # Then login
    login_response = client.post(
        "/api/auth/login",
        json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
        },
    )
    
    assert login_response.status_code == 200
    data = login_response.json()
    
    # Check response structure
    assert "access_token" in data
    assert "token_type" in data
    assert data["token_type"] == "bearer"
    assert "user" in data
    
    # Check user data
    user = data["user"]
    assert user["email"] == TEST_USER_EMAIL
    assert user["full_name"] == TEST_USER_NAME


def test_login_wrong_password():
    """Test that login fails with wrong password"""
    # First signup
    client.post(
        "/api/auth/signup",
        json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
        },
    )
    
    # Try to login with wrong password
    response = client.post(
        "/api/auth/login",
        json={
            "email": TEST_USER_EMAIL,
            "password": "wrongpassword123",
        },
    )
    assert response.status_code == 401
    assert "incorrect" in response.json()["detail"].lower()


def test_login_nonexistent_user():
    """Test that login fails for non-existent user"""
    response = client.post(
        "/api/auth/login",
        json={
            "email": "nonexistent@example.com",
            "password": TEST_USER_PASSWORD,
        },
    )
    assert response.status_code == 401
    assert "incorrect" in response.json()["detail"].lower()


def test_login_google_only_user():
    """Test that login fails for Google-only users (no password)"""
    # Create a user without password (Google-only)
    db = SessionLocal()
    try:
        user = User(
            email=TEST_USER_EMAIL,
            google_id="google123",
            full_name=TEST_USER_NAME,
            hashed_password=None,
        )
        db.add(user)
        db.commit()
    finally:
        db.close()
    
    # Try to login with password
    response = client.post(
        "/api/auth/login",
        json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
        },
    )
    assert response.status_code == 401


# ============ Google OAuth Tests ============

def test_google_auth_new_user():
    """Test Google OAuth for a new user"""
    mock_idinfo = {
        "sub": GOOGLE_USER_ID,
        "email": GOOGLE_USER_EMAIL,
        "name": GOOGLE_USER_NAME,
    }
    
    with patch("app.routers.auth.id_token.verify_oauth2_token") as mock_verify:
        with patch.dict(os.environ, {"GOOGLE_CLIENT_ID": "test-client-id"}):
            mock_verify.return_value = mock_idinfo
            
            response = client.post(
                "/api/auth/google",
                json={"id_token": "fake-google-token"},
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # Check response structure
            assert "access_token" in data
            assert "user" in data
            
            # Check user data
            user = data["user"]
            assert user["email"] == GOOGLE_USER_EMAIL
            assert user["full_name"] == GOOGLE_USER_NAME
            
            # Verify user in database
            db = SessionLocal()
            try:
                db_user = db.query(User).filter(User.email == GOOGLE_USER_EMAIL).first()
                assert db_user is not None
                assert db_user.google_id == GOOGLE_USER_ID
                assert db_user.hashed_password is None
            finally:
                db.close()


def test_google_auth_existing_user():
    """Test Google OAuth for existing user"""
    # Create existing user with Google ID
    db = SessionLocal()
    try:
        existing_user = User(
            email=GOOGLE_USER_EMAIL,
            google_id=GOOGLE_USER_ID,
            full_name=GOOGLE_USER_NAME,
        )
        db.add(existing_user)
        db.commit()
        user_id = existing_user.id
    finally:
        db.close()
    
    mock_idinfo = {
        "sub": GOOGLE_USER_ID,
        "email": GOOGLE_USER_EMAIL,
        "name": GOOGLE_USER_NAME,
    }
    
    with patch("app.routers.auth.id_token.verify_oauth2_token") as mock_verify:
        with patch.dict(os.environ, {"GOOGLE_CLIENT_ID": "test-client-id"}):
            mock_verify.return_value = mock_idinfo
            
            response = client.post(
                "/api/auth/google",
                json={"id_token": "fake-google-token"},
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["user"]["id"] == user_id
            assert data["user"]["email"] == GOOGLE_USER_EMAIL


def test_google_auth_link_existing_email():
    """Test Google OAuth links to existing email account"""
    # Create user with email but no Google ID
    db = SessionLocal()
    try:
        existing_user = User(
            email=GOOGLE_USER_EMAIL,
            hashed_password=get_password_hash("SomePassword@123!"),
            full_name=GOOGLE_USER_NAME,
        )
        db.add(existing_user)
        db.commit()
        user_id = existing_user.id
    finally:
        db.close()
    
    mock_idinfo = {
        "sub": GOOGLE_USER_ID,
        "email": GOOGLE_USER_EMAIL,
        "name": GOOGLE_USER_NAME,
    }
    
    with patch("app.routers.auth.id_token.verify_oauth2_token") as mock_verify:
        with patch.dict(os.environ, {"GOOGLE_CLIENT_ID": "test-client-id"}):
            mock_verify.return_value = mock_idinfo
            
            response = client.post(
                "/api/auth/google",
                json={"id_token": "fake-google-token"},
            )
            
            assert response.status_code == 200
            
            # Verify Google ID was added to existing user
            db = SessionLocal()
            try:
                db_user = db.query(User).filter(User.id == user_id).first()
                assert db_user.google_id == GOOGLE_USER_ID
                assert db_user.hashed_password is not None  # Password still exists
            finally:
                db.close()


def test_google_auth_invalid_token():
    """Test that invalid Google token fails"""
    with patch("app.routers.auth.id_token.verify_oauth2_token") as mock_verify:
        with patch.dict(os.environ, {"GOOGLE_CLIENT_ID": "test-client-id"}):
            mock_verify.side_effect = ValueError("Invalid token")
            
            response = client.post(
                "/api/auth/google",
                json={"id_token": "invalid-token"},
            )
            
            assert response.status_code == 401
            assert "invalid" in response.json()["detail"].lower()


def test_google_auth_no_client_id():
    """Test that Google OAuth fails when GOOGLE_CLIENT_ID is not configured"""
    from app.routers import auth as auth_module
    
    # Mock the module-level constant directly (env var is loaded at import time)
    with patch.object(auth_module, 'GOOGLE_CLIENT_ID', ''):
        response = client.post(
            "/api/auth/google",
            json={"id_token": "fake-token"},
        )
        
        assert response.status_code == 501
        assert "not configured" in response.json()["detail"].lower()


# ============ JWT Token Tests ============

def test_get_me_with_valid_token():
    """Test getting current user info with valid token"""
    # Signup to get token
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "full_name": TEST_USER_NAME,
        },
    )
    token = signup_response.json()["access_token"]
    
    # Get user info
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == TEST_USER_EMAIL
    assert data["full_name"] == TEST_USER_NAME


def test_get_me_without_token():
    """Test that /me endpoint fails without token"""
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_get_me_with_invalid_token():
    """Test that /me endpoint fails with invalid token"""
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid-token"},
    )
    assert response.status_code == 401


def test_token_expires():
    """Test that expired tokens are rejected"""
    from app.auth import create_access_token
    from datetime import timedelta
    
    # Create a user
    db = SessionLocal()
    try:
        user = User(
            email=TEST_USER_EMAIL,
            hashed_password=get_password_hash(TEST_USER_PASSWORD),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        user_id = user.id
    finally:
        db.close()
    
    # Create an expired token (expired 1 hour ago)
    expired_token = create_access_token(
        data={"sub": user_id},
        expires_delta=timedelta(hours=-1),
    )
    
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert response.status_code == 401


# ============ Integration Tests ============

def test_full_auth_flow():
    """Test complete authentication flow: signup -> login -> get user info"""
    # 1. Signup
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "full_name": TEST_USER_NAME,
        },
    )
    assert signup_response.status_code == 201
    signup_data = signup_response.json()
    signup_token = signup_data["access_token"]
    user_id = signup_data["user"]["id"]
    
    # 2. Get user info with signup token
    me_response1 = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {signup_token}"},
    )
    assert me_response1.status_code == 200
    assert me_response1.json()["id"] == user_id
    
    # 3. Login
    login_response = client.post(
        "/api/auth/login",
        json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
        },
    )
    assert login_response.status_code == 200
    login_token = login_response.json()["access_token"]
    
    # 4. Get user info with login token
    me_response2 = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {login_token}"},
    )
    assert me_response2.status_code == 200
    assert me_response2.json()["id"] == user_id
    
    # Both tokens should be valid (they may be the same if generated at same second)
    assert signup_token and login_token


def test_signup_and_google_link():
    """Test user signs up with password then links Google account"""
    # 1. Regular signup
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "full_name": TEST_USER_NAME,
        },
    )
    assert signup_response.status_code == 201
    user_id = signup_response.json()["user"]["id"]
    
    # 2. Login with Google (same email)
    mock_idinfo = {
        "sub": GOOGLE_USER_ID,
        "email": TEST_USER_EMAIL,
        "name": TEST_USER_NAME,
    }
    
    with patch("app.routers.auth.id_token.verify_oauth2_token") as mock_verify:
        with patch.dict(os.environ, {"GOOGLE_CLIENT_ID": "test-client-id"}):
            mock_verify.return_value = mock_idinfo
            
            google_response = client.post(
                "/api/auth/google",
                json={"id_token": "fake-google-token"},
            )
            
            assert google_response.status_code == 200
            assert google_response.json()["user"]["id"] == user_id
    
    # 3. Verify user can still login with password
    login_response = client.post(
        "/api/auth/login",
        json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
        },
    )
    assert login_response.status_code == 200
    assert login_response.json()["user"]["id"] == user_id

