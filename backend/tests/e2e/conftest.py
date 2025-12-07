import pytest
from playwright.sync_api import sync_playwright, Page, Browser, BrowserContext

BASE_URL = "http://localhost:3000"
API_URL = "http://localhost:8080"

TEST_USERS = {
    "admin": {"email": "admin@sjsu.edu", "password": "Admin@1234567890"},
    "manager": {"email": "mike@sjsu.edu", "password": "Mike@1234567890"},
    "employee": {"email": "alice@sjsu.edu", "password": "Alice@1234567890"},
    "customer": {"email": "george@sjsu.edu", "password": "George@1234567890"},
}


@pytest.fixture(scope="session")
def browser():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        yield browser
        browser.close()


@pytest.fixture(scope="function")
def context(browser: Browser):
    context = browser.new_context(
        viewport={"width": 1280, "height": 720},
        ignore_https_errors=True,
    )
    yield context
    context.close()


@pytest.fixture(scope="function")
def page(context: BrowserContext):
    page = context.new_page()
    yield page
    page.close()


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api_url():
    return API_URL


def login_user(page: Page, email: str, password: str):
    page.goto(f"{BASE_URL}/login")
    page.wait_for_load_state("networkidle")
    page.fill('input[type="email"]', email)
    page.fill('input[type="password"]', password)
    page.click('button[type="submit"]')
    page.wait_for_load_state("networkidle")


@pytest.fixture
def logged_in_customer(page: Page):
    user = TEST_USERS["customer"]
    login_user(page, user["email"], user["password"])
    return page


@pytest.fixture
def logged_in_admin(page: Page):
    user = TEST_USERS["admin"]
    login_user(page, user["email"], user["password"])
    return page


@pytest.fixture
def logged_in_manager(page: Page):
    user = TEST_USERS["manager"]
    login_user(page, user["email"], user["password"])
    return page


@pytest.fixture
def logged_in_employee(page: Page):
    user = TEST_USERS["employee"]
    login_user(page, user["email"], user["password"])
    return page
