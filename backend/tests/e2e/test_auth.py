import pytest
import uuid
from playwright.sync_api import Page, expect

BASE_URL = "http://localhost:3000"

TEST_USERS = {
    "admin": {"email": "admin@sjsu.edu", "password": "Admin@1234567890"},
    "manager": {"email": "mike@sjsu.edu", "password": "Mike@1234567890"},
    "employee": {"email": "alice@sjsu.edu", "password": "Alice@1234567890"},
    "customer": {"email": "george@sjsu.edu", "password": "George@1234567890"},
}


class TestLoginPage:

    def test_login_page_loads(self, page: Page):
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("networkidle")
        expect(page.locator("h1", has_text="Sign In")).to_be_visible()

    def test_login_page_has_email_field(self, page: Page):
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("networkidle")
        expect(page.locator('input[type="email"]')).to_be_visible()

    def test_login_page_has_password_field(self, page: Page):
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("networkidle")
        expect(page.locator('input[type="password"]')).to_be_visible()

    def test_login_page_has_submit_button(self, page: Page):
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("networkidle")
        expect(page.locator('button[type="submit"]')).to_be_visible()

    def test_login_page_has_signup_link(self, page: Page):
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("networkidle")
        expect(page.locator("text=Create an account")).to_be_visible()

    def test_signup_link_navigates_to_signup(self, page: Page):
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("networkidle")
        page.locator("text=Create an account").click()
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(f"{BASE_URL}/signup")

    def test_password_visibility_toggle(self, page: Page):
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("networkidle")
        password_input = page.locator('input[type="password"]')
        expect(password_input).to_have_attribute("type", "password")
        page.locator('button[aria-label="Show password"]').click()
        expect(page.locator('input').nth(1)).to_have_attribute("type", "text")


class TestLoginFunctionality:

    def test_customer_login_redirects_to_home_dashboard(self, page: Page):
        user = TEST_USERS["customer"]
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("networkidle")
        page.fill('input[type="email"]', user["email"])
        page.fill('input[type="password"]', user["password"])
        page.click('button[type="submit"]')
        page.wait_for_url(f"{BASE_URL}/home/dashboard", timeout=10000)
        expect(page).to_have_url(f"{BASE_URL}/home/dashboard")

    def test_admin_login_redirects_to_admin_dashboard(self, page: Page):
        user = TEST_USERS["admin"]
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("networkidle")
        page.fill('input[type="email"]', user["email"])
        page.fill('input[type="password"]', user["password"])
        page.click('button[type="submit"]')
        page.wait_for_url(f"{BASE_URL}/admin/dashboard", timeout=10000)
        expect(page).to_have_url(f"{BASE_URL}/admin/dashboard")

    def test_manager_login_redirects_to_manager_dashboard(self, page: Page):
        user = TEST_USERS["manager"]
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("networkidle")
        page.fill('input[type="email"]', user["email"])
        page.fill('input[type="password"]', user["password"])
        page.click('button[type="submit"]')
        page.wait_for_url(f"{BASE_URL}/manager/dashboard", timeout=10000)
        expect(page).to_have_url(f"{BASE_URL}/manager/dashboard")

    def test_employee_login_redirects_to_employee_dashboard(self, page: Page):
        user = TEST_USERS["employee"]
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("networkidle")
        page.fill('input[type="email"]', user["email"])
        page.fill('input[type="password"]', user["password"])
        page.click('button[type="submit"]')
        page.wait_for_url(f"{BASE_URL}/employee/dashboard", timeout=10000)
        expect(page).to_have_url(f"{BASE_URL}/employee/dashboard")

    def test_invalid_credentials_shows_error(self, page: Page):
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("networkidle")
        page.fill('input[type="email"]', "wrong@email.com")
        page.fill('input[type="password"]', "WrongPassword123!")
        page.click('button[type="submit"]')
        page.wait_for_selector("text=Incorrect email or password", timeout=5000)
        expect(page.locator("text=Incorrect email or password")).to_be_visible()

    def test_empty_form_validation(self, page: Page):
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("networkidle")
        page.click('button[type="submit"]')
        email_input = page.locator('input[type="email"]')
        is_invalid = page.evaluate("el => !el.checkValidity()", email_input.element_handle())
        assert is_invalid


class TestSignupPage:

    def test_signup_page_loads(self, page: Page):
        page.goto(f"{BASE_URL}/signup")
        page.wait_for_load_state("networkidle")
        expect(page.locator("h1", has_text="Create Account")).to_be_visible()

    def test_signup_page_has_required_fields(self, page: Page):
        page.goto(f"{BASE_URL}/signup")
        page.wait_for_load_state("networkidle")
        expect(page.locator('input[type="text"]')).to_be_visible()
        expect(page.locator('input[type="email"]')).to_be_visible()
        expect(page.locator('input[type="password"]')).to_be_visible()

    def test_signup_page_has_login_link(self, page: Page):
        page.goto(f"{BASE_URL}/signup")
        page.wait_for_load_state("networkidle")
        expect(page.locator("text=Sign In").last).to_be_visible()

    def test_login_link_navigates_to_login(self, page: Page):
        page.goto(f"{BASE_URL}/signup")
        page.wait_for_load_state("networkidle")
        page.locator("text=Sign In").last.click()
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(f"{BASE_URL}/login")

    def test_password_requirements_shown_on_focus(self, page: Page):
        page.goto(f"{BASE_URL}/signup")
        page.wait_for_load_state("networkidle")
        page.locator('input[type="password"]').focus()
        expect(page.locator("text=Password Requirements")).to_be_visible()

    def test_password_requirements_validation(self, page: Page):
        page.goto(f"{BASE_URL}/signup")
        page.wait_for_load_state("networkidle")
        page.fill('input[type="password"]', "weak")
        expect(page.locator("text=At least 14 characters")).to_be_visible()


class TestSignupFunctionality:

    def test_successful_signup_redirects_to_dashboard(self, page: Page):
        unique_id = uuid.uuid4().hex[:8]
        email = f"test_{unique_id}@example.com"
        password = "TestPassword123!@#"
        
        page.goto(f"{BASE_URL}/signup")
        page.wait_for_load_state("networkidle")
        page.fill('input[type="text"]', "Test User")
        page.fill('input[type="email"]', email)
        page.fill('input[type="password"]', password)
        page.click('button[type="submit"]')
        page.wait_for_url(f"{BASE_URL}/home/dashboard", timeout=10000)
        expect(page).to_have_url(f"{BASE_URL}/home/dashboard")

    def test_duplicate_email_shows_error(self, page: Page):
        user = TEST_USERS["customer"]
        page.goto(f"{BASE_URL}/signup")
        page.wait_for_load_state("networkidle")
        page.fill('input[type="text"]', "Test User")
        page.fill('input[type="email"]', user["email"])
        page.fill('input[type="password"]', "ValidPassword123!@#")
        page.click('button[type="submit"]')
        page.wait_for_selector("text=Email already registered", timeout=5000)
        expect(page.locator("text=Email already registered")).to_be_visible()
