import requests
import pytest
import uuid

BASE_URL = "http://localhost:8080"
ADMIN_EMAIL = "admin@sjsu.edu"
ADMIN_PASSWORD = "Admin@1234567890"


@pytest.fixture
def admin_token():
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code != 200:
        pytest.skip(f"Failed to get admin token. Backend may not be running on {BASE_URL}")
    return response.json().get("access_token")


@pytest.fixture
def customer_token():
    unique_email = f"test_customer_{uuid.uuid4().hex[:8]}@test.com"
    signup_response = requests.post(
        f"{BASE_URL}/api/auth/signup",
        json={
            "email": unique_email,
            "password": "TestPassword123!@#",
            "full_name": "Test Customer"
        }
    )
    if signup_response.status_code not in [200, 201]:
        pytest.skip(f"Failed to create test customer: {signup_response.json()}")
    return signup_response.json().get("access_token")


@pytest.fixture
def test_item(admin_token):
    unique_suffix = ''.join([chr(97 + (ord(c) % 26)) for c in uuid.uuid4().hex[:8]])
    unique_name = f"Favorites Test {unique_suffix}"
    response = requests.post(
        f"{BASE_URL}/api/admin/items",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": unique_name,
            "price_cents": 999,
            "weight_oz": 16,
            "category": "Test"
        }
    )
    if response.status_code not in [200, 201]:
        pytest.skip(f"Failed to create test item: {response.json()}")
    return response.json()


def test_favorites_excludes_deactivated_items(admin_token, customer_token, test_item):
    customer_headers = {"Authorization": f"Bearer {customer_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    item_id = test_item["id"]
    
    add_response = requests.post(
        f"{BASE_URL}/api/favorites/{item_id}",
        headers=customer_headers
    )
    assert add_response.status_code == 200
    
    get_response = requests.get(
        f"{BASE_URL}/api/favorites/",
        headers=customer_headers
    )
    assert get_response.status_code == 200
    favorites = get_response.json()
    assert any(fav["id"] == item_id for fav in favorites)
    
    deactivate_response = requests.put(
        f"{BASE_URL}/api/admin/items/{item_id}/activate",
        headers=admin_headers,
        json={"is_active": False}
    )
    assert deactivate_response.status_code == 200
    
    get_response_after = requests.get(
        f"{BASE_URL}/api/favorites/",
        headers=customer_headers
    )
    assert get_response_after.status_code == 200
    favorites_after = get_response_after.json()
    assert not any(fav["id"] == item_id for fav in favorites_after)


def test_cannot_favorite_deactivated_item(admin_token, customer_token, test_item):
    customer_headers = {"Authorization": f"Bearer {customer_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    item_id = test_item["id"]
    
    deactivate_response = requests.put(
        f"{BASE_URL}/api/admin/items/{item_id}/activate",
        headers=admin_headers,
        json={"is_active": False}
    )
    assert deactivate_response.status_code == 200
    
    add_response = requests.post(
        f"{BASE_URL}/api/favorites/{item_id}",
        headers=customer_headers
    )
    assert add_response.status_code == 400
    assert "deactivated" in add_response.json()["detail"].lower()
