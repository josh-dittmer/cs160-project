import pytest
from playwright.sync_api import Page, expect

BASE_URL = "http://localhost:3000"

TEST_USERS = {
    "admin": {"email": "admin@sjsu.edu", "password": "Admin@1234567890"},
    "manager": {"email": "mike@sjsu.edu", "password": "Mike@1234567890"},
    "employee": {"email": "alice@sjsu.edu", "password": "Alice@1234567890"},
    "customer": {"email": "george@sjsu.edu", "password": "George@1234567890"},
}


def login_user(page: Page, email: str, password: str):
    page.goto(f"{BASE_URL}/login", timeout=60000)
    page.wait_for_load_state("domcontentloaded")
    page.fill('input[type="email"]', email)
    page.fill('input[type="password"]', password)
    page.click('button[type="submit"]')
    page.wait_for_timeout(2000)


class TestPublicNavigation:

    def test_root_redirects_to_landing(self, page: Page):
        page.goto(BASE_URL)
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(f"{BASE_URL}/landingPage")

    def test_home_dashboard_accessible_without_login(self, page: Page):
        page.goto(f"{BASE_URL}/home/dashboard")
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(f"{BASE_URL}/home/dashboard")

    def test_login_page_accessible(self, page: Page):
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(f"{BASE_URL}/login")

    def test_signup_page_accessible(self, page: Page):
        page.goto(f"{BASE_URL}/signup")
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(f"{BASE_URL}/signup")


class TestCustomerNavigation:

    def test_customer_can_access_home_dashboard(self, page: Page):
        user = TEST_USERS["customer"]
        login_user(page, user["email"], user["password"])
        page.goto(f"{BASE_URL}/home/dashboard")
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(f"{BASE_URL}/home/dashboard")

    def test_customer_can_access_favorites(self, page: Page):
        user = TEST_USERS["customer"]
        login_user(page, user["email"], user["password"])
        page.goto(f"{BASE_URL}/home/favorites")
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(f"{BASE_URL}/home/favorites")

    def test_customer_can_access_orders(self, page: Page):
        user = TEST_USERS["customer"]
        login_user(page, user["email"], user["password"])
        page.goto(f"{BASE_URL}/home/orders")
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(f"{BASE_URL}/home/orders")

    def test_customer_can_access_see_all_items(self, page: Page):
        user = TEST_USERS["customer"]
        login_user(page, user["email"], user["password"])
        page.goto(f"{BASE_URL}/home/seeAllItems")
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(f"{BASE_URL}/home/seeAllItems")


class TestAdminNavigation:

    def test_admin_can_access_admin_dashboard(self, page: Page):
        user = TEST_USERS["admin"]
        login_user(page, user["email"], user["password"])
        expect(page).to_have_url(f"{BASE_URL}/admin/dashboard")

    def test_admin_can_access_inventory(self, page: Page):
        user = TEST_USERS["admin"]
        login_user(page, user["email"], user["password"])
        page.goto(f"{BASE_URL}/admin/inventory")
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(f"{BASE_URL}/admin/inventory")

    def test_admin_can_access_users(self, page: Page):
        user = TEST_USERS["admin"]
        login_user(page, user["email"], user["password"])
        page.goto(f"{BASE_URL}/admin/users")
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(f"{BASE_URL}/admin/users")

    def test_admin_can_access_orders(self, page: Page):
        user = TEST_USERS["admin"]
        login_user(page, user["email"], user["password"])
        page.goto(f"{BASE_URL}/admin/orders")
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(f"{BASE_URL}/admin/orders")

    def test_admin_can_access_audit_logs(self, page: Page):
        user = TEST_USERS["admin"]
        login_user(page, user["email"], user["password"])
        page.goto(f"{BASE_URL}/admin/audit-logs")
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(f"{BASE_URL}/admin/audit-logs")


class TestManagerNavigation:

    def test_manager_can_access_manager_dashboard(self, page: Page):
        user = TEST_USERS["manager"]
        login_user(page, user["email"], user["password"])
        expect(page).to_have_url(f"{BASE_URL}/manager/dashboard")

    def test_manager_can_access_inventory(self, page: Page):
        user = TEST_USERS["manager"]
        login_user(page, user["email"], user["password"])
        page.goto(f"{BASE_URL}/manager/inventory")
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(f"{BASE_URL}/manager/inventory")

    def test_manager_can_access_users(self, page: Page):
        user = TEST_USERS["manager"]
        login_user(page, user["email"], user["password"])
        page.goto(f"{BASE_URL}/manager/users")
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(f"{BASE_URL}/manager/users")

    def test_manager_can_access_orders(self, page: Page):
        user = TEST_USERS["manager"]
        login_user(page, user["email"], user["password"])
        page.goto(f"{BASE_URL}/manager/orders")
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(f"{BASE_URL}/manager/orders")


class TestEmployeeNavigation:

    def test_employee_can_access_employee_dashboard(self, page: Page):
        user = TEST_USERS["employee"]
        login_user(page, user["email"], user["password"])
        expect(page).to_have_url(f"{BASE_URL}/employee/dashboard")

    def test_employee_can_access_inventory(self, page: Page):
        user = TEST_USERS["employee"]
        login_user(page, user["email"], user["password"])
        page.goto(f"{BASE_URL}/employee/inventory")
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(f"{BASE_URL}/employee/inventory")

    def test_employee_can_access_orders(self, page: Page):
        user = TEST_USERS["employee"]
        login_user(page, user["email"], user["password"])
        page.goto(f"{BASE_URL}/employee/orders")
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(f"{BASE_URL}/employee/orders")

    def test_employee_can_access_stock_management(self, page: Page):
        user = TEST_USERS["employee"]
        login_user(page, user["email"], user["password"])
        page.goto(f"{BASE_URL}/employee/stock-management")
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(f"{BASE_URL}/employee/stock-management")
