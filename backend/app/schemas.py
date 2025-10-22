from datetime import datetime
from pydantic import BaseModel, conint, constr, EmailStr


class ItemListOut(BaseModel):
    """Shape for list view."""
    id: int
    name: str
    price_cents: int
    weight_oz: int
    category: str | None = None
    image_url: str | None = None
    avg_rating: float
    ratings_count: int

    class Config:
        from_attributes = True


class ItemDetailOut(ItemListOut):
    """Adds fields only needed on the detail page."""
    description: str | None = None
    nutrition_json: str | None = None
    stock_qty: int
    is_active: bool


class ReviewOut(BaseModel):
    id: int
    item_id: int
    user_id: int
    rating: int
    title: str | None
    body: str
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewIn(BaseModel):
    rating: conint(ge=1, le=5)
    title: str | None = None
    body: constr(min_length=5)


# ============ User & Auth Schemas ============

class UserCreate(BaseModel):
    """Schema for user registration"""
    email: EmailStr
    password: constr(min_length=8)
    full_name: str | None = None


class UserLogin(BaseModel):
    """Schema for user login"""
    email: EmailStr
    password: str


class UserOut(BaseModel):
    """Schema for user output (public info)"""
    id: int
    email: str
    full_name: str | None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    """Schema for JWT token response"""
    access_token: str
    token_type: str = "bearer"
    user: UserOut
    expires: int


class GoogleAuthRequest(BaseModel):
    """Schema for Google OAuth token"""
    id_token: str


class SearchSuggestion(BaseModel):
    """Schema for search suggestions"""
    id: int
    name: str
    category: str | None = None
    image_url: str | None = None
    price_cents: int
    relevance_score: float  # 0-1 score for ranking results
    
    class Config:
        from_attributes = True

class CartItemOut(BaseModel):
    quantity: int
    item: ItemListOut
    
    class Config:
        # allow constructing from SQLAlchemy model instances (attributes)
        from_attributes = True

class CartItemIn(BaseModel):
    item_id: int
    quantity: int


class CartItemsResponse(BaseModel):
    """Response shape for GET /api/cart used by the frontend.

    Matches frontend `CartItemsResponse` (items, total_item_cents, total_shipping_cents, total_cents).
    """
    items: list[CartItemOut]
    total_item_cents: int
    total_shipping_cents: int
    shipping_waived: bool
    total_cents: int
    total_weight_oz: int


class OrderOut(BaseModel):
    id: int
    user_id: int
    total_cents: int
    total_weight_oz: int
    created_at: datetime
    delivered_at: datetime | None
    items: list[CartItemOut]

    class Config:
        from_attributes = True


class OrderItemsResponse(BaseModel):
    orders: list[OrderOut]