"""
Test suite for manager RBAC access controls.
Tests manager permissions for user management, blocking, audit logs, orders, and inventory.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, Base, engine
from app.models import User, Item, Order, OrderItem, AuditLog
from app.auth import get_password_hash
from app.audit import create_audit_log

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
        # Clean up users (including all test users)
        db.query(User).filter(
            User.email.in_([
                ADMIN_EMAIL, MANAGER_EMAIL, EMPLOYEE_EMAIL, CUSTOMER_EMAIL,
                "manager2@test.com", "sub_employee@test.com", "employee2@test.com"
            ])
        ).delete(synchronize_session=False)
        
        # Clean up test items
        db.query(Item).filter(Item.name.like("Test%")).delete(synchronize_session=False)
        
        # Clean up test audit logs
        db.query(AuditLog).filter(AuditLog.action_type.like("test_%")).delete(synchronize_session=False)
        
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


# ============ Audit Logs Access Control Tests ============

def test_manager_can_see_own_audit_logs():
    """Test that managers can see their own audit logs"""
    db = SessionLocal()
    try:
        admin = create_test_user(db, ADMIN_EMAIL, "admin", ADMIN_PASSWORD)
        manager = create_test_user(db, MANAGER_EMAIL, "manager", MANAGER_PASSWORD)
        
        # Create audit log for manager's action
        create_audit_log(
            db=db,
            action_type="test_manager_action",
            target_type="test",
            target_id=1,
            actor_id=manager.id,
            actor_email=manager.email,
            details={"test": "manager's own action"}
        )
    finally:
        db.close()
    
    manager_token = get_token(MANAGER_EMAIL, MANAGER_PASSWORD)
    
    # Manager should see their own logs
    response = client.get(
        "/api/admin/audit-logs?action_type=test_manager_action",
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    assert response.status_code == 200
    logs = response.json()
    assert len(logs) >= 1
    assert any(log["actor_email"] == MANAGER_EMAIL for log in logs)


def test_manager_can_see_subordinate_audit_logs():
    """Test that managers can see audit logs from their direct and indirect subordinates"""
    db = SessionLocal()
    try:
        admin = create_test_user(db, ADMIN_EMAIL, "admin", ADMIN_PASSWORD)
        manager = create_test_user(db, MANAGER_EMAIL, "manager", MANAGER_PASSWORD)
        employee = create_test_user(db, EMPLOYEE_EMAIL, "employee", TEST_PASSWORD, reports_to=manager.id)
        
        # Create subordinate employee under the first employee (indirect report to manager)
        sub_employee = create_test_user(db, "sub_employee@test.com", "employee", TEST_PASSWORD, reports_to=employee.id)
        
        # Create audit logs for both direct and indirect subordinates
        create_audit_log(
            db=db,
            action_type="test_direct_subordinate_action",
            target_type="test",
            target_id=2,
            actor_id=employee.id,
            actor_email=employee.email,
            details={"test": "direct subordinate action"}
        )
        
        create_audit_log(
            db=db,
            action_type="test_indirect_subordinate_action",
            target_type="test",
            target_id=3,
            actor_id=sub_employee.id,
            actor_email=sub_employee.email,
            details={"test": "indirect subordinate action"}
        )
    finally:
        db.close()
    
    manager_token = get_token(MANAGER_EMAIL, MANAGER_PASSWORD)
    
    # Manager should see direct subordinate logs
    response = client.get(
        "/api/admin/audit-logs?action_type=test_direct_subordinate_action",
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    assert response.status_code == 200
    logs = response.json()
    assert len(logs) >= 1
    assert any(log["actor_email"] == EMPLOYEE_EMAIL for log in logs)
    
    # Manager should also see indirect subordinate logs
    response = client.get(
        "/api/admin/audit-logs?action_type=test_indirect_subordinate_action",
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    assert response.status_code == 200
    logs = response.json()
    assert len(logs) >= 1
    assert any(log["actor_email"] == "sub_employee@test.com" for log in logs)
    
    # Clean up sub_employee
    db = SessionLocal()
    try:
        db.query(User).filter(User.email == "sub_employee@test.com").delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


def test_manager_can_see_customer_audit_logs():
    """Test that managers can see audit logs from all customers"""
    db = SessionLocal()
    try:
        admin = create_test_user(db, ADMIN_EMAIL, "admin", ADMIN_PASSWORD)
        manager = create_test_user(db, MANAGER_EMAIL, "manager", MANAGER_PASSWORD)
        customer = create_test_user(db, CUSTOMER_EMAIL, "customer", TEST_PASSWORD)
        
        # Create audit log for customer action
        create_audit_log(
            db=db,
            action_type="test_customer_action",
            target_type="test",
            target_id=4,
            actor_id=customer.id,
            actor_email=customer.email,
            details={"test": "customer action"}
        )
    finally:
        db.close()
    
    manager_token = get_token(MANAGER_EMAIL, MANAGER_PASSWORD)
    
    # Manager should see customer logs
    response = client.get(
        "/api/admin/audit-logs?action_type=test_customer_action",
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    assert response.status_code == 200
    logs = response.json()
    assert len(logs) >= 1
    assert any(log["actor_email"] == CUSTOMER_EMAIL for log in logs)


def test_manager_cannot_see_admin_audit_logs():
    """Test that managers cannot see audit logs from admins"""
    db = SessionLocal()
    try:
        admin = create_test_user(db, ADMIN_EMAIL, "admin", ADMIN_PASSWORD)
        manager = create_test_user(db, MANAGER_EMAIL, "manager", MANAGER_PASSWORD)
        
        # Create audit log for admin action
        create_audit_log(
            db=db,
            action_type="test_admin_action",
            target_type="test",
            target_id=5,
            actor_id=admin.id,
            actor_email=admin.email,
            details={"test": "admin action"}
        )
    finally:
        db.close()
    
    manager_token = get_token(MANAGER_EMAIL, MANAGER_PASSWORD)
    
    # Manager should NOT see admin logs
    response = client.get(
        "/api/admin/audit-logs?action_type=test_admin_action",
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    assert response.status_code == 200
    logs = response.json()
    # Should not contain admin's logs
    assert not any(log["actor_email"] == ADMIN_EMAIL for log in logs)


def test_manager_cannot_see_other_manager_audit_logs():
    """Test that managers cannot see audit logs from other managers"""
    db = SessionLocal()
    try:
        admin = create_test_user(db, ADMIN_EMAIL, "admin", ADMIN_PASSWORD)
        manager1 = create_test_user(db, MANAGER_EMAIL, "manager", MANAGER_PASSWORD)
        manager2 = create_test_user(db, "manager2@test.com", "manager", TEST_PASSWORD)
        
        # Create audit log for manager2's action
        create_audit_log(
            db=db,
            action_type="test_other_manager_action",
            target_type="test",
            target_id=6,
            actor_id=manager2.id,
            actor_email=manager2.email,
            details={"test": "other manager action"}
        )
    finally:
        db.close()
    
    manager_token = get_token(MANAGER_EMAIL, MANAGER_PASSWORD)
    
    # Manager1 should NOT see manager2's logs
    response = client.get(
        "/api/admin/audit-logs?action_type=test_other_manager_action",
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    assert response.status_code == 200
    logs = response.json()
    # Should not contain other manager's logs
    assert not any(log["actor_email"] == "manager2@test.com" for log in logs)


def test_manager_cannot_see_other_team_employee_audit_logs():
    """Test that managers cannot see audit logs from employees under other managers"""
    db = SessionLocal()
    try:
        admin = create_test_user(db, ADMIN_EMAIL, "admin", ADMIN_PASSWORD)
        manager1 = create_test_user(db, MANAGER_EMAIL, "manager", MANAGER_PASSWORD)
        manager2 = create_test_user(db, "manager2@test.com", "manager", TEST_PASSWORD)
        
        # Create employee under manager1
        employee1 = create_test_user(db, EMPLOYEE_EMAIL, "employee", TEST_PASSWORD, reports_to=manager1.id)
        
        # Create employee under manager2
        employee2 = create_test_user(db, "employee2@test.com", "employee", TEST_PASSWORD, reports_to=manager2.id)
        
        # Create audit log for employee2's action (not under manager1)
        create_audit_log(
            db=db,
            action_type="test_other_team_employee_action",
            target_type="test",
            target_id=7,
            actor_id=employee2.id,
            actor_email=employee2.email,
            details={"test": "other team employee action"}
        )
    finally:
        db.close()
    
    manager_token = get_token(MANAGER_EMAIL, MANAGER_PASSWORD)
    
    # Manager1 should NOT see employee2's logs (employee2 reports to manager2)
    response = client.get(
        "/api/admin/audit-logs?action_type=test_other_team_employee_action",
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    assert response.status_code == 200
    logs = response.json()
    # Should not contain other team's employee logs
    assert not any(log["actor_email"] == "employee2@test.com" for log in logs)
    
    # Clean up
    db = SessionLocal()
    try:
        db.query(User).filter(User.email == "employee2@test.com").delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


def test_admin_sees_all_audit_logs():
    """Test that admins can see all audit logs (unchanged behavior)"""
    db = SessionLocal()
    try:
        admin = create_test_user(db, ADMIN_EMAIL, "admin", ADMIN_PASSWORD)
        manager = create_test_user(db, MANAGER_EMAIL, "manager", MANAGER_PASSWORD)
        employee = create_test_user(db, EMPLOYEE_EMAIL, "employee", TEST_PASSWORD, reports_to=manager.id)
        customer = create_test_user(db, CUSTOMER_EMAIL, "customer", TEST_PASSWORD)
        
        # Create audit logs for each role
        for user, role in [(admin, "admin"), (manager, "manager"), (employee, "employee"), (customer, "customer")]:
            create_audit_log(
                db=db,
                action_type=f"test_{role}_action_for_admin",
                target_type="test",
                target_id=8,
                actor_id=user.id,
                actor_email=user.email,
                details={"test": f"{role} action"}
            )
    finally:
        db.close()
    
    admin_token = get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
    
    # Admin should see all logs
    response = client.get(
        "/api/admin/audit-logs?action_type=action_for_admin",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    logs = response.json()
    
    # Should contain logs from all roles
    emails_in_logs = {log["actor_email"] for log in logs}
    assert ADMIN_EMAIL in emails_in_logs
    assert MANAGER_EMAIL in emails_in_logs
    assert EMPLOYEE_EMAIL in emails_in_logs
    assert CUSTOMER_EMAIL in emails_in_logs


def test_manager_cannot_see_system_audit_logs():
    """Test that managers cannot see system audit logs (NULL actor_id)"""
    db = SessionLocal()
    try:
        admin = create_test_user(db, ADMIN_EMAIL, "admin", ADMIN_PASSWORD)
        manager = create_test_user(db, MANAGER_EMAIL, "manager", MANAGER_PASSWORD)
        
        # Create system audit log (no actor_id)
        create_audit_log(
            db=db,
            action_type="test_system_action",
            target_type="test",
            target_id=9,
            actor_id=None,  # System action
            actor_email=None,
            details={"test": "system action"}
        )
    finally:
        db.close()
    
    manager_token = get_token(MANAGER_EMAIL, MANAGER_PASSWORD)
    
    # Manager should NOT see system logs
    response = client.get(
        "/api/admin/audit-logs?action_type=test_system_action",
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    assert response.status_code == 200
    logs = response.json()
    # Should be empty or not contain system logs
    assert len(logs) == 0 or all(log.get("actor_id") is not None for log in logs)


def test_manager_audit_stats_filtered():
    """Test that audit log statistics are filtered for managers"""
    db = SessionLocal()
    try:
        admin = create_test_user(db, ADMIN_EMAIL, "admin", ADMIN_PASSWORD)
        manager = create_test_user(db, MANAGER_EMAIL, "manager", MANAGER_PASSWORD)
        employee = create_test_user(db, EMPLOYEE_EMAIL, "employee", TEST_PASSWORD, reports_to=manager.id)
        
        # Create logs that manager should see
        create_audit_log(
            db=db,
            action_type="test_stats_visible",
            target_type="test",
            target_id=10,
            actor_id=employee.id,
            actor_email=employee.email,
            details={"test": "visible to manager"}
        )
        
        # Create logs that manager should NOT see
        create_audit_log(
            db=db,
            action_type="test_stats_hidden",
            target_type="test",
            target_id=11,
            actor_id=admin.id,
            actor_email=admin.email,
            details={"test": "hidden from manager"}
        )
    finally:
        db.close()
    
    manager_token = get_token(MANAGER_EMAIL, MANAGER_PASSWORD)
    admin_token = get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
    
    # Get stats for both manager and admin
    manager_response = client.get(
        "/api/admin/audit-logs/stats",
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    admin_response = client.get(
        "/api/admin/audit-logs/stats",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    assert manager_response.status_code == 200
    assert admin_response.status_code == 200
    
    manager_stats = manager_response.json()
    admin_stats = admin_response.json()
    
    # Admin should see more logs than manager (or at least equal)
    assert admin_stats["total_logs"] >= manager_stats["total_logs"]
    
    # Verify manager can see the visible log but not the hidden one
    manager_logs = client.get(
        "/api/admin/audit-logs?action_type=test_stats",
        headers={"Authorization": f"Bearer {manager_token}"}
    ).json()
    
    admin_logs = client.get(
        "/api/admin/audit-logs?action_type=test_stats",
        headers={"Authorization": f"Bearer {admin_token}"}
    ).json()
    
    # Manager should see the employee's log but not admin's log
    manager_action_types = {log["action_type"] for log in manager_logs}
    assert "test_stats_visible" in manager_action_types
    assert "test_stats_hidden" not in manager_action_types
    
    # Admin should see both logs
    admin_action_types = {log["action_type"] for log in admin_logs}
    assert "test_stats_visible" in admin_action_types
    assert "test_stats_hidden" in admin_action_types


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
        # Create a test order with required fields
        order = Order(
            user_id=customer_id,
            payment_intent_id="test_pi_123",
            display_address="123 Test St, Test City, CA 12345",
            latitude=37.7749,
            longitude=-122.4194
        )
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

