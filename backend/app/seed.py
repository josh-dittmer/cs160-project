from sqlalchemy.orm import Session
from sqlalchemy import select, func, update
from .database import engine, SessionLocal, Base
from .models import Item, Review, Order, OrderItem, User
from .auth import get_password_hash
from datetime import datetime
import json

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
        nutrition_json=json.dumps({
            "servingSize": "1 medium apple (182g)",
            "servingsPerContainer": "~2.5",
            "calories": 95,
            "totalFat": {"value": 0.3, "unit": "g", "dailyValue": 0},
            "saturatedFat": {"value": 0.1, "unit": "g", "dailyValue": 0},
            "transFat": {"value": 0, "unit": "g"},
            "cholesterol": {"value": 0, "unit": "mg", "dailyValue": 0},
            "sodium": {"value": 2, "unit": "mg", "dailyValue": 0},
            "totalCarbohydrate": {"value": 25, "unit": "g", "dailyValue": 9},
            "dietaryFiber": {"value": 4.4, "unit": "g", "dailyValue": 16},
            "totalSugars": {"value": 19, "unit": "g"},
            "protein": {"value": 0.5, "unit": "g"},
            "vitaminD": {"value": 0, "unit": "mcg", "dailyValue": 0},
            "calcium": {"value": 11, "unit": "mg", "dailyValue": 1},
            "iron": {"value": 0.2, "unit": "mg", "dailyValue": 1},
            "potassium": {"value": 195, "unit": "mg", "dailyValue": 4},
            "vitaminC": {"value": 8.4, "unit": "mg", "dailyValue": 9},
            "vitaminA": {"value": 98, "unit": "IU", "dailyValue": 2}
        }),
    ),
    dict(
        name="Organic Fresh Bananas",
        price_cents=199,
        weight_oz=24,
        category="fruits",
        stock_qty=75,
        image_url="https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e",
        description="Sweet ripe bananas. Perfect for smoothies and snacks.",
        nutrition_json=json.dumps({
            "servingSize": "1 medium banana (118g)",
            "servingsPerContainer": "~5-6",
            "calories": 105,
            "totalFat": {"value": 0.4, "unit": "g", "dailyValue": 1},
            "saturatedFat": {"value": 0.1, "unit": "g", "dailyValue": 1},
            "transFat": {"value": 0, "unit": "g"},
            "cholesterol": {"value": 0, "unit": "mg", "dailyValue": 0},
            "sodium": {"value": 1, "unit": "mg", "dailyValue": 0},
            "totalCarbohydrate": {"value": 27, "unit": "g", "dailyValue": 10},
            "dietaryFiber": {"value": 3.1, "unit": "g", "dailyValue": 11},
            "totalSugars": {"value": 14, "unit": "g"},
            "protein": {"value": 1.3, "unit": "g"},
            "vitaminD": {"value": 0, "unit": "mcg", "dailyValue": 0},
            "calcium": {"value": 6, "unit": "mg", "dailyValue": 0},
            "iron": {"value": 0.3, "unit": "mg", "dailyValue": 2},
            "potassium": {"value": 422, "unit": "mg", "dailyValue": 9},
            "vitaminC": {"value": 10.3, "unit": "mg", "dailyValue": 11},
            "vitaminB6": {"value": 0.4, "unit": "mg", "dailyValue": 24}
        }),
    ),
    dict(
        name="Organic Strawberries",
        price_cents=499,
        weight_oz=16,
        category="fruits",
        stock_qty=35,
        image_url="https://images.unsplash.com/photo-1518635017498-87f514b751ba",
        description="Fresh organic strawberries. 1 lb container.",
        nutrition_json=json.dumps({
            "servingSize": "8 medium strawberries (147g)",
            "servingsPerContainer": "~3",
            "calories": 47,
            "totalFat": {"value": 0.4, "unit": "g", "dailyValue": 1},
            "saturatedFat": {"value": 0, "unit": "g", "dailyValue": 0},
            "transFat": {"value": 0, "unit": "g"},
            "cholesterol": {"value": 0, "unit": "mg", "dailyValue": 0},
            "sodium": {"value": 1, "unit": "mg", "dailyValue": 0},
            "totalCarbohydrate": {"value": 11, "unit": "g", "dailyValue": 4},
            "dietaryFiber": {"value": 3, "unit": "g", "dailyValue": 11},
            "totalSugars": {"value": 7, "unit": "g"},
            "protein": {"value": 1, "unit": "g"},
            "vitaminD": {"value": 0, "unit": "mcg", "dailyValue": 0},
            "calcium": {"value": 24, "unit": "mg", "dailyValue": 2},
            "iron": {"value": 0.6, "unit": "mg", "dailyValue": 3},
            "potassium": {"value": 220, "unit": "mg", "dailyValue": 5},
            "vitaminC": {"value": 89, "unit": "mg", "dailyValue": 99},
            "folate": {"value": 35, "unit": "mcg", "dailyValue": 9}
        }),
    ),
    dict(
        name="Organic Navel Oranges",
        price_cents=349,
        weight_oz=32,
        category="fruits",
        stock_qty=60,
        image_url="https://images.unsplash.com/photo-1547514701-42782101795e",
        description="Juicy navel oranges. 2 lb bag.",
        nutrition_json=json.dumps({
            "servingSize": "1 medium orange (140g)",
            "servingsPerContainer": "~6-7",
            "calories": 65,
            "totalFat": {"value": 0.2, "unit": "g", "dailyValue": 0},
            "saturatedFat": {"value": 0, "unit": "g", "dailyValue": 0},
            "transFat": {"value": 0, "unit": "g"},
            "cholesterol": {"value": 0, "unit": "mg", "dailyValue": 0},
            "sodium": {"value": 0, "unit": "mg", "dailyValue": 0},
            "totalCarbohydrate": {"value": 16, "unit": "g", "dailyValue": 6},
            "dietaryFiber": {"value": 3.1, "unit": "g", "dailyValue": 11},
            "totalSugars": {"value": 12, "unit": "g"},
            "protein": {"value": 1.3, "unit": "g"},
            "vitaminD": {"value": 0, "unit": "mcg", "dailyValue": 0},
            "calcium": {"value": 52, "unit": "mg", "dailyValue": 4},
            "iron": {"value": 0.1, "unit": "mg", "dailyValue": 1},
            "potassium": {"value": 237, "unit": "mg", "dailyValue": 5},
            "vitaminC": {"value": 82, "unit": "mg", "dailyValue": 91},
            "folate": {"value": 40, "unit": "mcg", "dailyValue": 10}
        }),
    ),
    dict(
        name="Organic Blueberries",
        price_cents=599,
        weight_oz=12,
        category="fruits",
        stock_qty=40,
        image_url="https://images.unsplash.com/photo-1498557850523-fd3d118b962e",
        description="Fresh organic blueberries. 12 oz container.",
        nutrition_json=json.dumps({
            "servingSize": "1 cup (148g)",
            "servingsPerContainer": "~2.3",
            "calories": 84,
            "totalFat": {"value": 0.5, "unit": "g", "dailyValue": 1},
            "saturatedFat": {"value": 0, "unit": "g", "dailyValue": 0},
            "transFat": {"value": 0, "unit": "g"},
            "cholesterol": {"value": 0, "unit": "mg", "dailyValue": 0},
            "sodium": {"value": 1, "unit": "mg", "dailyValue": 0},
            "totalCarbohydrate": {"value": 21, "unit": "g", "dailyValue": 8},
            "dietaryFiber": {"value": 3.6, "unit": "g", "dailyValue": 13},
            "totalSugars": {"value": 15, "unit": "g"},
            "protein": {"value": 1.1, "unit": "g"},
            "vitaminD": {"value": 0, "unit": "mcg", "dailyValue": 0},
            "calcium": {"value": 9, "unit": "mg", "dailyValue": 1},
            "iron": {"value": 0.4, "unit": "mg", "dailyValue": 2},
            "potassium": {"value": 114, "unit": "mg", "dailyValue": 2},
            "vitaminC": {"value": 14, "unit": "mg", "dailyValue": 16},
            "vitaminK": {"value": 29, "unit": "mcg", "dailyValue": 24}
        }),
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
        nutrition_json=json.dumps({
            "servingSize": "1 medium tomato (123g)",
            "servingsPerContainer": "~2.5",
            "calories": 22,
            "totalFat": {"value": 0.2, "unit": "g", "dailyValue": 0},
            "saturatedFat": {"value": 0, "unit": "g", "dailyValue": 0},
            "transFat": {"value": 0, "unit": "g"},
            "cholesterol": {"value": 0, "unit": "mg", "dailyValue": 0},
            "sodium": {"value": 6, "unit": "mg", "dailyValue": 0},
            "totalCarbohydrate": {"value": 4.8, "unit": "g", "dailyValue": 2},
            "dietaryFiber": {"value": 1.5, "unit": "g", "dailyValue": 5},
            "totalSugars": {"value": 3.2, "unit": "g"},
            "protein": {"value": 1.1, "unit": "g"},
            "vitaminD": {"value": 0, "unit": "mcg", "dailyValue": 0},
            "calcium": {"value": 12, "unit": "mg", "dailyValue": 1},
            "iron": {"value": 0.3, "unit": "mg", "dailyValue": 2},
            "potassium": {"value": 292, "unit": "mg", "dailyValue": 6},
            "vitaminC": {"value": 17, "unit": "mg", "dailyValue": 19},
            "vitaminA": {"value": 1025, "unit": "IU", "dailyValue": 20}
        }),
    ),
    dict(
        name="Organic Romaine Lettuce",
        price_cents=249,
        weight_oz=10,
        category="vegetables",
        stock_qty=30,
        image_url="https://images.unsplash.com/photo-1556801712-76c8eb07bbc9",
        description="Fresh organic romaine lettuce head.",
        nutrition_json=json.dumps({
            "servingSize": "2 cups shredded (85g)",
            "servingsPerContainer": "~3",
            "calories": 15,
            "totalFat": {"value": 0.3, "unit": "g", "dailyValue": 0},
            "saturatedFat": {"value": 0, "unit": "g", "dailyValue": 0},
            "transFat": {"value": 0, "unit": "g"},
            "cholesterol": {"value": 0, "unit": "mg", "dailyValue": 0},
            "sodium": {"value": 7, "unit": "mg", "dailyValue": 0},
            "totalCarbohydrate": {"value": 2.7, "unit": "g", "dailyValue": 1},
            "dietaryFiber": {"value": 1.7, "unit": "g", "dailyValue": 6},
            "totalSugars": {"value": 1, "unit": "g"},
            "protein": {"value": 1, "unit": "g"},
            "vitaminD": {"value": 0, "unit": "mcg", "dailyValue": 0},
            "calcium": {"value": 28, "unit": "mg", "dailyValue": 2},
            "iron": {"value": 0.8, "unit": "mg", "dailyValue": 4},
            "potassium": {"value": 229, "unit": "mg", "dailyValue": 5},
            "vitaminC": {"value": 19, "unit": "mg", "dailyValue": 21},
            "vitaminA": {"value": 7492, "unit": "IU", "dailyValue": 150},
            "vitaminK": {"value": 85, "unit": "mcg", "dailyValue": 71}
        }),
    ),
    dict(
        name="Organic Baby Carrots",
        price_cents=279,
        weight_oz=16,
        category="vegetables",
        stock_qty=55,
        image_url="https://images.unsplash.com/photo-1447175008436-054170c2e979",
        description="Sweet crunchy baby carrots. 1 lb bag.",
        nutrition_json=json.dumps({
            "servingSize": "3 oz (85g, ~10 baby carrots)",
            "servingsPerContainer": "~5",
            "calories": 35,
            "totalFat": {"value": 0, "unit": "g", "dailyValue": 0},
            "saturatedFat": {"value": 0, "unit": "g", "dailyValue": 0},
            "transFat": {"value": 0, "unit": "g"},
            "cholesterol": {"value": 0, "unit": "mg", "dailyValue": 0},
            "sodium": {"value": 75, "unit": "mg", "dailyValue": 3},
            "totalCarbohydrate": {"value": 8, "unit": "g", "dailyValue": 3},
            "dietaryFiber": {"value": 2, "unit": "g", "dailyValue": 7},
            "totalSugars": {"value": 5, "unit": "g"},
            "protein": {"value": 1, "unit": "g"},
            "vitaminD": {"value": 0, "unit": "mcg", "dailyValue": 0},
            "calcium": {"value": 30, "unit": "mg", "dailyValue": 2},
            "iron": {"value": 0.3, "unit": "mg", "dailyValue": 2},
            "potassium": {"value": 270, "unit": "mg", "dailyValue": 6},
            "vitaminA": {"value": 9230, "unit": "IU", "dailyValue": 184},
            "vitaminC": {"value": 5, "unit": "mg", "dailyValue": 6}
        }),
    ),
    dict(
        name="Organic Bell Peppers",
        price_cents=449,
        weight_oz=20,
        category="vegetables",
        stock_qty=38,
        image_url="https://images.unsplash.com/photo-1525607551316-4a8e16d1f9ba",
        description="Colorful organic bell peppers. Mixed 3-pack.",
        nutrition_json=json.dumps({
            "servingSize": "1 medium pepper (119g)",
            "servingsPerContainer": "~3",
            "calories": 31,
            "totalFat": {"value": 0.2, "unit": "g", "dailyValue": 0},
            "saturatedFat": {"value": 0, "unit": "g", "dailyValue": 0},
            "transFat": {"value": 0, "unit": "g"},
            "cholesterol": {"value": 0, "unit": "mg", "dailyValue": 0},
            "sodium": {"value": 5, "unit": "mg", "dailyValue": 0},
            "totalCarbohydrate": {"value": 7, "unit": "g", "dailyValue": 3},
            "dietaryFiber": {"value": 2.5, "unit": "g", "dailyValue": 9},
            "totalSugars": {"value": 5, "unit": "g"},
            "protein": {"value": 1.2, "unit": "g"},
            "vitaminD": {"value": 0, "unit": "mcg", "dailyValue": 0},
            "calcium": {"value": 8, "unit": "mg", "dailyValue": 1},
            "iron": {"value": 0.5, "unit": "mg", "dailyValue": 3},
            "potassium": {"value": 251, "unit": "mg", "dailyValue": 5},
            "vitaminC": {"value": 152, "unit": "mg", "dailyValue": 169},
            "vitaminA": {"value": 3726, "unit": "IU", "dailyValue": 75}
        }),
    ),
    dict(
        name="Organic Cucumber",
        price_cents=199,
        weight_oz=12,
        category="vegetables",
        stock_qty=50,
        image_url="https://images.unsplash.com/photo-1604977042946-1eecc30f269e",
        description="Fresh organic cucumbers. 2-pack.",
        nutrition_json=json.dumps({
            "servingSize": "1/2 cucumber (150g)",
            "servingsPerContainer": "~4",
            "calories": 23,
            "totalFat": {"value": 0.2, "unit": "g", "dailyValue": 0},
            "saturatedFat": {"value": 0, "unit": "g", "dailyValue": 0},
            "transFat": {"value": 0, "unit": "g"},
            "cholesterol": {"value": 0, "unit": "mg", "dailyValue": 0},
            "sodium": {"value": 3, "unit": "mg", "dailyValue": 0},
            "totalCarbohydrate": {"value": 5, "unit": "g", "dailyValue": 2},
            "dietaryFiber": {"value": 1, "unit": "g", "dailyValue": 4},
            "totalSugars": {"value": 3, "unit": "g"},
            "protein": {"value": 1, "unit": "g"},
            "vitaminD": {"value": 0, "unit": "mcg", "dailyValue": 0},
            "calcium": {"value": 24, "unit": "mg", "dailyValue": 2},
            "iron": {"value": 0.4, "unit": "mg", "dailyValue": 2},
            "potassium": {"value": 220, "unit": "mg", "dailyValue": 5},
            "vitaminC": {"value": 4, "unit": "mg", "dailyValue": 4},
            "vitaminK": {"value": 25, "unit": "mcg", "dailyValue": 21}
        }),
    ),
    
    # Meat (4 items)
    dict(
        name="Organic Chicken Breast",
        price_cents=899,
        weight_oz=16,
        category="meat",
        stock_qty=25,
        image_url="https://images.unsplash.com/photo-1587593810167-a84920ea0781",
        description="Fresh boneless skinless chicken breast. 1 lb.",
        nutrition_json=json.dumps({
            "servingSize": "4 oz (112g, cooked)",
            "servingsPerContainer": "~4",
            "calories": 165,
            "totalFat": {"value": 3.6, "unit": "g", "dailyValue": 5},
            "saturatedFat": {"value": 1, "unit": "g", "dailyValue": 5},
            "transFat": {"value": 0, "unit": "g"},
            "cholesterol": {"value": 85, "unit": "mg", "dailyValue": 28},
            "sodium": {"value": 74, "unit": "mg", "dailyValue": 3},
            "totalCarbohydrate": {"value": 0, "unit": "g", "dailyValue": 0},
            "dietaryFiber": {"value": 0, "unit": "g", "dailyValue": 0},
            "totalSugars": {"value": 0, "unit": "g"},
            "protein": {"value": 31, "unit": "g"},
            "vitaminD": {"value": 0.1, "unit": "mcg", "dailyValue": 0},
            "calcium": {"value": 15, "unit": "mg", "dailyValue": 1},
            "iron": {"value": 1, "unit": "mg", "dailyValue": 6},
            "potassium": {"value": 256, "unit": "mg", "dailyValue": 5},
            "vitaminB6": {"value": 0.6, "unit": "mg", "dailyValue": 35},
            "vitaminB12": {"value": 0.3, "unit": "mcg", "dailyValue": 13}
        }),
    ),
    dict(
        name="Organic Salmon Fillet",
        price_cents=1299,
        weight_oz=12,
        category="meat",
        stock_qty=20,
        image_url="https://images.unsplash.com/photo-1574781330855-d0db8cc6a79c",
        description="Fresh Atlantic salmon fillet. Wild-caught.",
        nutrition_json=json.dumps({
            "servingSize": "4 oz (112g, cooked)",
            "servingsPerContainer": "~3",
            "calories": 206,
            "totalFat": {"value": 12, "unit": "g", "dailyValue": 15},
            "saturatedFat": {"value": 2.5, "unit": "g", "dailyValue": 13},
            "transFat": {"value": 0, "unit": "g"},
            "cholesterol": {"value": 63, "unit": "mg", "dailyValue": 21},
            "sodium": {"value": 52, "unit": "mg", "dailyValue": 2},
            "totalCarbohydrate": {"value": 0, "unit": "g", "dailyValue": 0},
            "dietaryFiber": {"value": 0, "unit": "g", "dailyValue": 0},
            "totalSugars": {"value": 0, "unit": "g"},
            "protein": {"value": 23, "unit": "g"},
            "vitaminD": {"value": 14.2, "unit": "mcg", "dailyValue": 71},
            "calcium": {"value": 9, "unit": "mg", "dailyValue": 1},
            "iron": {"value": 0.3, "unit": "mg", "dailyValue": 2},
            "potassium": {"value": 384, "unit": "mg", "dailyValue": 8},
            "omega3": {"value": 1800, "unit": "mg"},
            "vitaminB12": {"value": 3.2, "unit": "mcg", "dailyValue": 133}
        }),
    ),
    dict(
        name="Organic Pork Chops",
        price_cents=949,
        weight_oz=16,
        category="meat",
        stock_qty=28,
        image_url="https://images.unsplash.com/photo-1602470520998-f4a52199a3d6",
        description="Bone-in center-cut pork chops. 1 lb.",
        nutrition_json=json.dumps({
            "servingSize": "4 oz (112g, cooked)",
            "servingsPerContainer": "~4",
            "calories": 190,
            "totalFat": {"value": 8, "unit": "g", "dailyValue": 10},
            "saturatedFat": {"value": 2.8, "unit": "g", "dailyValue": 14},
            "transFat": {"value": 0, "unit": "g"},
            "cholesterol": {"value": 78, "unit": "mg", "dailyValue": 26},
            "sodium": {"value": 62, "unit": "mg", "dailyValue": 3},
            "totalCarbohydrate": {"value": 0, "unit": "g", "dailyValue": 0},
            "dietaryFiber": {"value": 0, "unit": "g", "dailyValue": 0},
            "totalSugars": {"value": 0, "unit": "g"},
            "protein": {"value": 28, "unit": "g"},
            "vitaminD": {"value": 0.6, "unit": "mcg", "dailyValue": 3},
            "calcium": {"value": 21, "unit": "mg", "dailyValue": 2},
            "iron": {"value": 0.9, "unit": "mg", "dailyValue": 5},
            "potassium": {"value": 423, "unit": "mg", "dailyValue": 9},
            "thiamin": {"value": 0.8, "unit": "mg", "dailyValue": 67},
            "vitaminB6": {"value": 0.6, "unit": "mg", "dailyValue": 35}
        }),
    ),
    dict(
        name="Organic Shrimp",
        price_cents=1499,
        weight_oz=16,
        category="meat",
        stock_qty=18,
        image_url="https://images.unsplash.com/photo-1565680018434-b513d5e5fd47",
        description="Large frozen shrimp. Peeled and deveined. 1 lb.",
        nutrition_json=json.dumps({
            "servingSize": "4 oz (112g, cooked)",
            "servingsPerContainer": "~4",
            "calories": 112,
            "totalFat": {"value": 1.2, "unit": "g", "dailyValue": 2},
            "saturatedFat": {"value": 0.2, "unit": "g", "dailyValue": 1},
            "transFat": {"value": 0, "unit": "g"},
            "cholesterol": {"value": 189, "unit": "mg", "dailyValue": 63},
            "sodium": {"value": 224, "unit": "mg", "dailyValue": 10},
            "totalCarbohydrate": {"value": 0, "unit": "g", "dailyValue": 0},
            "dietaryFiber": {"value": 0, "unit": "g", "dailyValue": 0},
            "totalSugars": {"value": 0, "unit": "g"},
            "protein": {"value": 24, "unit": "g"},
            "vitaminD": {"value": 0, "unit": "mcg", "dailyValue": 0},
            "calcium": {"value": 63, "unit": "mg", "dailyValue": 5},
            "iron": {"value": 3, "unit": "mg", "dailyValue": 17},
            "potassium": {"value": 191, "unit": "mg", "dailyValue": 4},
            "vitaminB12": {"value": 1.4, "unit": "mcg", "dailyValue": 58},
            "selenium": {"value": 48, "unit": "mcg", "dailyValue": 87}
        }),
    ),
    
    # Dairy (5 items)
    dict(
        name="Organic Milk",
        price_cents=549,
        weight_oz=64,
        category="dairy",
        stock_qty=40,
        image_url="https://images.unsplash.com/photo-1550583724-b2692b85b150",
        description="Organic whole milk. Half gallon.",
        nutrition_json=json.dumps({
            "servingSize": "1 cup (244g)",
            "servingsPerContainer": "~8",
            "calories": 150,
            "totalFat": {"value": 8, "unit": "g", "dailyValue": 10},
            "saturatedFat": {"value": 5, "unit": "g", "dailyValue": 25},
            "transFat": {"value": 0, "unit": "g"},
            "cholesterol": {"value": 35, "unit": "mg", "dailyValue": 12},
            "sodium": {"value": 120, "unit": "mg", "dailyValue": 5},
            "totalCarbohydrate": {"value": 12, "unit": "g", "dailyValue": 4},
            "dietaryFiber": {"value": 0, "unit": "g", "dailyValue": 0},
            "totalSugars": {"value": 12, "unit": "g"},
            "protein": {"value": 8, "unit": "g"},
            "vitaminD": {"value": 2.9, "unit": "mcg", "dailyValue": 15},
            "calcium": {"value": 300, "unit": "mg", "dailyValue": 23},
            "iron": {"value": 0, "unit": "mg", "dailyValue": 0},
            "potassium": {"value": 366, "unit": "mg", "dailyValue": 8},
            "vitaminA": {"value": 395, "unit": "IU", "dailyValue": 8},
            "vitaminB12": {"value": 1.3, "unit": "mcg", "dailyValue": 54}
        }),
    ),
    dict(
        name="Organic Greek Yogurt",
        price_cents=599,
        weight_oz=32,
        category="dairy",
        stock_qty=50,
        image_url="https://images.unsplash.com/photo-1571212515416-fef01fc43637",
        description="Plain Greek yogurt. 32 oz container.",
        nutrition_json=json.dumps({
            "servingSize": "1 container (170g)",
            "servingsPerContainer": "~5",
            "calories": 100,
            "totalFat": {"value": 0, "unit": "g", "dailyValue": 0},
            "saturatedFat": {"value": 0, "unit": "g", "dailyValue": 0},
            "transFat": {"value": 0, "unit": "g"},
            "cholesterol": {"value": 10, "unit": "mg", "dailyValue": 3},
            "sodium": {"value": 65, "unit": "mg", "dailyValue": 3},
            "totalCarbohydrate": {"value": 6, "unit": "g", "dailyValue": 2},
            "dietaryFiber": {"value": 0, "unit": "g", "dailyValue": 0},
            "totalSugars": {"value": 4, "unit": "g"},
            "protein": {"value": 17, "unit": "g"},
            "vitaminD": {"value": 0, "unit": "mcg", "dailyValue": 0},
            "calcium": {"value": 150, "unit": "mg", "dailyValue": 12},
            "iron": {"value": 0, "unit": "mg", "dailyValue": 0},
            "potassium": {"value": 240, "unit": "mg", "dailyValue": 5},
            "vitaminB12": {"value": 1.2, "unit": "mcg", "dailyValue": 50},
            "probiotics": {"value": "Live active cultures"}
        }),
    ),
    dict(
        name="Organic Cheddar Cheese",
        price_cents=699,
        weight_oz=16,
        category="dairy",
        stock_qty=35,
        image_url="https://images.unsplash.com/photo-1452195100486-9cc805987862",
        description="Sharp cheddar cheese block. 1 lb.",
        nutrition_json=json.dumps({
            "servingSize": "1 oz (28g)",
            "servingsPerContainer": "~16",
            "calories": 114,
            "totalFat": {"value": 9, "unit": "g", "dailyValue": 12},
            "saturatedFat": {"value": 6, "unit": "g", "dailyValue": 30},
            "transFat": {"value": 0, "unit": "g"},
            "cholesterol": {"value": 30, "unit": "mg", "dailyValue": 10},
            "sodium": {"value": 176, "unit": "mg", "dailyValue": 8},
            "totalCarbohydrate": {"value": 0.4, "unit": "g", "dailyValue": 0},
            "dietaryFiber": {"value": 0, "unit": "g", "dailyValue": 0},
            "totalSugars": {"value": 0.1, "unit": "g"},
            "protein": {"value": 7, "unit": "g"},
            "vitaminD": {"value": 0.1, "unit": "mcg", "dailyValue": 1},
            "calcium": {"value": 200, "unit": "mg", "dailyValue": 15},
            "iron": {"value": 0.2, "unit": "mg", "dailyValue": 1},
            "potassium": {"value": 28, "unit": "mg", "dailyValue": 1},
            "vitaminA": {"value": 284, "unit": "IU", "dailyValue": 6},
            "vitaminB12": {"value": 0.2, "unit": "mcg", "dailyValue": 8}
        }),
    ),
    dict(
        name="Organic Butter",
        price_cents=449,
        weight_oz=16,
        category="dairy",
        stock_qty=60,
        image_url="https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d",
        description="Unsalted butter. 1 lb (4 sticks).",
        nutrition_json=json.dumps({
            "servingSize": "1 tbsp (14g)",
            "servingsPerContainer": "~32",
            "calories": 100,
            "totalFat": {"value": 11, "unit": "g", "dailyValue": 14},
            "saturatedFat": {"value": 7, "unit": "g", "dailyValue": 35},
            "transFat": {"value": 0, "unit": "g"},
            "cholesterol": {"value": 30, "unit": "mg", "dailyValue": 10},
            "sodium": {"value": 0, "unit": "mg", "dailyValue": 0},
            "totalCarbohydrate": {"value": 0, "unit": "g", "dailyValue": 0},
            "dietaryFiber": {"value": 0, "unit": "g", "dailyValue": 0},
            "totalSugars": {"value": 0, "unit": "g"},
            "protein": {"value": 0, "unit": "g"},
            "vitaminD": {"value": 0, "unit": "mcg", "dailyValue": 0},
            "calcium": {"value": 3, "unit": "mg", "dailyValue": 0},
            "iron": {"value": 0, "unit": "mg", "dailyValue": 0},
            "potassium": {"value": 3, "unit": "mg", "dailyValue": 0},
            "vitaminA": {"value": 355, "unit": "IU", "dailyValue": 7},
            "vitaminE": {"value": 0.3, "unit": "mg", "dailyValue": 2}
        }),
    ),
    dict(
        name="Organic Mozzarella Cheese",
        price_cents=549,
        weight_oz=16,
        category="dairy",
        stock_qty=42,
        image_url="https://images.unsplash.com/photo-1574071318508-1cdbab80d002",
        description="Fresh mozzarella cheese. 1 lb.",
        nutrition_json=json.dumps({
            "servingSize": "1 oz (28g)",
            "servingsPerContainer": "~16",
            "calories": 70,
            "totalFat": {"value": 4.5, "unit": "g", "dailyValue": 6},
            "saturatedFat": {"value": 3, "unit": "g", "dailyValue": 15},
            "transFat": {"value": 0, "unit": "g"},
            "cholesterol": {"value": 15, "unit": "mg", "dailyValue": 5},
            "sodium": {"value": 150, "unit": "mg", "dailyValue": 7},
            "totalCarbohydrate": {"value": 1, "unit": "g", "dailyValue": 0},
            "dietaryFiber": {"value": 0, "unit": "g", "dailyValue": 0},
            "totalSugars": {"value": 0, "unit": "g"},
            "protein": {"value": 6, "unit": "g"},
            "vitaminD": {"value": 0, "unit": "mcg", "dailyValue": 0},
            "calcium": {"value": 200, "unit": "mg", "dailyValue": 15},
            "iron": {"value": 0, "unit": "mg", "dailyValue": 0},
            "potassium": {"value": 19, "unit": "mg", "dailyValue": 0},
            "vitaminA": {"value": 180, "unit": "IU", "dailyValue": 4},
            "phosphorus": {"value": 131, "unit": "mg", "dailyValue": 10}
        }),
    ),
    
    # Grains (5 items)
    dict(
        name="Organic Whole Wheat Bread",
        price_cents=449,
        weight_oz=24,
        category="grains",
        stock_qty=45,
        image_url="https://images.unsplash.com/photo-1509440159596-0249088772ff",
        description="100% whole wheat bread. No artificial preservatives. 1.5 lb loaf.",
        nutrition_json=json.dumps({
            "servingSize": "1 slice (43g)",
            "servingsPerContainer": "~16",
            "calories": 110,
            "totalFat": {"value": 2, "unit": "g", "dailyValue": 3},
            "saturatedFat": {"value": 0, "unit": "g", "dailyValue": 0},
            "transFat": {"value": 0, "unit": "g"},
            "cholesterol": {"value": 0, "unit": "mg", "dailyValue": 0},
            "sodium": {"value": 170, "unit": "mg", "dailyValue": 7},
            "totalCarbohydrate": {"value": 20, "unit": "g", "dailyValue": 7},
            "dietaryFiber": {"value": 3, "unit": "g", "dailyValue": 11},
            "totalSugars": {"value": 3, "unit": "g"},
            "protein": {"value": 5, "unit": "g"},
            "vitaminD": {"value": 0, "unit": "mcg", "dailyValue": 0},
            "calcium": {"value": 60, "unit": "mg", "dailyValue": 5},
            "iron": {"value": 1.4, "unit": "mg", "dailyValue": 8},
            "potassium": {"value": 95, "unit": "mg", "dailyValue": 2},
            "thiamin": {"value": 0.2, "unit": "mg", "dailyValue": 17},
            "folate": {"value": 30, "unit": "mcg", "dailyValue": 8}
        }),
    ),
    dict(
        name="Organic Brown Rice",
        price_cents=599,
        weight_oz=32,
        category="grains",
        stock_qty=60,
        image_url="https://images.unsplash.com/photo-1586201375761-83865001e31c",
        description="Long grain brown rice. Naturally nutritious whole grain. 2 lb bag.",
        nutrition_json=json.dumps({
            "servingSize": "1/4 cup dry (45g)",
            "servingsPerContainer": "~20",
            "calories": 160,
            "totalFat": {"value": 1.5, "unit": "g", "dailyValue": 2},
            "saturatedFat": {"value": 0, "unit": "g", "dailyValue": 0},
            "transFat": {"value": 0, "unit": "g"},
            "cholesterol": {"value": 0, "unit": "mg", "dailyValue": 0},
            "sodium": {"value": 0, "unit": "mg", "dailyValue": 0},
            "totalCarbohydrate": {"value": 34, "unit": "g", "dailyValue": 12},
            "dietaryFiber": {"value": 2, "unit": "g", "dailyValue": 7},
            "totalSugars": {"value": 0, "unit": "g"},
            "protein": {"value": 3, "unit": "g"},
            "vitaminD": {"value": 0, "unit": "mcg", "dailyValue": 0},
            "calcium": {"value": 10, "unit": "mg", "dailyValue": 1},
            "iron": {"value": 0.5, "unit": "mg", "dailyValue": 3},
            "potassium": {"value": 75, "unit": "mg", "dailyValue": 2},
            "magnesium": {"value": 42, "unit": "mg", "dailyValue": 10},
            "manganese": {"value": 0.9, "unit": "mg", "dailyValue": 39}
        }),
    ),
    dict(
        name="Organic Whole Grain Oats",
        price_cents=549,
        weight_oz=42,
        category="grains",
        stock_qty=50,
        image_url="/images/items/oats.png",
        description="Rolled oats. 100% whole grain. Perfect for oatmeal. 2.625 lb container.",
        nutrition_json=json.dumps({
            "servingSize": "1/2 cup dry (40g)",
            "servingsPerContainer": "~30",
            "calories": 150,
            "totalFat": {"value": 3, "unit": "g", "dailyValue": 4},
            "saturatedFat": {"value": 0.5, "unit": "g", "dailyValue": 3},
            "transFat": {"value": 0, "unit": "g"},
            "cholesterol": {"value": 0, "unit": "mg", "dailyValue": 0},
            "sodium": {"value": 0, "unit": "mg", "dailyValue": 0},
            "totalCarbohydrate": {"value": 27, "unit": "g", "dailyValue": 10},
            "dietaryFiber": {"value": 4, "unit": "g", "dailyValue": 14},
            "totalSugars": {"value": 1, "unit": "g"},
            "protein": {"value": 5, "unit": "g"},
            "vitaminD": {"value": 0, "unit": "mcg", "dailyValue": 0},
            "calcium": {"value": 20, "unit": "mg", "dailyValue": 2},
            "iron": {"value": 1.7, "unit": "mg", "dailyValue": 9},
            "potassium": {"value": 140, "unit": "mg", "dailyValue": 3},
            "magnesium": {"value": 56, "unit": "mg", "dailyValue": 13},
            "phosphorus": {"value": 164, "unit": "mg", "dailyValue": 13}
        }),
    ),
    dict(
        name="Organic Corn",
        price_cents=349,
        weight_oz=16,
        category="grains",
        stock_qty=55,
        image_url="/images/items/corn.png",
        description="Fresh sweet corn on the cob. Non-GMO. 4-pack.",
        nutrition_json=json.dumps({
            "servingSize": "1 medium ear (103g)",
            "servingsPerContainer": "~4",
            "calories": 90,
            "totalFat": {"value": 1.5, "unit": "g", "dailyValue": 2},
            "saturatedFat": {"value": 0, "unit": "g", "dailyValue": 0},
            "transFat": {"value": 0, "unit": "g"},
            "cholesterol": {"value": 0, "unit": "mg", "dailyValue": 0},
            "sodium": {"value": 15, "unit": "mg", "dailyValue": 1},
            "totalCarbohydrate": {"value": 19, "unit": "g", "dailyValue": 7},
            "dietaryFiber": {"value": 2, "unit": "g", "dailyValue": 7},
            "totalSugars": {"value": 6, "unit": "g"},
            "protein": {"value": 3, "unit": "g"},
            "vitaminD": {"value": 0, "unit": "mcg", "dailyValue": 0},
            "calcium": {"value": 2, "unit": "mg", "dailyValue": 0},
            "iron": {"value": 0.5, "unit": "mg", "dailyValue": 3},
            "potassium": {"value": 270, "unit": "mg", "dailyValue": 6},
            "vitaminC": {"value": 6.8, "unit": "mg", "dailyValue": 8},
            "thiamin": {"value": 0.2, "unit": "mg", "dailyValue": 17},
            "folate": {"value": 42, "unit": "mcg", "dailyValue": 11}
        }),
    ),
    dict(
        name="Organic Whole Grain Quinoa",
        price_cents=799,
        weight_oz=16,
        category="grains",
        stock_qty=40,
        image_url="/images/items/quinoa.png",
        description="Premium mixed quinoa. Complete protein. Gluten-free. 1 lb bag.",
        nutrition_json=json.dumps({
            "servingSize": "1/4 cup dry (45g)",
            "servingsPerContainer": "~10",
            "calories": 160,
            "totalFat": {"value": 2.5, "unit": "g", "dailyValue": 3},
            "saturatedFat": {"value": 0, "unit": "g", "dailyValue": 0},
            "transFat": {"value": 0, "unit": "g"},
            "cholesterol": {"value": 0, "unit": "mg", "dailyValue": 0},
            "sodium": {"value": 5, "unit": "mg", "dailyValue": 0},
            "totalCarbohydrate": {"value": 29, "unit": "g", "dailyValue": 11},
            "dietaryFiber": {"value": 3, "unit": "g", "dailyValue": 11},
            "totalSugars": {"value": 1, "unit": "g"},
            "protein": {"value": 6, "unit": "g"},
            "vitaminD": {"value": 0, "unit": "mcg", "dailyValue": 0},
            "calcium": {"value": 20, "unit": "mg", "dailyValue": 2},
            "iron": {"value": 2.2, "unit": "mg", "dailyValue": 12},
            "potassium": {"value": 230, "unit": "mg", "dailyValue": 5},
            "magnesium": {"value": 85, "unit": "mg", "dailyValue": 20},
            "folate": {"value": 42, "unit": "mcg", "dailyValue": 11}
        }),
    ),
]

