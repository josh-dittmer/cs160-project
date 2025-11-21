from datetime import datetime

from sqlalchemy import (
    Integer,
    String,
    Boolean,
    DateTime,
    Text,
    Float,
    ForeignKey,
    UniqueConstraint,
    CheckConstraint,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Enum as SQLEnum
from .database import Base
import enum


class Item(Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    price_cents: Mapped[int] = mapped_column(Integer)
    weight_oz: Mapped[int] = mapped_column(Integer)
    category: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    video_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    nutrition_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    # new fields for Sprint 1.5
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    avg_rating: Mapped[float] = mapped_column(Float, default=0)
    ratings_count: Mapped[int] = mapped_column(Integer, default=0)

    stock_qty: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    
    # Relationship to users who favorited this item
    favorited_by_users: Mapped[list["User"]] = relationship(
        "User",
        secondary="favorites",
        back_populates="favorited_items"
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True) 

    # Google OAuth fields
    google_id: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    
    # Profile fields
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    zipcode: Mapped[str | None] = mapped_column(String(10), nullable=True)
    state: Mapped[str | None] = mapped_column(String(50), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    profile_picture: Mapped[str | None] = mapped_column(Text, nullable=True)  # base64 or URL
    
    # Role-based access control
    role: Mapped[str] = mapped_column(String(20), default="customer", index=True)
    
    # Reporting hierarchy - self-referential foreign key
    reports_to: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    
    # Relationships for reporting hierarchy
    subordinates: Mapped[list["User"]] = relationship(
        "User",
        back_populates="manager",
        foreign_keys=[reports_to]
    )
    manager: Mapped["User | None"] = relationship(
        "User",
        back_populates="subordinates",
        remote_side=[id],
        foreign_keys=[reports_to]
    )
    
    # Relationship to favorited items (many-to-many through Favorite table)
    favorited_items: Mapped[list["Item"]] = relationship(
        "Item",
        secondary="favorites",
        back_populates="favorited_by_users"
    )


class Favorite(Base):
    """Join table for user favorites (many-to-many relationship)"""
    __tablename__ = "favorites"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True, index=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("items.id"), primary_key=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("items.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    rating: Mapped[int] = mapped_column(Integer)  # 1..5
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        UniqueConstraint("item_id", "user_id", name="uq_review_item_user"),
        CheckConstraint("rating BETWEEN 1 AND 5", name="ck_rating_range"),
    )

class DeliveryVehicleStatus(enum.Enum):
    READY = "ready"
    DELIVERING = "delivering"
    RETURNING = "returning"

class DeliveryVehicle(Base):
    __tablename__ = "delivery_vehicle"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    secret_hash: Mapped[str] = mapped_column(String(32))

    last_latitude: Mapped[float] = mapped_column(Float, nullable=True)
    last_longitude: Mapped[float] = mapped_column(Float, nullable=True)

    status: Mapped[DeliveryVehicleStatus] = mapped_column(
        SQLEnum(DeliveryVehicleStatus), default=DeliveryVehicleStatus.READY, index=True
    )

class CartItem(Base):
    __tablename__ = "cart_item"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    quantity: Mapped[int] = mapped_column(Integer)
    item_id: Mapped[int] = mapped_column(ForeignKey("items.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    item = relationship(Item)
    user = relationship(User)

class OrderStatus(enum.Enum):
    PACKING = "packing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELED = "canceled"

class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    delivered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    payment_intent_id: Mapped[str | None] = mapped_column(String(255), index=True)

    display_address: Mapped[str] = mapped_column(String(255))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)

    status: Mapped[OrderStatus] = mapped_column(
        SQLEnum(OrderStatus), default=OrderStatus.PACKING, index=True
    )

    polyline: Mapped[str] = mapped_column(String(255), nullable=True)
    delivery_vehicle_id: Mapped[int] = mapped_column(ForeignKey("delivery_vehicle.id"), index=True, nullable=True)

    user = relationship(User)
    delivery_vehicle = relationship(DeliveryVehicle)

class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), index=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("items.id"), index=True)
    quantity: Mapped[int] = mapped_column(Integer)

    order = relationship(Order)
    item = relationship(Item)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    action_type: Mapped[str] = mapped_column(String(100), index=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    actor_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    target_type: Mapped[str] = mapped_column(String(50), index=True)
    target_id: Mapped[int] = mapped_column(Integer, index=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)  # IPv6 max length
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    actor = relationship(User)
