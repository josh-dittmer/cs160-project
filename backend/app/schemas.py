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
    role: str
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


# ============ Admin Schemas ============

class UserListAdmin(BaseModel):
    """Schema for admin user list view"""
    id: int
    email: str
    full_name: str | None
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserRoleUpdate(BaseModel):
    """Schema for updating user role"""
    role: constr(pattern="^(admin|employee|manager|customer)$")


class UserBlockUpdate(BaseModel):
    """Schema for blocking/unblocking user"""
    is_active: bool


class ItemCreate(BaseModel):
    """Schema for creating a new item"""
    name: constr(min_length=1, max_length=255)
    price_cents: conint(ge=0)
    weight_oz: conint(ge=0)
    category: str | None = None
    image_url: str | None = None
    nutrition_json: str | None = None
    description: str | None = None
    stock_qty: conint(ge=0) = 0
    is_active: bool = True


class ItemUpdate(BaseModel):
    """Schema for updating an item (all fields optional)"""
    name: constr(min_length=1, max_length=255) | None = None
    price_cents: conint(ge=0) | None = None
    weight_oz: conint(ge=0) | None = None
    category: str | None = None
    image_url: str | None = None
    nutrition_json: str | None = None
    description: str | None = None
    stock_qty: conint(ge=0) | None = None
    is_active: bool | None = None


class ItemActivateUpdate(BaseModel):
    """Schema for activating/deactivating an item"""
    is_active: bool
