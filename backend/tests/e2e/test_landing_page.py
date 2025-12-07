import pytest
from playwright.sync_api import Page, expect

BASE_URL = "http://localhost:3000"


class TestLandingPage:

    def test_landing_page_loads(self, page: Page):
        page.goto(f"{BASE_URL}/landingPage")
        page.wait_for_load_state("networkidle")
        expect(page).to_have_title("CS 160 Project")

    def test_landing_page_has_hero_content(self, page: Page):
        page.goto(f"{BASE_URL}/landingPage")
        page.wait_for_load_state("networkidle")
        expect(page.locator("text=On-Demand Food Delivery Service (OFS)")).to_be_visible()
        expect(page.locator("text=Fresh groceries, lightning-fast delivery")).to_be_visible()

    def test_landing_page_has_sign_in_button(self, page: Page):
        page.goto(f"{BASE_URL}/landingPage")
        page.wait_for_load_state("networkidle")
        sign_in_button = page.locator("text=Sign In").first
        expect(sign_in_button).to_be_visible()

    def test_landing_page_has_sign_up_button(self, page: Page):
        page.goto(f"{BASE_URL}/landingPage")
        page.wait_for_load_state("networkidle")
        sign_up_button = page.locator("text=Sign Up").first
        expect(sign_up_button).to_be_visible()

    def test_sign_in_button_navigates_to_login(self, page: Page):
        page.goto(f"{BASE_URL}/landingPage")
        page.wait_for_load_state("networkidle")
        page.locator("text=Sign In").first.click()
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(f"{BASE_URL}/login")

    def test_sign_up_button_navigates_to_signup(self, page: Page):
        page.goto(f"{BASE_URL}/landingPage")
        page.wait_for_load_state("networkidle")
        page.locator("text=Sign Up").first.click()
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(f"{BASE_URL}/signup")

    def test_landing_page_has_about_section(self, page: Page):
        page.goto(f"{BASE_URL}/landingPage")
        page.wait_for_load_state("networkidle")
        expect(page.locator("text=About OFS")).to_be_visible()

    def test_landing_page_has_features_section(self, page: Page):
        page.goto(f"{BASE_URL}/landingPage")
        page.wait_for_load_state("networkidle")
        expect(page.locator("text=What You Can Do With OFS")).to_be_visible()
        expect(page.locator("text=Shop Fresh Items")).to_be_visible()
        expect(page.locator("text=Real-Time Delivery")).to_be_visible()

    def test_landing_page_has_footer(self, page: Page):
        page.goto(f"{BASE_URL}/landingPage")
        page.wait_for_load_state("networkidle")
        expect(page.locator("text=© 2025 OFS")).to_be_visible()

    def test_view_products_link_works(self, page: Page):
        page.goto(f"{BASE_URL}/landingPage")
        page.wait_for_load_state("networkidle")
        page.locator("text=view our products").click()
        page.wait_for_load_state("networkidle")
        expect(page).to_have_url(f"{BASE_URL}/home/dashboard")
