from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func, update
from ..database import get_db
from ..models import Item, Review
from ..schemas import ItemListOut, ItemDetailOut, ReviewOut, ReviewIn
from ..auth import require_user

router = APIRouter(prefix="/api", tags=["items"])

# --------- LIST VIEW ---------
@router.get("/items", response_model=List[ItemListOut])
def list_items(
    q: Optional[str] = Query(None, min_length=1),
    category: Optional[str] = None,
    in_stock: Optional[bool] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    stmt = select(Item).where(Item.is_active == True)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(Item.name.ilike(like))
    if category:
        stmt = stmt.where(Item.category == category)
    if in_stock is True:
        stmt = stmt.where(Item.stock_qty > 0)
    elif in_stock is False:
        stmt = stmt.where(Item.stock_qty <= 0)

    stmt = stmt.order_by(Item.name).limit(limit).offset(offset)
    return db.execute(stmt).scalars().all()


# --------- ITEM DETAIL ---------
@router.get("/items/{item_id}", response_model=ItemDetailOut)
def get_item(item_id: int, db: Session = Depends(get_db)):
    obj = db.get(Item, item_id)
    if not obj or not obj.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    return obj


# --------- REVIEWS: READ PAGED ---------
@router.get("/items/{item_id}/reviews", response_model=list[ReviewOut])
def list_reviews(
    item_id: int,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    if not db.get(Item, item_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")
    stmt = (
        select(Review)
        .where(Review.item_id == item_id)
        .order_by(Review.created_at.desc(), Review.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return db.execute(stmt).scalars().all()


# --------- REVIEWS: UPSERT (AUTH REQUIRED) ---------
@router.post("/items/{item_id}/reviews", status_code=status.HTTP_201_CREATED)
def upsert_review(
    item_id: int,
    payload: ReviewIn,
    user=Depends(require_user),
    db: Session = Depends(get_db),
):
    item = db.get(Item, item_id)
    if not item or not item.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not_found")

    existing = db.scalar(
        select(Review).where(Review.item_id == item_id, Review.user_id == user.id)
    )

    if existing:
        existing.rating = payload.rating
        existing.title = payload.title
        existing.body = payload.body
    else:
        db.add(Review(item_id=item_id, user_id=user.id, **payload.model_dump()))
    db.commit()

    # recompute summary on Item
    avg, cnt = db.execute(
        select(func.avg(Review.rating), func.count(Review.id)).where(Review.item_id == item_id)
    ).one()
    db.execute(
        update(Item)
        .where(Item.id == item_id)
        .values(avg_rating=float(avg or 0.0), ratings_count=int(cnt or 0))
    )
    db.commit()
    return {"ok": True}