SAMPLE_REVIEWS = [
    # (item_index, user_id, rating, title, body)
    (0, 101, 5, "Great apples", "Sweet and crunchy."),
    (0, 102, 4, "Good", "Tasty but a couple were small."),
    (1, 201, 5, "Tomatoes on point", "Perfect for salads."),
]

SAMPLE_ORDERS = [
    dict(
        user_id=1,
        created_at=datetime.strptime("2025-01-01 10:00:00", "%Y-%m-%d %H:%M:%S"),
        delivered_at=datetime.strptime("2025-01-01 10:30:00", "%Y-%m-%d %H:%M:%S")
    ),
    dict(
        user_id=1,
        created_at=datetime.strptime("2025-02-14 12:00:00", "%Y-%m-%d %H:%M:%S"),
        delivered_at=datetime.strptime("2025-02-14 12:45:00", "%Y-%m-%d %H:%M:%S"),
    ),
    dict(
        user_id=1,
        created_at=datetime.strptime("2025-03-03 18:30:00", "%Y-%m-%d %H:%M:%S"),
        delivered_at=datetime.strptime("2025-03-03 19:10:00", "%Y-%m-%d %H:%M:%S"),
    ),
    dict(
        user_id=1,
        created_at=datetime.strptime("2025-04-10 09:15:00", "%Y-%m-%d %H:%M:%S"),
        delivered_at=None,
    ),
]

