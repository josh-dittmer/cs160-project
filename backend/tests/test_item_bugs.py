"""
Tests for item name duplication and title case bug fixes.

This test file verifies:
1. Duplicate item names are prevented (case-insensitive)
2. Auto-case formatting works correctly when enabled
3. Manual case control works when auto-case is disabled
4. Updates respect duplicate checking
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.models import User, Item


# Create in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing."""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


@pytest.fixture
def client():
    """Create test client and setup database."""
    Base.metadata.create_all(bind=engine)
    yield TestClient(app)
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def override_db_dependency():
    """
    Ensure get_db uses the in-memory SQLite session for these tests only,
    then restore the original dependency override afterwards.
    """
    previous_override = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = override_get_db
    try:
        yield
    finally:
        if previous_override is not None:
            app.dependency_overrides[get_db] = previous_override
        else:
            app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def admin_token(client):
    """Create an admin user and return their auth token."""
    db = TestingSessionLocal()
    
    # Create admin user
    from app.auth import get_password_hash
    admin = User(
        email="admin@test.com",
        hashed_password=get_password_hash("adminpass123"),
        full_name="Admin User",
        role="admin",
        is_active=True
    )
    db.add(admin)
    db.commit()
    db.close()
    
    # Login to get token
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@test.com", "password": "adminpass123"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def test_duplicate_item_names_prevented(client, admin_token):
    """Test that duplicate item names are prevented (case-insensitive)."""
    # Create first item
    response = client.post(
        "/api/admin/items",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"auto_case": True},
        json={
            "name": "apple",
            "price_cents": 150,
            "weight_oz": 6,
            "category": "fruit",
            "stock_qty": 100,
        }
    )
    assert response.status_code == 201
    first_item = response.json()
    assert first_item["name"] == "Apple"  # Auto-cased to Title Case
    
    # Try to create duplicate with different case
    response = client.post(
        "/api/admin/items",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"auto_case": True},
        json={
            "name": "APPLE",
            "price_cents": 200,
            "weight_oz": 7,
            "category": "fruit",
            "stock_qty": 50,
        }
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"].lower()


def test_auto_case_on_converts_to_title_case(client, admin_token):
    """Test that auto_case=True converts names to Title Case."""
    # Create item with lowercase name
    response = client.post(
        "/api/admin/items",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"auto_case": True},
        json={
            "name": "organic apples",
            "price_cents": 250,
            "weight_oz": 8,
            "category": "fruit",
            "stock_qty": 75,
        }
    )
    assert response.status_code == 201
    item = response.json()
    assert item["name"] == "Organic Apples"
    
    # Create item with mixed case
    response = client.post(
        "/api/admin/items",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"auto_case": True},
        json={
            "name": "oRgAniC bAnAnAs",
            "price_cents": 180,
            "weight_oz": 5,
            "category": "fruit",
            "stock_qty": 60,
        }
    )
    assert response.status_code == 201
    item = response.json()
    assert item["name"] == "Organic Bananas"


def test_auto_case_off_preserves_original_case(client, admin_token):
    """Test that auto_case=False preserves the original case."""
    # Create item with specific casing (like iPhone)
    response = client.post(
        "/api/admin/items",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"auto_case": False},
        json={
            "name": "iPhone 15",
            "price_cents": 99900,
            "weight_oz": 6,
            "category": "electronics",
            "stock_qty": 10,
        }
    )
    assert response.status_code == 201
    item = response.json()
    assert item["name"] == "iPhone 15"  # Case preserved
    
    # Create another item with all lowercase
    response = client.post(
        "/api/admin/items",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"auto_case": False},
        json={
            "name": "macbook pro",
            "price_cents": 199900,
            "weight_oz": 80,
            "category": "electronics",
            "stock_qty": 5,
        }
    )
    assert response.status_code == 201
    item = response.json()
    assert item["name"] == "macbook pro"  # Lowercase preserved


