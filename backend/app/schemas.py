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