SAMPLE_ORDER_ITEMS = [
    dict(order_id=1, item_id=1, quantity=5),
    dict(order_id=1, item_id=2, quantity=10),
    dict(order_id=1, item_id=3, quantity=15),

    dict(order_id=2, item_id=4, quantity=2),
    dict(order_id=2, item_id=5, quantity=1),

    dict(order_id=3, item_id=6, quantity=3),
    dict(order_id=3, item_id=10, quantity=2),
    dict(order_id=3, item_id=12, quantity=1),

    dict(order_id=4, item_id=2, quantity=6),
    dict(order_id=4, item_id=7, quantity=2),
]

def seed():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        # Create admin user if not exists
        admin_email = "admin@sjsu.edu"
        admin_password = "admin123"
        
        admin_user = db.query(User).filter(User.email == admin_email).first()
        if not admin_user:
            admin_user = User(
                email=admin_email,
                hashed_password=get_password_hash(admin_password),
                full_name="System Administrator",
                role="admin",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            print(f"✓ Admin user created: {admin_email} / {admin_password}")
        else:
            print(f"✓ Admin user already exists: {admin_email}")
        
        # Seed items
        if db.query(Item).count() == 0:
            for d in SAMPLE_ITEMS:
                db.add(Item(**d))
            db.commit()
            print(f"✓ Seeded {len(SAMPLE_ITEMS)} items")

        if db.query(Order).count() == 0:
            for d in SAMPLE_ORDERS:
                db.add(Order(**d))
            db.commit()

        if db.query(OrderItem).count() == 0:
            for d in SAMPLE_ORDER_ITEMS:
                db.add(OrderItem(**d))
            db.commit()

        # add a few reviews if none
        # if db.query(Review).count() == 0:
        #     items = db.query(Item).order_by(Item.id).all()
        #     for idx, user_id, rating, title, body in SAMPLE_REVIEWS:
        #         db.add(
        #             Review(
        #                 item_id=items[idx].id,
        #                 user_id=user_id,
        #                 rating=rating,
        #                 title=title,
        #                 body=body,
        #             )
        #         )
        #     db.commit()

        #     # recompute summaries
        #     for it in items:
        #         avg, cnt = db.execute(
        #             select(func.avg(Review.rating), func.count(Review.id)).where(
        #                 Review.item_id == it.id
        #             )
        #         ).one()
        #         db.execute(
        #             update(Item)
        #             .where(Item.id == it.id)
        #             .values(avg_rating=float(avg or 0.0), ratings_count=int(cnt or 0))
        #         )
        #     db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
