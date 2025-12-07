from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Favorite, Item, User
from ..schemas import ItemOut
from ..auth import get_current_user

router = APIRouter(
    prefix="/api/favorites",
    tags=["favorites"]
)

@router.get("/", response_model=list[ItemOut])
def get_user_favorites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    active_favorites = (
        db.query(Item)
        .join(Favorite, Favorite.item_id == Item.id)
        .filter(Favorite.user_id == current_user.id)
        .filter(Item.is_active == True)
        .all()
    )
    return active_favorites


# Add a new favorite
@router.post("/{item_id}")
def add_favorite(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if not item.is_active:
        raise HTTPException(status_code=400, detail="Cannot favorite a deactivated item")

    existing = (
        db.query(Favorite)
        .filter(Favorite.user_id == current_user.id, Favorite.item_id == item_id)
        .first()
    )
    if existing:
        return {"message": "Already favorited"}

    fav = Favorite(user_id=current_user.id, item_id=item_id)
    db.add(fav)
    db.commit()
    db.refresh(fav)
    return {"message": "Added to favorites"}


# Remove from favorites
@router.delete("/{item_id}")
def remove_favorite(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    fav = (
        db.query(Favorite)
        .filter(Favorite.user_id == current_user.id, Favorite.item_id == item_id)
        .first()
    )
    if not fav:
        raise HTTPException(status_code=404, detail="Favorite not found")

    db.delete(fav)
    db.commit()
    return {"message": "Removed from favorites"}
