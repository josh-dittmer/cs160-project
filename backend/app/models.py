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
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base


class Item(Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    price_cents: Mapped[int] = mapped_column(Integer)
    weight_oz: Mapped[int] = mapped_column(Integer)
    category: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
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


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("items.id"), index=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True)
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
