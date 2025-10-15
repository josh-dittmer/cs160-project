from typing import List, Optional, Dict, Union
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func, update
from rapidfuzz import fuzz
from ..database import get_db
from ..models import Item, Review
from ..schemas import ItemListOut, ItemDetailOut, ReviewOut, ReviewIn, SearchSuggestion
from ..auth import require_user

router = APIRouter(prefix="/api", tags=["items"])

def calculate_similarity(query: str, target: str) -> float:
    """
    Calculate similarity score between query and target string using rapidfuzz.
    Uses word-by-word matching to prevent false positives.
    Returns a score between 0 and 1.
    """
    query_lower = query.lower().strip()
    target_lower = target.lower().strip()
    
    # Exact match
    if query_lower == target_lower:
        return 1.0
    
    # Substring match (no typos)
    if query_lower in target_lower:
        return 0.9
    
    # Split into words
    query_words = query_lower.split()
    target_words = target_lower.split()
    
    # Single word query - must match at least one target word well
    if len(query_words) == 1:
        query_word = query_words[0]
        best_score = 0.0
        
        for target_word in target_words:
            # Check substring first
            if query_word in target_word:
                best_score = max(best_score, 0.85)
            elif target_word in query_word:
                best_score = max(best_score, 0.85)
            else:
                # Use fuzzy matching for typos
                word_score = fuzz.ratio(query_word, target_word) / 100.0
                best_score = max(best_score, word_score)
        
        # Strict threshold for single word: 0.75 (75%)
        return best_score if best_score >= 0.75 else 0.0
    
    # Multi-word query - ALL query words must match
    matched_scores = []
    used_target_indices = set()
    
    for query_word in query_words:
        best_word_score = 0.0
        best_target_idx = -1
        
        for idx, target_word in enumerate(target_words):
            if idx in used_target_indices:
                continue
            
            # Check for substring match or fuzzy match
            if query_word in target_word or target_word in query_word:
                score = 0.9
            else:
                score = fuzz.ratio(query_word, target_word) / 100.0
            
            if score > best_word_score:
                best_word_score = score
                best_target_idx = idx
        
        # Each query word must have a match with score >= 0.7
        if best_word_score >= 0.7:
            matched_scores.append(best_word_score)
            if best_target_idx != -1:
                used_target_indices.add(best_target_idx)
        else:
            # If any query word doesn't match well enough, reject the result
            return 0.0
    
    # All query words matched - calculate average score
    if matched_scores and len(matched_scores) == len(query_words):
        return sum(matched_scores) / len(matched_scores)
    
    return 0.0


# --------- SEARCH WITH AUTOCOMPLETE ---------
@router.get("/search", response_model=List[SearchSuggestion])
def search_items(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of results"),
    db: Session = Depends(get_db),
) -> List[SearchSuggestion]:
    """
    Search items by name with fuzzy matching for typo tolerance.
    Returns suggestions ranked by relevance.
    """
    # Get all active items
    stmt = select(Item).where(Item.is_active == True)
    all_items = db.execute(stmt).scalars().all()
    
    # Calculate similarity scores for each item
    results = []
    for item in all_items:
        score = calculate_similarity(q, item.name)
        
        # Only include items with meaningful similarity (score > 0)
        if score > 0:
            results.append({
                "id": item.id,
                "name": item.name,
                "category": item.category,
                "image_url": item.image_url,
                "price_cents": item.price_cents,
                "relevance_score": score
            })
    
    # Sort by relevance score (highest first)
    results.sort(key=lambda x: x["relevance_score"], reverse=True)
    
    # Return top results
    return results[:limit]


# --------- LIST VIEW (flexible grouping) ---------
@router.get("/items", response_model=Dict[str, List[ItemListOut]])
def list_items(
    group_by: str = Query(..., description="Field to group items by (category, price, name, etc.)"),
    db: Session = Depends(get_db),
) -> Dict[str, List[ItemListOut]]:
    """
    Returns all items grouped by the specified field.
    Flexible endpoint that can group by any field: category, price, name, etc.
    
    Examples:
    - /api/items?group_by=category -> groups by category
    - /api/items?group_by=price -> groups by price
    - /api/items?group_by=name -> groups by first letter of name
    """
    stmt = select(Item).where(Item.is_active == True).order_by(Item.name)
    all_items = db.execute(stmt).scalars().all()
    
    # Group items by the specified field
    grouped: Dict[str, List[ItemListOut]] = {}
    
    for item in all_items:
        # Determine the grouping key based on group_by parameter
        if group_by == "category":
            key = item.category or "other"
        elif group_by == "price":
            # Group by price range
            price_dollars = item.price_cents / 100
            if price_dollars < 3:
                key = "under_$3"
            elif price_dollars < 5:
                key = "$3_to_$5"
            elif price_dollars < 10:
                key = "$5_to_$10"
            else:
                key = "over_$10"
        elif group_by == "name":
            # Group by first letter
            key = item.name[0].upper() if item.name else "other"
        else:
            # For any other field, try to get it from the item
            key = str(getattr(item, group_by, "other"))
        
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(ItemListOut.model_validate(item))
    
    return grouped


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