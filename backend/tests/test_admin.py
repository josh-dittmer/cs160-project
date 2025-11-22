"""
Comprehensive test suite for admin RBAC functionality.
Tests admin authentication, user management, inventory CRUD, and single admin model.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, Base, engine
from app.models import User, Item
from app.auth import get_password_hash

# Setup test client
client = TestClient(app)

# Test data
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "admin123"

TEST_USER_EMAIL = "user@test.com"
TEST_USER_PASSWORD = "userpass123"

MANAGER_EMAIL = "manager@test.com"
EMPLOYEE_EMAIL = "employee@test.com"


def setup_module():
    """Setup test database before running tests"""
    Base.metadata.create_all(bind=engine)


def teardown_function():
    """Clean up test data after each test"""
    db = SessionLocal()
    try:
        # Clean up users (except seeded admin)
        db.query(User).filter(
            User.email.in_([ADMIN_EMAIL, TEST_USER_EMAIL, MANAGER_EMAIL, EMPLOYEE_EMAIL])
        ).delete(synchronize_session=False)
        
        # Clean up test items
        db.query(Item).filter(Item.name.like("Test%")).delete(synchronize_session=False)
        
        db.commit()
    finally:
        db.close()


def create_test_admin(db):
    """Helper: Create test admin user"""
    admin = User(
        email=ADMIN_EMAIL,
        hashed_password=get_password_hash(ADMIN_PASSWORD),
        full_name="Test Admin",
        role="admin",
        is_active=True
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


def create_test_user(db, email=TEST_USER_EMAIL, role="customer"):
    """Helper: Create test user with specified role"""
    user = User(
        email=email,
        hashed_password=get_password_hash(TEST_USER_PASSWORD),
        full_name="Test User",
        role=role,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_admin_token():
    """Helper: Login as admin and get JWT token"""
    db = SessionLocal()
    try:
        # Create admin if doesn't exist
        existing_admin = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if not existing_admin:
            create_test_admin(db)
    finally:
        db.close()
    
    response = client.post(
        "/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def get_user_token():
    """Helper: Login as regular user and get JWT token"""
    db = SessionLocal()
    try:
        existing_user = db.query(User).filter(User.email == TEST_USER_EMAIL).first()
        if not existing_user:
            create_test_user(db)
    finally:
        db.close()
    
    response = client.post(
        "/api/auth/login",
        json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


# ============ Authentication & Authorization Tests ============

def test_admin_endpoints_require_authentication():
    """Test that admin endpoints require authentication"""
    # Try to access without token
    response = client.get("/api/admin/users")
    assert response.status_code == 401
    assert "Not authenticated" in response.json()["detail"]


def test_admin_endpoints_require_admin_role():
    """Test that admin endpoints require admin role"""
    # Create regular user and get token
    token = get_user_token()
    
    # Try to access admin endpoint with regular user token
    response = client.get(
        "/api/admin/users",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403
    assert "Admin access required" in response.json()["detail"]


def test_admin_can_access_admin_endpoints():
    """Test that admin can access admin endpoints"""
    token = get_admin_token()
    
    response = client.get(
        "/api/admin/users",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


# ============ User Management Tests ============

def test_admin_can_list_all_users():
    """Test admin can list all users"""
    db = SessionLocal()
    try:
        # Create test users with different roles
        create_test_user(db, TEST_USER_EMAIL, "customer")
        create_test_user(db, MANAGER_EMAIL, "manager")
        create_test_user(db, EMPLOYEE_EMAIL, "employee")
    finally:
        db.close()
    
    token = get_admin_token()
    
    response = client.get(
        "/api/admin/users",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    users = response.json()
    assert len(users) >= 3  # At least our test users


def test_admin_can_change_user_role():
    """Test admin can change user role"""
    db = SessionLocal()
    try:
        user = create_test_user(db, TEST_USER_EMAIL, "customer")
        user_id = user.id
    finally:
        db.close()
    
    token = get_admin_token()
    
    # Change role from customer to manager
    response = client.put(
        f"/api/admin/users/{user_id}/role",
        headers={"Authorization": f"Bearer {token}"},
        json={"role": "manager"}
    )
    assert response.status_code == 200
    assert response.json()["user"]["role"] == "manager"
    
    # Verify role was changed in database
    db = SessionLocal()
    try:
        updated_user = db.get(User, user_id)
        assert updated_user.role == "manager"
    finally:
        db.close()


def test_admin_cannot_promote_to_admin():
    """Test single admin model - cannot create additional admins"""
    db = SessionLocal()
    try:
        user = create_test_user(db, TEST_USER_EMAIL, "customer")
        user_id = user.id
    finally:
        db.close()
    
    token = get_admin_token()
    
    # Try to promote user to admin
    response = client.put(
        f"/api/admin/users/{user_id}/role",
        headers={"Authorization": f"Bearer {token}"},
        json={"role": "admin"}
    )
    assert response.status_code == 403
    assert "Only one admin is allowed" in response.json()["detail"]
    
    # Verify role was NOT changed
    db = SessionLocal()
    try:
        user = db.get(User, user_id)
        assert user.role == "customer"
    finally:
        db.close()


def test_admin_cannot_change_own_role():
    """Test admin cannot demote themselves"""
    token = get_admin_token()
    
    # Get admin user ID
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    admin_id = response.json()["id"]
    
    # Try to change own role
    response = client.put(
        f"/api/admin/users/{admin_id}/role",
        headers={"Authorization": f"Bearer {token}"},
        json={"role": "customer"}
    )
    assert response.status_code == 400
    assert "Cannot change your own role" in response.json()["detail"]


def test_admin_can_block_user():
    """Test admin can block/unblock users"""
    db = SessionLocal()
    try:
        user = create_test_user(db, TEST_USER_EMAIL, "customer")
        user_id = user.id
    finally:
        db.close()
    
    token = get_admin_token()
    
    # Block user
    response = client.put(
        f"/api/admin/users/{user_id}/block",
        headers={"Authorization": f"Bearer {token}"},
        json={"is_active": False}
    )
    assert response.status_code == 200
    assert response.json()["user"]["is_active"] == False
    
    # Unblock user
    response = client.put(
        f"/api/admin/users/{user_id}/block",
        headers={"Authorization": f"Bearer {token}"},
        json={"is_active": True}
    )
    assert response.status_code == 200
    assert response.json()["user"]["is_active"] == True


def test_admin_cannot_block_themselves():
    """Test admin cannot block themselves"""
    token = get_admin_token()
    
    # Get admin user ID
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    admin_id = response.json()["id"]
    
    # Try to block self
    response = client.put(
        f"/api/admin/users/{admin_id}/block",
        headers={"Authorization": f"Bearer {token}"},
        json={"is_active": False}
    )
    assert response.status_code == 400
    assert "Cannot block yourself" in response.json()["detail"]


# ============ Inventory Management Tests ============

def test_admin_can_list_items():
    """Test admin can list items with filters"""
    token = get_admin_token()
    
    response = client.get(
        "/api/admin/items",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_admin_can_list_items_with_filters():
    """Test admin can filter items by status"""
    token = get_admin_token()
    
    # Test filtering by status
    response = client.get(
        "/api/admin/items?status=active",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    items = response.json()
    if items:
        assert all(item["is_active"] for item in items)
    
    # Test filtering by category
    response = client.get(
        "/api/admin/items?category=fruits",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200


def test_admin_can_create_item():
    """Test admin can create new items"""
    token = get_admin_token()
    
    new_item = {
        "name": "Test Product",
        "price_cents": 999,
        "weight_oz": 16,
        "category": "test",
        "description": "Test description",
        "stock_qty": 50,
        "is_active": True
    }
    
    response = client.post(
        "/api/admin/items",
        headers={"Authorization": f"Bearer {token}"},
        json=new_item
    )
    assert response.status_code == 201
    created = response.json()
    assert created["name"] == "Test Product"
    assert created["price_cents"] == 999
    assert created["is_active"] == True


def test_admin_can_create_item_with_nutrition():
    """Test admin can create items with nutrition information"""
    token = get_admin_token()
    
    nutrition_data = {
        "calories": 150,
        "protein": {"value": 5, "unit": "g"},
        "totalFat": {"value": 2, "unit": "g"},
        "sodium": {"value": 100, "unit": "mg"}
    }
    
    new_item = {
        "name": "Test Product With Nutrition",
        "price_cents": 799,
        "weight_oz": 12,
        "category": "test",
        "description": "Test product with nutrition info",
        "nutrition_json": str(nutrition_data).replace("'", '"'),  # Convert to JSON string
        "stock_qty": 40,
        "is_active": True
    }
    
    response = client.post(
        "/api/admin/items",
        headers={"Authorization": f"Bearer {token}"},
        json=new_item
    )
    assert response.status_code == 201
    created = response.json()
    assert created["name"] == "Test Product With Nutrition"
    assert created["nutrition_json"] is not None
    assert "calories" in created["nutrition_json"]


def test_admin_can_update_item():
    """Test admin can update existing items"""
    token = get_admin_token()
    
    # Create item first
    new_item = {
        "name": "Test Item For Update",
        "price_cents": 500,
        "weight_oz": 10,
        "stock_qty": 20
    }
    
    create_response = client.post(
        "/api/admin/items",
        headers={"Authorization": f"Bearer {token}"},
        json=new_item
    )
    item_id = create_response.json()["id"]
    
    # Update item
    update_data = {
        "price_cents": 600,
        "stock_qty": 30
    }
    
    response = client.put(
        f"/api/admin/items/{item_id}",
        headers={"Authorization": f"Bearer {token}"},
        json=update_data
    )
    assert response.status_code == 200
    updated = response.json()
    assert updated["price_cents"] == 600
    assert updated["stock_qty"] == 30
    assert updated["name"] == "Test Item For Update"  # Unchanged


def test_admin_can_deactivate_item():
    """Test admin can deactivate (soft delete) items"""
    token = get_admin_token()
    
    # Create item first
    new_item = {
        "name": "Test Item To Deactivate",
        "price_cents": 300,
        "weight_oz": 8,
        "stock_qty": 10
    }
    
    create_response = client.post(
        "/api/admin/items",
        headers={"Authorization": f"Bearer {token}"},
        json=new_item
    )
    item_id = create_response.json()["id"]
    
    # Deactivate item
    response = client.delete(
        f"/api/admin/items/{item_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["ok"] == True
    
    # Verify item is deactivated
    get_response = client.get(
        f"/api/admin/items/{item_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert get_response.json()["is_active"] == False


def test_admin_can_reactivate_item():
    """Test admin can reactivate deactivated items"""
    token = get_admin_token()
    
    # Create and deactivate item
    new_item = {
        "name": "Test Item To Reactivate",
        "price_cents": 400,
        "weight_oz": 12,
        "stock_qty": 15
    }
    
    create_response = client.post(
        "/api/admin/items",
        headers={"Authorization": f"Bearer {token}"},
        json=new_item
    )
    item_id = create_response.json()["id"]
    
    # Deactivate
    client.delete(
        f"/api/admin/items/{item_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    # Reactivate
    response = client.put(
        f"/api/admin/items/{item_id}/activate",
        headers={"Authorization": f"Bearer {token}"},
        json={"is_active": True}
    )
    assert response.status_code == 200
    assert response.json()["is_active"] == True


def test_admin_items_default_to_active_filter():
    """Test that admin items endpoint defaults to showing active items only"""
    token = get_admin_token()
    
    # The default behavior should filter to active items
    # This is tested by checking that when we don't specify status,
    # we get the same result as when we explicitly ask for active
    response_default = client.get(
        "/api/admin/items",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    response_active = client.get(
        "/api/admin/items?status=active",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response_default.status_code == 200
    assert response_active.status_code == 200
    
    # Both should return only active items
    default_items = response_default.json()
    active_items = response_active.json()
    
    if default_items:
        assert all(item["is_active"] for item in default_items)
    if active_items:
        assert all(item["is_active"] for item in active_items)


# ============ Edge Cases & Error Handling ============

def test_update_nonexistent_user_role():
    """Test updating role of nonexistent user"""
    token = get_admin_token()
    
    response = client.put(
        "/api/admin/users/99999/role",
        headers={"Authorization": f"Bearer {token}"},
        json={"role": "manager"}
    )
    assert response.status_code == 404


def test_block_nonexistent_user():
    """Test blocking nonexistent user"""
    token = get_admin_token()
    
    response = client.put(
        "/api/admin/users/99999/block",
        headers={"Authorization": f"Bearer {token}"},
        json={"is_active": False}
    )
    assert response.status_code == 404


def test_invalid_role_rejected():
    """Test that invalid roles are rejected"""
    db = SessionLocal()
    try:
        user = create_test_user(db, TEST_USER_EMAIL, "customer")
        user_id = user.id
    finally:
        db.close()
    
    token = get_admin_token()
    
    # Try to set invalid role
    response = client.put(
        f"/api/admin/users/{user_id}/role",
        headers={"Authorization": f"Bearer {token}"},
        json={"role": "superuser"}  # Invalid role
    )
    assert response.status_code == 422  # Validation error


def test_get_nonexistent_item():
    """Test getting nonexistent item"""
    token = get_admin_token()
    
    response = client.get(
        "/api/admin/items/99999",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 404


def test_update_nonexistent_item():
    """Test updating nonexistent item"""
    token = get_admin_token()
    
    response = client.put(
        "/api/admin/items/99999",
        headers={"Authorization": f"Bearer {token}"},
        json={"price_cents": 100}
    )
    assert response.status_code == 404


def test_cannot_create_item_with_zero_weight():
    """Test that creating an item with weight = 0 fails"""
    token = get_admin_token()
    
    new_item = {
        "name": "Test Zero Weight",
        "price_cents": 999,
        "weight_oz": 0,  # Invalid: weight must be > 0
        "category": "test",
        "stock_qty": 10
    }
    
    response = client.post(
        "/api/admin/items",
        headers={"Authorization": f"Bearer {token}"},
        json=new_item
    )
    assert response.status_code == 422  # Validation error
    assert "weight_oz" in str(response.json())


def test_cannot_create_item_with_negative_weight():
    """Test that creating an item with negative weight fails"""
    token = get_admin_token()
    
    new_item = {
        "name": "Test Negative Weight",
        "price_cents": 999,
        "weight_oz": -5,  # Invalid: weight must be > 0
        "category": "test",
        "stock_qty": 10
    }
    
    response = client.post(
        "/api/admin/items",
        headers={"Authorization": f"Bearer {token}"},
        json=new_item
    )
    assert response.status_code == 422  # Validation error
    assert "weight_oz" in str(response.json())


def test_cannot_create_item_with_zero_price():
    """Test that creating an item with price = 0 fails"""
    token = get_admin_token()
    
    new_item = {
        "name": "Test Zero Price",
        "price_cents": 0,  # Invalid: price must be > 0
        "weight_oz": 10,
        "category": "test",
        "stock_qty": 10
    }
    
    response = client.post(
        "/api/admin/items",
        headers={"Authorization": f"Bearer {token}"},
        json=new_item
    )
    assert response.status_code == 422  # Validation error
    assert "price_cents" in str(response.json())


def test_cannot_update_item_to_zero_weight():
    """Test that updating an item to weight = 0 fails"""
    token = get_admin_token()
    
    # Create valid item first
    new_item = {
        "name": "Test Item For Weight Update",
        "price_cents": 500,
        "weight_oz": 10,
        "stock_qty": 20
    }
    
    create_response = client.post(
        "/api/admin/items",
        headers={"Authorization": f"Bearer {token}"},
        json=new_item
    )
    item_id = create_response.json()["id"]
    
    # Try to update weight to 0
    update_data = {"weight_oz": 0}  # Invalid
    
    response = client.put(
        f"/api/admin/items/{item_id}",
        headers={"Authorization": f"Bearer {token}"},
        json=update_data
    )
    assert response.status_code == 422  # Validation error
    assert "weight_oz" in str(response.json())


def test_cannot_update_item_to_zero_price():
    """Test that updating an item to price = 0 fails"""
    token = get_admin_token()
    
    # Create valid item first
    new_item = {
        "name": "Test Item For Price Update",
        "price_cents": 500,
        "weight_oz": 10,
        "stock_qty": 20
    }
    
    create_response = client.post(
        "/api/admin/items",
        headers={"Authorization": f"Bearer {token}"},
        json=new_item
    )
    item_id = create_response.json()["id"]
    
    # Try to update price to 0
    update_data = {"price_cents": 0}  # Invalid
    
    response = client.put(
        f"/api/admin/items/{item_id}",
        headers={"Authorization": f"Bearer {token}"},
        json=update_data
    )
    assert response.status_code == 422  # Validation error
    assert "price_cents" in str(response.json())


# ============ Integration Tests ============

def test_full_user_lifecycle():
    """Test complete user management lifecycle"""
    token = get_admin_token()
    
    # Create user via signup
    signup_response = client.post(
        "/api/auth/signup",
        json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "full_name": "Lifecycle Test User"
        }
    )
    assert signup_response.status_code == 201
    user_data = signup_response.json()["user"]
    user_id = user_data["id"]
    assert user_data["role"] == "customer"  # Default role
    
    # Admin promotes to employee
    promote_response = client.put(
        f"/api/admin/users/{user_id}/role",
        headers={"Authorization": f"Bearer {token}"},
        json={"role": "employee"}
    )
    assert promote_response.status_code == 200
    assert promote_response.json()["user"]["role"] == "employee"
    
    # Admin promotes to manager
    promote_response = client.put(
        f"/api/admin/users/{user_id}/role",
        headers={"Authorization": f"Bearer {token}"},
        json={"role": "manager"}
    )
    assert promote_response.status_code == 200
    assert promote_response.json()["user"]["role"] == "manager"
    
    # Admin blocks user
    block_response = client.put(
        f"/api/admin/users/{user_id}/block",
        headers={"Authorization": f"Bearer {token}"},
        json={"is_active": False}
    )
    assert block_response.status_code == 200
    assert block_response.json()["user"]["is_active"] == False


def test_full_item_lifecycle():
    """Test complete inventory management lifecycle"""
    token = get_admin_token()
    
    # Create item
    create_data = {
        "name": "Test Lifecycle Product",
        "price_cents": 1299,
        "weight_oz": 24,
        "category": "test",
        "description": "Full lifecycle test",
        "stock_qty": 100,
        "is_active": True
    }
    
    create_response = client.post(
        "/api/admin/items",
        headers={"Authorization": f"Bearer {token}"},
        json=create_data
    )
    assert create_response.status_code == 201
    item = create_response.json()
    item_id = item["id"]
    
    # Update item
    update_response = client.put(
        f"/api/admin/items/{item_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"price_cents": 999, "stock_qty": 50}
    )
    assert update_response.status_code == 200
    assert update_response.json()["price_cents"] == 999
    
    # Deactivate item
    delete_response = client.delete(
        f"/api/admin/items/{item_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert delete_response.status_code == 200
    
    # Verify item is inactive
    get_response = client.get(
        f"/api/admin/items/{item_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert get_response.json()["is_active"] == False
    
    # Reactivate item
    activate_response = client.put(
        f"/api/admin/items/{item_id}/activate",
        headers={"Authorization": f"Bearer {token}"},
        json={"is_active": True}
    )
    assert activate_response.status_code == 200
    assert activate_response.json()["is_active"] == True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

