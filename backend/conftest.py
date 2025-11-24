"""Pytest configuration and shared fixtures."""
import sys
from pathlib import Path
import pytest
import requests

# Add backend directory to Python path so tests can import app
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Test configuration
BASE_URL = "http://localhost:8080"
ADMIN_EMAIL = "admin@sjsu.edu"
ADMIN_PASSWORD = "admin123"


@pytest.fixture
def admin_token():
    """
    Fixture that provides a valid admin JWT token.
    Logs in as admin and returns the access token.
    """
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    
    if response.status_code != 200:
        pytest.skip(f"Failed to get admin token. Backend may not be running on {BASE_URL}")
    
    token = response.json().get("access_token")
    if not token:
        pytest.skip("Admin token not found in response")
    
    return token


@pytest.fixture
def headers(admin_token):
    """
    Fixture that provides authorization headers with admin token.
    """
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def base_url():
    """
    Fixture that provides the API base URL.
    """
    return BASE_URL
