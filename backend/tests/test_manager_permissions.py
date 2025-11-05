"""
Test suite for manager RBAC access controls.
Tests manager permissions for user management, blocking, audit logs, orders, and inventory.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, Base, engine
from app.models import User, Item, Order, OrderItem
from app.auth import get_password_hash

# Setup test client
client = TestClient(app)

# Test data
ADMIN_EMAIL = "admin@managertest.com"
ADMIN_PASSWORD = "admin123"

MANAGER_EMAIL = "manager@managertest.com"
MANAGER_PASSWORD = "manager123"

EMPLOYEE_EMAIL = "employee@managertest.com"
CUSTOMER_EMAIL = "customer@managertest.com"
TEST_PASSWORD = "test123"


def setup_module():
    """Setup test database before running tests"""
    Base.metadata.create_all(bind=engine)


def teardown_function():
    """Clean up test data after each test"""
    db = SessionLocal()
    try:
        # Clean up users (including manager2)
        db.query(User).filter(
            User.email.in_([ADMIN_EMAIL, MANAGER_EMAIL, EMPLOYEE_EMAIL, CUSTOMER_EMAIL, "manager2@test.com"])
        ).delete(synchronize_session=False)
        
        # Clean up test items
        db.query(Item).filter(Item.name.like("Test%")).delete(synchronize_session=False)
        
        db.commit()
    finally:
        db.close()


def create_test_user(db, email, role, password=TEST_PASSWORD, reports_to=None):
    """Helper: Create test user with specified role"""
    user = User(
        email=email,
        hashed_password=get_password_hash(password),
        full_name=f"Test {role.title()}",
        role=role,
        is_active=True,
        reports_to=reports_to
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_token(email, password):
    """Helper: Login and get JWT token"""
    response = client.post(
        "/api/auth/login",
        json={"email": email, "password": password}
    )
    assert response.status_code == 200, f"Login failed for {email}"
    return response.json()["access_token"]


def setup_test_users():
    """Setup admin, manager, employee, and customer for testing"""
    db = SessionLocal()
    try:
        admin = create_test_user(db, ADMIN_EMAIL, "admin", ADMIN_PASSWORD)
        manager = create_test_user(db, MANAGER_EMAIL, "manager", MANAGER_PASSWORD)
        employee = create_test_user(db, EMPLOYEE_EMAIL, "employee", TEST_PASSWORD, reports_to=manager.id)
        customer = create_test_user(db, CUSTOMER_EMAIL, "customer", TEST_PASSWORD)
        
        # Return IDs instead of objects to avoid detached instance errors
        return admin.id, manager.id, employee.id, customer.id
    finally:
        db.close()


# ============ Role Change Tests ============

def test_manager_cannot_change_roles():
    """Test that managers cannot change any user roles"""
    admin_id, manager_id, employee_id, customer_id = setup_test_users()
    manager_token = get_token(MANAGER_EMAIL, MANAGER_PASSWORD)
    
    # Try to promote customer to employee
    response = client.put(
        f"/api/manager/users/{customer_id}/role",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={"role": "employee"}
    )
    assert response.status_code == 403
    assert "do not have permission" in response.json()["detail"].lower()
    
    # Try to demote employee to customer
    response = client.put(
        f"/api/manager/users/{employee_id}/role",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={"role": "customer"}
    )
    assert response.status_code == 403
    assert "do not have permission" in response.json()["detail"].lower()


def test_admin_can_change_roles():
    """Test that admins can still change roles"""
    admin_id, manager_id, employee_id, customer_id = setup_test_users()
    admin_token = get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
    
    # Admin can promote customer to employee
    response = client.put(
        f"/api/admin/users/{customer_id}/role",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"role": "employee", "manager_id": manager_id}
    )
    assert response.status_code == 200


# ============ Blocking Tests ============

def test_manager_can_block_employee():
    """Test that managers can block employees"""
    admin_id, manager_id, employee_id, customer_id = setup_test_users()
    manager_token = get_token(MANAGER_EMAIL, MANAGER_PASSWORD)
    
    response = client.put(
        f"/api/manager/users/{employee_id}/block",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={"is_active": False}
    )
    assert response.status_code == 200
    assert "blocked successfully" in response.json()["message"].lower()


def test_manager_can_block_customer():
    """Test that managers can block customers"""
    admin_id, manager_id, employee_id, customer_id = setup_test_users()
    manager_token = get_token(MANAGER_EMAIL, MANAGER_PASSWORD)
    
    response = client.put(
        f"/api/manager/users/{customer_id}/block",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={"is_active": False}
    )
    assert response.status_code == 200
    assert "blocked successfully" in response.json()["message"].lower()


def test_manager_cannot_block_another_manager():
    """Test that managers cannot block other managers"""
    db = SessionLocal()
    try:
        admin = create_test_user(db, ADMIN_EMAIL, "admin", ADMIN_PASSWORD)
        manager1 = create_test_user(db, MANAGER_EMAIL, "manager", MANAGER_PASSWORD)
        manager2 = create_test_user(db, "manager2@test.com", "manager", TEST_PASSWORD)
        manager2_id = manager2.id
    finally:
        db.close()
    
    manager_token = get_token(MANAGER_EMAIL, MANAGER_PASSWORD)
    
    response = client.put(
        f"/api/manager/users/{manager2_id}/block",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={"is_active": False}
    )
    assert response.status_code == 403
    assert "do not have permission" in response.json()["detail"].lower()


def test_manager_cannot_block_admin():
    """Test that managers cannot block admins"""
    admin_id, manager_id, employee_id, customer_id = setup_test_users()
    manager_token = get_token(MANAGER_EMAIL, MANAGER_PASSWORD)
    
    response = client.put(
        f"/api/manager/users/{admin_id}/block",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={"is_active": False}
    )
    assert response.status_code == 403
    assert "do not have permission" in response.json()["detail"].lower()


# ============ Audit Logs Tests ============

def test_manager_can_access_audit_logs():
    """Test that managers have same permissions as admin for audit logs"""
    admin_id, manager_id, employee_id, customer_id = setup_test_users()
    manager_token = get_token(MANAGER_EMAIL, MANAGER_PASSWORD)
    
    # Manager can list audit logs
    response = client.get(
        "/api/admin/audit-logs",
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    assert response.status_code == 200
    
    # Manager can get audit stats
    response = client.get(
        "/api/admin/audit-logs/stats",
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    assert response.status_code == 200


# ============ Orders Tests ============

def test_manager_can_access_orders():
    """Test that managers have same permissions as admin for orders"""
    admin_id, manager_id, employee_id, customer_id = setup_test_users()
    manager_token = get_token(MANAGER_EMAIL, MANAGER_PASSWORD)
    
    # Manager can list orders
    response = client.get(
        "/api/admin/orders",
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    assert response.status_code == 200


def test_manager_can_update_order_status():
    """Test that managers can update order delivery status"""
    admin_id, manager_id, employee_id, customer_id = setup_test_users()
    
    db = SessionLocal()
    try:
        # Create a test order
        order = Order(user_id=customer_id, payment_intent_id="test_pi_123")
        db.add(order)
        db.commit()
        db.refresh(order)
        order_id = order.id
    finally:
        db.close()
    
    manager_token = get_token(MANAGER_EMAIL, MANAGER_PASSWORD)
    
    # Manager can update order status
    response = client.put(
        f"/api/admin/orders/{order_id}/status",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={"delivered": True}
    )
    assert response.status_code == 200
    assert "delivered" in response.json()["message"].lower()


# ============ Inventory Tests ============

def test_manager_can_access_inventory():
    """Test that managers have same permissions as admin for inventory"""
    admin_id, manager_id, employee_id, customer_id = setup_test_users()
    manager_token = get_token(MANAGER_EMAIL, MANAGER_PASSWORD)
    
    # Manager can list items
    response = client.get(
        "/api/admin/items",
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    assert response.status_code == 200
    
    # Manager can get categories
    response = client.get(
        "/api/admin/categories",
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    assert response.status_code == 200


def test_manager_can_create_items():
    """Test that managers can create inventory items"""
    admin_id, manager_id, employee_id, customer_id = setup_test_users()
    manager_token = get_token(MANAGER_EMAIL, MANAGER_PASSWORD)
    
    response = client.post(
        "/api/admin/items",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={
            "name": "Test Item",
            "description": "Test Description",
            "price_cents": 999,
            "weight_oz": 10,
            "category": "Test",
            "stock_qty": 50,
            "is_active": True
        }
    )
    assert response.status_code == 201
    assert response.json()["name"] == "Test Item"


def test_manager_can_update_items():
    """Test that managers can update inventory items"""
    admin_id, manager_id, employee_id, customer_id = setup_test_users()
    
    db = SessionLocal()
    try:
        # Create a test item
        item = Item(
            name="Test Item",
            description="Original description",
            price_cents=500,
            weight_oz=10,
            category="Test",
            stock_qty=100,
            is_active=True
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        item_id = item.id
    finally:
        db.close()
    
    manager_token = get_token(MANAGER_EMAIL, MANAGER_PASSWORD)
    
    # Manager can update item
    response = client.put(
        f"/api/admin/items/{item_id}",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={"price_cents": 999}
    )
    assert response.status_code == 200
    assert response.json()["price_cents"] == 999


def test_manager_can_deactivate_items():
    """Test that managers can deactivate inventory items"""
    admin_id, manager_id, employee_id, customer_id = setup_test_users()
    
    db = SessionLocal()
    try:
        # Create a test item
        item = Item(
            name="Test Item",
            description="Test description",
            price_cents=500,
            weight_oz=10,
            category="Test",
            stock_qty=100,
            is_active=True
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        item_id = item.id
    finally:
        db.close()
    
    manager_token = get_token(MANAGER_EMAIL, MANAGER_PASSWORD)
    
    # Manager can deactivate item
    response = client.delete(
        f"/api/admin/items/{item_id}",
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    assert response.status_code == 200
    assert "deactivated" in response.json()["message"].lower()


# ============ User List Access Tests ============

def test_manager_can_list_all_users():
    """Test that managers can list all users (needed for UI)"""
    admin_id, manager_id, employee_id, customer_id = setup_test_users()
    manager_token = get_token(MANAGER_EMAIL, MANAGER_PASSWORD)
    
    response = client.get(
        "/api/admin/users",
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    assert response.status_code == 200
    users = response.json()
    assert len(users) >= 4  # At least admin, manager, employee, customer


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

