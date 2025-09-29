from datetime import datetime
from pydantic import BaseModel, conint, constr


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
