"""
Test script for admin order management endpoints.
Tests require the backend server running on http://localhost:8080
"""

import requests
import json
from datetime import datetime


def test_list_orders(headers, base_url):
    """Test listing all orders"""
    response = requests.get(f"{base_url}/api/admin/orders", headers=headers)
    
    assert response.status_code == 200, f"Failed to list orders: {response.text}"
    orders = response.json()
    assert isinstance(orders, list), "Orders should be a list"


def test_list_orders_with_filters(headers, base_url):
    """Test listing orders with filters"""
    
    # Test status filter - pending
    response = requests.get(
        f"{base_url}/api/admin/orders?status_filter=pending",
        headers=headers
    )
    assert response.status_code == 200
    pending = response.json()
    assert isinstance(pending, list)
    
    # Test status filter - delivered
    response = requests.get(
        f"{base_url}/api/admin/orders?status_filter=delivered",
        headers=headers
    )
    assert response.status_code == 200
    delivered = response.json()
    assert isinstance(delivered, list)
    
    # Test date filter
    today = datetime.now().isoformat()
    response = requests.get(
        f"{base_url}/api/admin/orders?from_date={today}",
        headers=headers
    )
    assert response.status_code == 200


def test_get_order_detail(headers, base_url):
    """Test getting order details - requires an existing order"""
    # First get a list of orders
    response = requests.get(f"{base_url}/api/admin/orders", headers=headers)
    assert response.status_code == 200
    
    orders = response.json()
    if not orders:
        # Skip test if no orders exist
        return
    
    order_id = orders[0]["id"]
    response = requests.get(
        f"{base_url}/api/admin/orders/{order_id}",
        headers=headers
    )
    
    assert response.status_code == 200
    order = response.json()
    assert "items" in order
    assert "total_cents" in order


def test_update_order_status(headers, base_url):
    """Test updating order delivery status - requires an existing order"""
    # First get a list of orders
    response = requests.get(f"{base_url}/api/admin/orders", headers=headers)
    assert response.status_code == 200
    
    orders = response.json()
    if not orders:
        # Skip test if no orders exist
        return
    
    order_id = orders[0]["id"]
    
    # Try to update status to delivered
    response = requests.put(
        f"{base_url}/api/admin/orders/{order_id}/status",
        headers=headers,
        json={"delivered": True}
    )
    
    assert response.status_code == 200
    result = response.json()
    assert "message" in result or "success" in result


def test_search_orders(headers, base_url):
    """Test searching orders"""
    response = requests.get(
        f"{base_url}/api/admin/orders?search=test",
        headers=headers
    )
    
    assert response.status_code == 200
    results = response.json()
    assert isinstance(results, list)


if __name__ == "__main__":
    main()

