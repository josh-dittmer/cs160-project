from sqlalchemy.orm import Session
from sqlalchemy import select, func, update
from .database import engine, SessionLocal, Base
from .models import Item, Review

SAMPLE_ITEMS = [
    # Fruits (5+ items)
    dict(
        name="Organic Apples",
        price_cents=399,
        weight_oz=16,
        category="fruits",
        stock_qty=50,
        image_url="https://images.unsplash.com/photo-1568702846914-96b305d2aaeb",
        description="Crisp organic apples. 1 lb bag.",
    ),
    dict(
        name="Fresh Bananas",
        price_cents=199,
        weight_oz=24,
        category="fruits",
        stock_qty=75,
        image_url="https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e",
        description="Sweet ripe bananas. Perfect for smoothies and snacks.",
    ),
    dict(
        name="Strawberries",
        price_cents=499,
        weight_oz=16,
        category="fruits",
        stock_qty=35,
        image_url="https://images.unsplash.com/photo-1518635017498-87f514b751ba",
        description="Fresh organic strawberries. 1 lb container.",
    ),
    dict(
        name="Navel Oranges",
        price_cents=349,
        weight_oz=32,
        category="fruits",
        stock_qty=60,
        image_url="https://images.unsplash.com/photo-1547514701-42782101795e",
        description="Juicy navel oranges. 2 lb bag.",
    ),
    dict(
        name="Blueberries",
        price_cents=599,
        weight_oz=12,
        category="fruits",
        stock_qty=40,
        image_url="https://images.unsplash.com/photo-1498557850523-fd3d118b962e",
        description="Fresh organic blueberries. 12 oz container.",
    ),
    
    # Vegetables (5+ items)
    dict(
        name="Organic Tomatoes",
        price_cents=299,
        weight_oz=12,
        category="vegetables",
        stock_qty=40,
        image_url="https://images.unsplash.com/photo-1546094096-0df4bcaaa337",
        description="Vine-ripened organic tomatoes. ~12 oz.",
    ),
    dict(
        name="Romaine Lettuce",
        price_cents=249,
        weight_oz=10,
        category="vegetables",
        stock_qty=30,
        image_url="https://images.unsplash.com/photo-1556801712-76c8eb07bbc9",
        description="Fresh organic romaine lettuce head.",
    ),
    dict(
        name="Baby Carrots",
        price_cents=279,
        weight_oz=16,
        category="vegetables",
        stock_qty=55,
        image_url="https://images.unsplash.com/photo-1447175008436-054170c2e979",
        description="Sweet crunchy baby carrots. 1 lb bag.",
    ),
    dict(
        name="Bell Peppers",
        price_cents=449,
        weight_oz=20,
        category="vegetables",
        stock_qty=38,
        image_url="https://images.unsplash.com/photo-1525607551316-4a8e16d1f9ba",
        description="Colorful organic bell peppers. Mixed 3-pack.",
    ),
    dict(
        name="Cucumber",
        price_cents=199,
        weight_oz=12,
        category="vegetables",
        stock_qty=50,
        image_url="https://images.unsplash.com/photo-1604977042946-1eecc30f269e",
        description="Fresh organic cucumbers. 2-pack.",
    ),
    
    # Meat (5+ items)
    dict(
        name="Chicken Breast",
        price_cents=899,
        weight_oz=16,
        category="meat",
        stock_qty=25,
        image_url="https://images.unsplash.com/photo-1587593810167-a84920ea0781",
        description="Fresh boneless skinless chicken breast. 1 lb.",
    ),
    dict(
        name="Salmon Fillet",
        price_cents=1299,
        weight_oz=12,
        category="meat",
        stock_qty=20,
        image_url="https://images.unsplash.com/photo-1574781330855-d0db8cc6a79c",
        description="Fresh Atlantic salmon fillet. Wild-caught.",
    ),
    dict(
        name="Pork Chops",
        price_cents=949,
        weight_oz=16,
        category="meat",
        stock_qty=28,
        image_url="https://images.unsplash.com/photo-1602470520998-f4a52199a3d6",
        description="Bone-in center-cut pork chops. 1 lb.",
    ),
    dict(
        name="Turkey Breast",
        price_cents=1099,
        weight_oz=16,
        category="meat",
        stock_qty=22,
        image_url="https://images.unsplash.com/photo-1626200419199-391ae4be7a41",
        description="Fresh turkey breast cutlets. 1 lb.",
    ),
    dict(
        name="Shrimp",
        price_cents=1499,
        weight_oz=16,
        category="meat",
        stock_qty=18,
        image_url="https://images.unsplash.com/photo-1565680018434-b513d5e5fd47",
        description="Large frozen shrimp. Peeled and deveined. 1 lb.",
    ),
    
    # Dairy (5+ items)
    dict(
        name="Organic Milk",
        price_cents=549,
        weight_oz=64,
        category="dairy",
        stock_qty=40,
        image_url="https://images.unsplash.com/photo-1550583724-b2692b85b150",
        description="Organic whole milk. Half gallon.",
    ),
    dict(
        name="Greek Yogurt",
        price_cents=599,
        weight_oz=32,
        category="dairy",
        stock_qty=50,
        image_url="https://images.unsplash.com/photo-1571212515416-fef01fc43637",
        description="Plain Greek yogurt. 32 oz container.",
    ),
    dict(
        name="Cheddar Cheese",
        price_cents=699,
        weight_oz=16,
        category="dairy",
        stock_qty=35,
        image_url="https://images.unsplash.com/photo-1452195100486-9cc805987862",
        description="Sharp cheddar cheese block. 1 lb.",
    ),
    dict(
        name="Butter",
        price_cents=449,
        weight_oz=16,
        category="dairy",
        stock_qty=60,
        image_url="https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d",
        description="Unsalted butter. 1 lb (4 sticks).",
    ),
    dict(
        name="Eggs",
        price_cents=399,
        weight_oz=24,
        category="dairy",
        stock_qty=70,
        image_url="https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f",
        description="Large organic eggs. Dozen.",
    ),
    dict(
        name="Mozzarella Cheese",
        price_cents=549,
        weight_oz=16,
        category="dairy",
        stock_qty=42,
        image_url="https://images.unsplash.com/photo-1574071318508-1cdbab80d002",
        description="Fresh mozzarella cheese. 1 lb.",
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
