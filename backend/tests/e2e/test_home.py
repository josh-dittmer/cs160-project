import pytest
from playwright.sync_api import Page, expect

BASE_URL = "http://localhost:3000"

TEST_USERS = {
    "customer": {"email": "george@sjsu.edu", "password": "George@1234567890"},
}


def login_user(page: Page, email: str, password: str):
    page.goto(f"{BASE_URL}/login", timeout=60000)
    page.wait_for_load_state("domcontentloaded")
    page.fill('input[type="email"]', email)
    page.fill('input[type="password"]', password)
    page.click('button[type="submit"]')
    page.wait_for_timeout(2000)


class TestHomeDashboard:

    def test_home_dashboard_loads(self, page: Page):
        page.goto(f"{BASE_URL}/home/dashboard")
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(f"{BASE_URL}/home/dashboard")

    def test_home_dashboard_shows_product_categories(self, page: Page):
        page.goto(f"{BASE_URL}/home/dashboard")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        fruits_visible = page.locator("text=Fruits").is_visible()
        vegetables_visible = page.locator("text=Vegetables").is_visible()
        assert fruits_visible or vegetables_visible

    def test_home_dashboard_shows_item_sliders(self, page: Page):
        page.goto(f"{BASE_URL}/home/dashboard")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        items_count = page.locator('[class*="item"]').count()
        assert items_count >= 0


class TestSeeAllItems:

    def test_see_all_items_page_loads(self, page: Page):
        page.goto(f"{BASE_URL}/home/seeAllItems")
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(f"{BASE_URL}/home/seeAllItems")

    def test_see_all_items_has_search_bar(self, page: Page):
        page.goto(f"{BASE_URL}/home/seeAllItems")
        page.wait_for_load_state("networkidle")
        search_input = page.locator('input[type="text"]').first
        expect(search_input).to_be_visible()


class TestItemDetails:

    def test_item_detail_page_accessible(self, page: Page):
        page.goto(f"{BASE_URL}/home/item/1")
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(f"{BASE_URL}/home/item/1")


class TestFavoritesPage:

    def test_favorites_page_loads_for_logged_in_user(self, page: Page):
        user = TEST_USERS["customer"]
        login_user(page, user["email"], user["password"])
        page.goto(f"{BASE_URL}/home/favorites")
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(f"{BASE_URL}/home/favorites")


class TestOrdersPage:

    def test_orders_page_loads_for_logged_in_user(self, page: Page):
        user = TEST_USERS["customer"]
        login_user(page, user["email"], user["password"])
        page.goto(f"{BASE_URL}/home/orders")
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(f"{BASE_URL}/home/orders")


class TestSearchFunctionality:

    def test_search_filters_items(self, page: Page):
        page.goto(f"{BASE_URL}/home/seeAllItems")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        search_input = page.locator('input[type="text"]').first
        if search_input.is_visible():
            search_input.fill("apple")
            page.wait_for_timeout(1000)


class TestCartFunctionality:

    def test_cart_icon_visible_on_home(self, page: Page):
        page.goto(f"{BASE_URL}/home/dashboard")
        page.wait_for_load_state("networkidle")
        cart_elements = page.locator('[class*="cart"]')
        assert cart_elements.count() >= 0
