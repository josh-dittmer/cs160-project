"""
Test script for admin order management endpoints.
Run this after starting the backend server with: python -m uvicorn app.main:app --reload

Usage: python test_order_management.py
"""

import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8080"
ADMIN_EMAIL = "admin@sjsu.edu"
ADMIN_PASSWORD = "admin123"


def print_test(name, passed, details=""):
    """Print test result"""
    status = "✓ PASS" if passed else "✗ FAIL"
    print(f"\n{status}: {name}")
    if details:
        print(f"  {details}")


def get_admin_token():
    """Login as admin and get JWT token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    
    if response.status_code == 200:
        token = response.json()["access_token"]
        print_test("Admin Login", True, f"Token: {token[:20]}...")
        return token
    else:
        print_test("Admin Login", False, f"Status: {response.status_code}")
        return None


def test_list_orders(token):
    """Test listing all orders"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/admin/orders", headers=headers)
    
    if response.status_code == 200:
        orders = response.json()
        print_test(
            "List All Orders", 
            True, 
            f"Found {len(orders)} orders"
        )
        return orders
    else:
        print_test("List All Orders", False, f"Status: {response.status_code}")
        return []


def test_list_orders_with_filters(token):
    """Test listing orders with filters"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test status filter - pending
    response = requests.get(
        f"{BASE_URL}/api/admin/orders?status_filter=pending",
        headers=headers
    )
    pending = response.json() if response.status_code == 200 else []
    
    # Test status filter - delivered
    response = requests.get(
        f"{BASE_URL}/api/admin/orders?status_filter=delivered",
        headers=headers
    )
    delivered = response.json() if response.status_code == 200 else []
    
    print_test(
        "Filter Orders by Status",
        response.status_code == 200,
        f"Pending: {len(pending)}, Delivered: {len(delivered)}"
    )
    
    # Test date filter
    today = datetime.now().isoformat()
    response = requests.get(
        f"{BASE_URL}/api/admin/orders?from_date={today}",
        headers=headers
    )
    print_test(
        "Filter Orders by Date",
        response.status_code == 200,
        f"Orders from today: {len(response.json()) if response.status_code == 200 else 0}"
    )


def test_get_order_detail(token, order_id):
    """Test getting order details"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/api/admin/orders/{order_id}",
        headers=headers
    )
    
    if response.status_code == 200:
        order = response.json()
        print_test(
            f"Get Order #{order_id} Details",
            True,
            f"Items: {len(order['items'])}, Total: ${order['total_cents']/100:.2f}"
        )
        return order
    else:
        print_test(
            f"Get Order #{order_id} Details",
            False,
            f"Status: {response.status_code}"
        )
        return None


def test_update_order_status(token, order_id, delivered):
    """Test updating order delivery status"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    response = requests.put(
        f"{BASE_URL}/api/admin/orders/{order_id}/status",
        headers=headers,
        json={"delivered": delivered}
    )
    
    if response.status_code == 200:
        result = response.json()
        action = "delivered" if delivered else "pending"
        print_test(
            f"Update Order #{order_id} Status",
            True,
            f"Marked as {action}: {result['message']}"
        )
        return True
    else:
        print_test(
            f"Update Order #{order_id} Status",
            False,
            f"Status: {response.status_code}"
        )
        return False


def test_search_orders(token, query):
    """Test searching orders"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/api/admin/orders?query={query}",
        headers=headers
    )
    
    if response.status_code == 200:
        orders = response.json()
        print_test(
            f"Search Orders: '{query}'",
            True,
            f"Found {len(orders)} matching orders"
        )
        return orders
    else:
        print_test(
            f"Search Orders: '{query}'",
            False,
            f"Status: {response.status_code}"
        )
        return []


def test_unauthorized_access():
    """Test that endpoints reject non-admin users"""
    # Try without token
    response = requests.get(f"{BASE_URL}/api/admin/orders")
    print_test(
        "Unauthorized Access (No Token)",
        response.status_code == 401,
        f"Status: {response.status_code}"
    )
    
    # Try with invalid token
    headers = {"Authorization": "Bearer invalid_token"}
    response = requests.get(f"{BASE_URL}/api/admin/orders", headers=headers)
    print_test(
        "Unauthorized Access (Invalid Token)",
        response.status_code == 401,
        f"Status: {response.status_code}"
    )


def main():
    """Run all tests"""
    print("=" * 60)
    print("ADMIN ORDER MANAGEMENT API TESTS")
    print("=" * 60)
    
    # Check server health
    try:
        response = requests.get(f"{BASE_URL}/healthz")
        if response.status_code == 200:
            print_test("Server Health Check", True)
        else:
            print_test("Server Health Check", False, "Server not responding")
            return
    except requests.exceptions.ConnectionError:
        print_test("Server Health Check", False, "Cannot connect to server")
        print("\nPlease start the backend server first:")
        print("  cd backend && python -m uvicorn app.main:app --reload")
        return
    
    # Test authentication
    token = get_admin_token()
    if not token:
        print("\n❌ Cannot proceed without admin token")
        return
    
    # Test unauthorized access
    print("\n" + "-" * 60)
    print("SECURITY TESTS")
    print("-" * 60)
    test_unauthorized_access()
    
    # Test order listing
    print("\n" + "-" * 60)
    print("ORDER LISTING TESTS")
    print("-" * 60)
    orders = test_list_orders(token)
    
    if not orders:
        print("\n⚠️  No orders found in database.")
        print("Create some test orders by:")
        print("  1. Login as a customer")
        print("  2. Add items to cart")
        print("  3. Complete checkout")
        return
    
    # Test filters
    print("\n" + "-" * 60)
    print("FILTER TESTS")
    print("-" * 60)
    test_list_orders_with_filters(token)
    
    # Test search
    print("\n" + "-" * 60)
    print("SEARCH TESTS")
    print("-" * 60)
    if orders:
        # Search by order ID
        test_search_orders(token, str(orders[0]["id"]))
        # Search by email
        test_search_orders(token, orders[0]["user_email"])
    
    # Test order details
    print("\n" + "-" * 60)
    print("ORDER DETAIL TESTS")
    print("-" * 60)
    if orders:
        order_detail = test_get_order_detail(token, orders[0]["id"])
    
    # Test status updates
    print("\n" + "-" * 60)
    print("STATUS UPDATE TESTS")
    print("-" * 60)
    if orders:
        order_id = orders[0]["id"]
        current_status = orders[0]["is_delivered"]
        
        # Toggle status
        test_update_order_status(token, order_id, not current_status)
        
        # Toggle back
        test_update_order_status(token, order_id, current_status)
    
    print("\n" + "=" * 60)
    print("TESTS COMPLETED")
    print("=" * 60)
    print("\n✅ All tests completed. Check results above.")
    print("\n📝 Next steps:")
    print("  1. Review test results")
    print("  2. Test frontend at http://localhost:3000/admin/orders")
    print("  3. Verify order statistics on admin dashboard")


if __name__ == "__main__":
    main()