def test_update_duplicate_name_prevented(client, admin_token):
    """Test that renaming to a duplicate name is prevented."""
    # Create two items
    response1 = client.post(
        "/api/admin/items",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"auto_case": True},
        json={
            "name": "Banana",
            "price_cents": 100,
            "weight_oz": 4,
            "category": "fruit",
            "stock_qty": 100,
        }
    )
    assert response1.status_code == 201
    item1 = response1.json()
    
    response2 = client.post(
        "/api/admin/items",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"auto_case": True},
        json={
            "name": "Orange",
            "price_cents": 150,
            "weight_oz": 5,
            "category": "fruit",
            "stock_qty": 80,
        }
    )
    assert response2.status_code == 201
    item2 = response2.json()
    
    # Try to rename item2 to "banana" (should fail due to case-insensitive duplicate check)
    response = client.put(
        f"/api/admin/items/{item2['id']}",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"auto_case": True},
        json={
            "name": "banana",
        }
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"].lower()


def test_update_with_auto_case(client, admin_token):
    """Test that updating with auto_case applies Title Case."""
    # Create item
    response = client.post(
        "/api/admin/items",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"auto_case": True},
        json={
            "name": "Peach",
            "price_cents": 120,
            "weight_oz": 4,
            "category": "fruit",
            "stock_qty": 50,
        }
    )
    assert response.status_code == 201
    item = response.json()
    
    # Update with lowercase name and auto_case=True
    response = client.put(
        f"/api/admin/items/{item['id']}",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"auto_case": True},
        json={
            "name": "fresh peaches",
        }
    )
    assert response.status_code == 200
    updated_item = response.json()
    assert updated_item["name"] == "Fresh Peaches"


def test_update_with_auto_case_off(client, admin_token):
    """Test that updating with auto_case=False preserves case."""
    # Create item
    response = client.post(
        "/api/admin/items",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"auto_case": True},
        json={
            "name": "Generic Product",
            "price_cents": 500,
            "weight_oz": 10,
            "category": "other",
            "stock_qty": 25,
        }
    )
    assert response.status_code == 201
    item = response.json()
    
    # Update with specific casing and auto_case=False
    response = client.put(
        f"/api/admin/items/{item['id']}",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"auto_case": False},
        json={
            "name": "iPad Pro",
        }
    )
    assert response.status_code == 200
    updated_item = response.json()
    assert updated_item["name"] == "iPad Pro"  # Case preserved


def test_same_item_can_keep_name_on_update(client, admin_token):
    """Test that an item can be updated without changing its name."""
    # Create item
    response = client.post(
        "/api/admin/items",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"auto_case": True},
        json={
            "name": "Mango",
            "price_cents": 200,
            "weight_oz": 8,
            "category": "fruit",
            "stock_qty": 40,
        }
    )
    assert response.status_code == 201
    item = response.json()
    
    # Update price only (name unchanged)
    response = client.put(
        f"/api/admin/items/{item['id']}",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"auto_case": True},
        json={
            "price_cents": 250,
        }
    )
    assert response.status_code == 200
    updated_item = response.json()
    assert updated_item["name"] == "Mango"
    assert updated_item["price_cents"] == 250


def test_special_characters_in_names(client, admin_token):
    """Test that special characters and apostrophes are handled correctly."""
    # Test with apostrophe
    response = client.post(
        "/api/admin/items",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"auto_case": True},
        json={
            "name": "ben & jerry's ice cream",
            "price_cents": 599,
            "weight_oz": 16,
            "category": "frozen",
            "stock_qty": 30,
        }
    )
    assert response.status_code == 201
    item = response.json()
    # string.capwords handles apostrophes correctly
    assert item["name"] == "Ben & Jerry's Ice Cream"
    
    # Test with hyphen
    response = client.post(
        "/api/admin/items",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"auto_case": True},
        json={
            "name": "coca-cola",
            "price_cents": 199,
            "weight_oz": 12,
            "category": "beverages",
            "stock_qty": 100,
        }
    )
    assert response.status_code == 201
    item = response.json()
    # smart_title_case handles hyphens correctly: "coca-cola" -> "Coca-Cola"
    assert item["name"] == "Coca-Cola"
    
    # Test with both hyphen and apostrophe
    response = client.post(
        "/api/admin/items",
        headers={"Authorization": f"Bearer {admin_token}"},
        params={"auto_case": True},
        json={
            "name": "coca-cola's new taste",
            "price_cents": 299,
            "weight_oz": 12,
            "category": "beverages",
            "stock_qty": 75,
        }
    )
    assert response.status_code == 201
    item = response.json()
    # smart_title_case handles both: "coca-cola's new taste" -> "Coca-Cola's New Taste"
    assert item["name"] == "Coca-Cola's New Taste"

