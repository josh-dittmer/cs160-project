from datetime import datetime
from pydantic import BaseModel, conint, constr, EmailStr
from .models import OrderStatus

class ItemOut(BaseModel):
    """Basic item schema (for favorites and simple listings)."""
    id: int
    name: str
    price_cents: int
    weight_oz: int
    category: str | None = None
    image_url: str | None = None
    video_url: str | None = None
    avg_rating: float
    ratings_count: int

    class Config:
        from_attributes = True


class ItemListOut(BaseModel):
    """Shape for list view."""
    id: int
    name: str
    price_cents: int
    weight_oz: int
    category: str | None = None
    image_url: str | None = None
    video_url: str | None = None
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
    google_id: str | None = None
    phone: str | None = None
    address: str | None = None
    city: str | None = None
    zipcode: str | None = None
    state: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    profile_picture: str | None = None
    role: str
    reports_to: int | None = None
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


class UserProfileUpdate(BaseModel):
    """Schema for updating user profile"""
    full_name: str | None = None
    phone: str | None = None
    address: str | None = None
    city: str | None = None
    zipcode: str | None = None
    state: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    profile_picture: str | None = None


class PasswordChange(BaseModel):
    """Schema for changing password"""
    current_password: str
    new_password: constr(min_length=8)


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
    item: ItemDetailOut
    
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
    status: OrderStatus
    display_address: str
    latitude: float
    longitude: float
    items: list[CartItemOut]

    class Config:
        from_attributes = True

class OrderItemsResponse(BaseModel):
    orders: list[OrderOut]

class ConfirmPaymentRequest(BaseModel):
    intentId: str
    clientSecret: str
    displayAddress: str
    latitude: float
    longitude: float

class ConfirmPaymentResponse(BaseModel):
    orderId: int

class CreatePaymentIntentResponse(BaseModel):
    clientSecret: str
    customerSessionClientSecret: str
    totalCents: int
    totalWeightOz: int

class CreateSetupIntenetResponse(BaseModel):
    clientSecret: str
    customerSessionClientSecret: str

class OrderRouteResponse(BaseModel):
    polyline: str | None

# ============ Admin Schemas ============

class UserListAdmin(BaseModel):
    """Schema for admin user list view"""
    id: int
    email: str
    full_name: str | None
    role: str
    reports_to: int | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserRoleUpdate(BaseModel):
    """Schema for updating user role"""
    role: constr(pattern="^(admin|employee|manager|customer)$")
    manager_id: int | None = None  # Required when promoting to employee
    subordinate_reassignments: dict[int, int] | None = None  # {employee_id: new_manager_id} - Required when demoting manager with subordinates


class UserBlockUpdate(BaseModel):
    """Schema for blocking/unblocking user"""
    is_active: bool
    subordinate_reassignments: dict[int, int] | None = None  # {employee_id: new_manager_id} - Required when blocking manager with subordinates


class UserManagerUpdate(BaseModel):
    """Schema for updating employee's manager"""
    manager_id: int


class ItemCreate(BaseModel):
    """Schema for creating a new item"""
    name: constr(min_length=1, max_length=255)
    price_cents: conint(gt=0)
    weight_oz: conint(gt=0, le=3200)  # Max 200 lbs (3200 oz) - vehicle capacity limit
    category: str | None = None
    image_url: str | None = None
    video_url: str | None = None
    nutrition_json: str | None = None
    description: str | None = None
    stock_qty: conint(ge=0) = 0
    is_active: bool = True


class ItemUpdate(BaseModel):
    """Schema for updating an item (all fields optional)"""
    name: constr(min_length=1, max_length=255) | None = None
    price_cents: conint(gt=0) | None = None
    weight_oz: conint(gt=0, le=3200) | None = None  # Max 200 lbs (3200 oz) - delivery vehicle capacity limit
    category: str | None = None
    image_url: str | None = None
    video_url: str | None = None
    nutrition_json: str | None = None
    description: str | None = None
    stock_qty: conint(ge=0) | None = None
    is_active: bool | None = None


class ItemActivateUpdate(BaseModel):
    """Schema for activating/deactivating an item"""
    is_active: bool


# ============ Admin Order Management Schemas ============

class OrderItemAdmin(BaseModel):
    """Schema for order items in admin view"""
    id: int
    quantity: int
    item_id: int
    item_name: str
    item_price_cents: int
    item_image_url: str | None = None
    
    class Config:
        from_attributes = True


class OrderUserInfo(BaseModel):
    """Basic user info for order view"""
    id: int
    email: str
    full_name: str | None
    
    class Config:
        from_attributes = True


class OrderListAdmin(BaseModel):
    """Schema for admin order list view"""
    id: int
    user_id: int
    user_email: str
    user_full_name: str | None
    total_cents: int
    total_items: int
    created_at: datetime
    delivered_at: datetime | None
    payment_intent_id: str | None
    is_delivered: bool
    
    class Config:
        from_attributes = True


class OrderDetailAdmin(BaseModel):
    """Schema for admin order detail view"""
    id: int
    user: OrderUserInfo
    items: list[OrderItemAdmin]
    total_cents: int
    total_weight_oz: int
    created_at: datetime
    delivered_at: datetime | None
    payment_intent_id: str | None
    is_delivered: bool
    
    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    """Schema for updating order delivery status"""
    delivered: bool
    status: OrderStatus | None = None
    delivery_vehicle_id: int | None = None


# ============ Audit Log Schemas ============

class AuditLogOut(BaseModel):
    """Schema for audit log output"""
    id: int
    action_type: str
    actor_id: int | None
    actor_email: str | None
    target_type: str
    target_id: int
    details: str | None  # JSON string
    ip_address: str | None
    timestamp: datetime
    
    class Config:
        from_attributes = True


class AuditLogStats(BaseModel):
    """Schema for audit log statistics"""
    total_logs: int
    logs_last_24h: int
    logs_last_7d: int
    top_actions: list[dict[str, str | int]]  # [{"action_type": "...", "count": ...}]
    top_actors: list[dict[str, str | int]]  # [{"actor_email": "...", "count": ...}]
    
class DeliveryVehicleAuth(BaseModel):
    id: int
    secret: str

# ============ Employee Schemas ============

class ItemStockUpdate(BaseModel):
    """Schema for updating item stock quantity (employee-only field)"""
    stock_qty: conint(ge=0)


class OrderListEmployee(BaseModel):
    """Schema for employee order list view (read-only)"""
    id: int
    user_id: int
    user_email: str
    user_full_name: str | None
    total_cents: int
    total_items: int
    created_at: datetime
    delivered_at: datetime | None
    payment_intent_id: str | None
    is_delivered: bool
    
    class Config:
        from_attributes = True


class OrderDetailEmployee(BaseModel):
    """Schema for employee order detail view (read-only)"""
    id: int
    user: OrderUserInfo
    items: list[OrderItemAdmin]
    total_cents: int
    total_weight_oz: int
    created_at: datetime
    delivered_at: datetime | None
    payment_intent_id: str | None
    is_delivered: bool
    
    class Config:
        from_attributes = True
