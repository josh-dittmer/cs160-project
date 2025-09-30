from sqlalchemy.orm import Session
from sqlalchemy import select, func, update
from .database import engine, SessionLocal, Base
from .models import Item, Review

SAMPLE_ITEMS = [
    dict(
        name="Organic Apples",
        price_cents=399,
        weight_oz=16,
        category="fruits",
        stock_qty=50,
        image_url=None,
        description="Crisp organic apples. 1 lb bag.",
    ),
    dict(
        name="Organic Tomatoes",
        price_cents=299,
        weight_oz=12,
        category="vegetables",
        stock_qty=40,
        image_url=None,
        description="Vine-ripened organic tomatoes. ~12 oz.",
    ),
    dict(
        name="Organic Lettuce",
        price_cents=249,
        weight_oz=10,
        category="vegetables",
        stock_qty=30,
        image_url=None,
        description="Fresh organic romaine lettuce.",
    ),
]

SAMPLE_REVIEWS = [
    # (item_index, user_id, rating, title, body)
    (0, 101, 5, "Great apples", "Sweet and crunchy."),
    (0, 102, 4, "Good", "Tasty but a couple were small."),
    (1, 201, 5, "Tomatoes on point", "Perfect for salads."),
]


def seed():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        if db.query(Item).count() == 0:
            for d in SAMPLE_ITEMS:
                db.add(Item(**d))
            db.commit()

        # add a few reviews if none
        if db.query(Review).count() == 0:
            items = db.query(Item).order_by(Item.id).all()
            for idx, user_id, rating, title, body in SAMPLE_REVIEWS:
                db.add(
                    Review(
                        item_id=items[idx].id,
                        user_id=user_id,
                        rating=rating,
                        title=title,
                        body=body,
                    )
                )
            db.commit()

            # recompute summaries
            for it in items:
                avg, cnt = db.execute(
                    select(func.avg(Review.rating), func.count(Review.id)).where(
                        Review.item_id == it.id
                    )
                ).one()
                db.execute(
                    update(Item)
                    .where(Item.id == it.id)
                    .values(avg_rating=float(avg or 0.0), ratings_count=int(cnt or 0))
                )
            db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
