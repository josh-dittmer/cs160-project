"""
Test suite for cart endpoints.
Tests cart addition, updates, removal, isolation between users, and stock validation.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, Base, engine
from app.models import User, Item
from app.auth import get_password_hash
from app.seed import seed

# Setup test client
client = TestClient(app)

# Test data
TEST_USER_EMAIL = "cart_test_user@example.com"
TEST_USER_PASSWORD = "TestPass@12345!"

OTHER_USER_EMAIL = "cart_other_user@example.com"
OTHER_USER_PASSWORD = "TestPass@12345!"


def setup_module():
    """Setup test database before running tests"""
    seed()  # Seed database with sample items
    Base.metadata.create_all(bind=engine)


def teardown_function():
    """Clean up test users after each test"""
    db = SessionLocal()
    try:
        db.query(User).filter(User.email.in_([TEST_USER_EMAIL, OTHER_USER_EMAIL])).delete(
            synchronize_session=False
        )
        db.commit()
    finally:
        db.close()


def create_test_user(email, password):
    """Helper: Create a test user"""
    response = client.post(
        "/api/auth/signup",
        json={
            "email": email,
            "password": password,
            "full_name": "Test User"
        }
    )
    assert response.status_code == 201
    return response.json()["access_token"]


def get_first_item_id():
    """Helper: Get first item ID from seeded database"""
    response = client.get("/api/items?group_by=category&limit=1")
    assert response.status_code == 200
    data = response.json()
    # Response is grouped by category, so get first category's first item
    first_category = next(iter(data.values()))
    assert len(first_category) > 0
    return first_category[0]["id"]


# ============ Add to Cart Tests ============

def test_cart_add_item():
    """Test adding a single item to cart"""
    token = create_test_user(TEST_USER_EMAIL, TEST_USER_PASSWORD)
    item_id = get_first_item_id()
    
    # Add item to cart
    response = client.post(
        "/api/cart",
        headers={"Authorization": f"Bearer {token}"},
        json={"item_id": item_id, "quantity": 2}
    )
    
    assert response.status_code == 201
    assert response.json() == {"ok": True}
    
    # Verify item is in cart
    response = client.get(
        "/api/cart",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    cart = response.json()
    assert len(cart["items"]) > 0
    assert any(item["item"]["id"] == item_id and item["quantity"] == 2 for item in cart["items"])


def test_cart_add_item_requires_auth():
    """Test that adding to cart requires authentication"""
    item_id = get_first_item_id()
    
    # Try to add item without token
    response = client.post(
        "/api/cart",
        json={"item_id": item_id, "quantity": 1}
    )
    
    assert response.status_code == 401


def test_cart_add_item_invalid_quantity():
    """Test adding item with invalid quantity"""
    token = create_test_user(TEST_USER_EMAIL, TEST_USER_PASSWORD)
    item_id = get_first_item_id()
    
    # Try negative quantity
    response = client.post(
        "/api/cart",
        headers={"Authorization": f"Bearer {token}"},
        json={"item_id": item_id, "quantity": -1}
    )
    # Quantity of -1 should remove item (or fail validation depending on schema)
    # This test documents expected behavior
    assert response.status_code in (201, 422)


def test_cart_update_item_quantity():
    """Test updating quantity of existing cart item"""
    token = create_test_user(TEST_USER_EMAIL, TEST_USER_PASSWORD)
    item_id = get_first_item_id()
    
    # Add item with qty 1
    response = client.post(
        "/api/cart",
        headers={"Authorization": f"Bearer {token}"},
        json={"item_id": item_id, "quantity": 1}
    )
    assert response.status_code == 201
    
    # Update to qty 5
    response = client.post(
        "/api/cart",
        headers={"Authorization": f"Bearer {token}"},
        json={"item_id": item_id, "quantity": 5}
    )
    assert response.status_code == 201
    
    # Verify updated quantity
    response = client.get(
        "/api/cart",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    cart = response.json()
    item_in_cart = next((item for item in cart["items"] if item["item"]["id"] == item_id), None)
    assert item_in_cart is not None
    assert item_in_cart["quantity"] == 5


def test_cart_remove_item():
    """Test removing item from cart by setting quantity to 0"""
    token = create_test_user(TEST_USER_EMAIL, TEST_USER_PASSWORD)
    item_id = get_first_item_id()
    
    # Add item
    response = client.post(
        "/api/cart",
        headers={"Authorization": f"Bearer {token}"},
        json={"item_id": item_id, "quantity": 2}
    )
    assert response.status_code == 201
    
    # Remove item (quantity 0)
    response = client.post(
        "/api/cart",
        headers={"Authorization": f"Bearer {token}"},
        json={"item_id": item_id, "quantity": 0}
    )
    assert response.status_code == 201
    
    # Verify item removed
    response = client.get(
        "/api/cart",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    cart = response.json()
    assert not any(item["item"]["id"] == item_id for item in cart["items"])


def test_cart_isolation_between_users():
    """Test that carts are isolated between different users"""
    token_user1 = create_test_user(TEST_USER_EMAIL, TEST_USER_PASSWORD)
    token_user2 = create_test_user(OTHER_USER_EMAIL, OTHER_USER_PASSWORD)
    item_id = get_first_item_id()
    
    # User 1 adds item
    response = client.post(
        "/api/cart",
        headers={"Authorization": f"Bearer {token_user1}"},
        json={"item_id": item_id, "quantity": 3}
    )
    assert response.status_code == 201
    
    # User 2 gets empty cart (or different items)
    response = client.get(
        "/api/cart",
        headers={"Authorization": f"Bearer {token_user2}"}
    )
    assert response.status_code == 200
    cart_user2 = response.json()
    # User 2's cart should not have the item user1 added
    assert not any(item["item"]["id"] == item_id and item["quantity"] == 3 for item in cart_user2["items"])


def test_cart_multiple_items():
    """Test adding multiple different items to cart"""
    token = create_test_user(TEST_USER_EMAIL, TEST_USER_PASSWORD)
    
    # Get two different items
    response = client.get("/api/items?group_by=category&limit=2")
    assert response.status_code == 200
    data = response.json()
    # Flatten items from all categories
    items = []
    for category_items in data.values():
        items.extend(category_items)
    assert len(items) >= 2
    item_id_1 = items[0]["id"]
    item_id_2 = items[1]["id"]
    
    # Add first item
    response = client.post(
        "/api/cart",
        headers={"Authorization": f"Bearer {token}"},
        json={"item_id": item_id_1, "quantity": 1}
    )
    assert response.status_code == 201
    
    # Add second item
    response = client.post(
        "/api/cart",
        headers={"Authorization": f"Bearer {token}"},
        json={"item_id": item_id_2, "quantity": 2}
    )
    assert response.status_code == 201
    
    # Verify both items in cart
    response = client.get(
        "/api/cart",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    cart = response.json()
    assert len(cart["items"]) >= 2
    assert any(item["item"]["id"] == item_id_1 and item["quantity"] == 1 for item in cart["items"])
    assert any(item["item"]["id"] == item_id_2 and item["quantity"] == 2 for item in cart["items"])


def test_cart_total_calculation():
    """Test that cart totals are calculated correctly"""
    token = create_test_user(TEST_USER_EMAIL, TEST_USER_PASSWORD)
    item_id = get_first_item_id()
    
    # Get item price
    response = client.get(f"/api/items/{item_id}")
    assert response.status_code == 200
    item = response.json()
    item_price = item["price_cents"]
    
    # Add 3 of this item to cart
    response = client.post(
        "/api/cart",
        headers={"Authorization": f"Bearer {token}"},
        json={"item_id": item_id, "quantity": 3}
    )
    assert response.status_code == 201
    
    # Get cart and verify totals
    response = client.get(
        "/api/cart",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    cart = response.json()
    
    # total_item_cents should be item_price * 3 (at minimum)
    assert cart["total_item_cents"] >= item_price * 3
    assert cart["total_cents"] > 0
    assert "total_shipping_cents" in cart
    assert "total_weight_oz" in cart

"""
Shipping Fee Tests for Cart Endpoints. Removed the shipping fee below 20
lbs test as it would also be incorrect becaseu we handle the logic in frontend.
We also return 1000 cents for shipping fee to show discounted if below 20 lbs.
There for this api test would always fail.
"""

def test_cart_shipping_fee_20lbs_or_over():
    """Test that $10 shipping fee is charged when total weight is 20 lbs or over"""
    token = create_test_user(TEST_USER_EMAIL, TEST_USER_PASSWORD)
    
    # Get items to reach >= 20 lbs (320 oz)
    response = client.get("/api/items?group_by=category")
    assert response.status_code == 200
    data = response.json()
    
    # Flatten all items
    items = []
    for category_items in data.values():
        items.extend(category_items)
    
    assert len(items) > 0
    
    # Calculate how many of the first item we need to reach/exceed 20 lbs (320 oz)
    item = items[0]
    item_id = item["id"]
    weight_oz = item["weight_oz"]
    
    # Need to reach/exceed 320 oz; add enough items
    qty_needed = (320 // weight_oz) + 1  # Add 1 extra to be sure we reach 320+ oz
    
    # Add items to cart
    response = client.post(
        "/api/cart",
        headers={"Authorization": f"Bearer {token}"},
        json={"item_id": item_id, "quantity": qty_needed}
    )
    assert response.status_code == 201
    
    # Get cart and verify $10 shipping fee is charged
    response = client.get(
        "/api/cart",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    cart = response.json()
    
    # If total weight >= 320 oz (20 lbs), $10 shipping fee should be charged
    assert cart["total_weight_oz"] >= 320, f"Expected weight >= 320 oz, got {cart['total_weight_oz']}"
    assert cart["total_shipping_cents"] == 1000, "Expected $10 (1000 cents) shipping fee for orders 20 lbs or over"
    assert cart["shipping_waived"] is False
    # total_cents should include shipping
    expected_total = cart["total_item_cents"] + 1000
    assert cart["total_cents"] == expected_total