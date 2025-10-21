# Items API Documentation

This document describes all the items-related endpoints for browsing products, viewing details, and managing reviews.

---

## Overview

The Items API provides endpoints for:
- **Browsing Items**: List items with filtering, search, and pagination
- **Item Details**: View complete information about a specific item
- **Reviews**: Read and write product reviews
- **Filtering**: Filter by category, stock status, and search queries
- **Pagination**: Support for infinite scroll and pagination

---

## API Endpoints

### 1. List Items (Browse/Scroll)

Browse all items with optional filtering and pagination.

**Endpoint:** `GET /api/items`
`
**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | - | Search query (searches in item name) |
| `category` | string | - | Filter by category (e.g., "fruits", "vegetables") |
| `in_stock` | boolean | - | Filter by stock availability (true/false) |
| `limit` | integer | 20 | Number of items to return (1-100) |
| `offset` | integer | 0 | Number of items to skip (for pagination) |

**Example Requests:**
```bash
# Get first 20 items
GET /api/items

# Get 10 items with pagination (page 2)
GET /api/items?limit=10&offset=10

# Search for "apple"
GET /api/items?q=apple

# Filter by category
GET /api/items?category=fruits&limit=20

# Get items in stock
GET /api/items?in_stock=true

# Combined filters
GET /api/items?category=fruits&in_stock=true&limit=10
```

**Success Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Organic Apples",
    "price_cents": 399,
    "weight_oz": 16,
    "category": "fruits",
    "image_url": "https://example.com/apples.jpg",
    "avg_rating": 4.67,
    "ratings_count": 3
  },
  {
    "id": 2,
    "name": "Fresh Bananas",
    "price_cents": 299,
    "weight_oz": 12,
    "category": "fruits",
    "image_url": "https://example.com/bananas.jpg",
    "avg_rating": 4.5,
    "ratings_count": 8
  }
]
```

**Response Fields (List View):**
- `id` - Unique item identifier
- `name` - Item name
- `price_cents` - Price in cents (divide by 100 for dollars)
- `weight_oz` - Weight in ounces
- `category` - Product category (optional)
- `image_url` - Product image URL (optional)
- `avg_rating` - Average rating (0-5)
- `ratings_count` - Number of ratings

---

### 2. Get Item Details

Get complete information about a specific item when user clicks on it.

**Endpoint:** `GET /api/items/{item_id}`

**Path Parameters:**
- `item_id` (integer, required) - The ID of the item

**Example Request:**
```bash
GET /api/items/1
```

**Success Response (200 OK):**
```json
{
  "id": 1,
  "name": "Organic Apples",
  "price_cents": 399,
  "weight_oz": 16,
  "category": "fruits",
  "image_url": "https://example.com/apples.jpg",
  "avg_rating": 4.67,
  "ratings_count": 3,
  "description": "Crisp organic apples. 1 lb bag.",
  "nutrition_json": "{\"calories\": 95, \"protein\": \"0.5g\"}",
  "stock_qty": 50,
  "is_active": true
}
```

**Response Fields (Detail View):**
All fields from list view, plus:
- `description` - Detailed product description
- `nutrition_json` - Nutrition information as JSON string
- `stock_qty` - Available stock quantity
- `is_active` - Whether item is active/available

**Error Responses:**
- `404 Not Found` - Item doesn't exist or is inactive

---

### 3. Get Item Reviews

Get paginated reviews for a specific item.

**Endpoint:** `GET /api/items/{item_id}/reviews`

**Path Parameters:**
- `item_id` (integer, required) - The ID of the item

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 10 | Number of reviews to return (1-100) |
| `offset` | integer | 0 | Number of reviews to skip (for pagination) |

**Example Requests:**
```bash
# Get first 10 reviews
GET /api/items/1/reviews

# Get reviews with pagination (page 2)
GET /api/items/1/reviews?limit=10&offset=10

# Get first 5 reviews
GET /api/items/1/reviews?limit=5
```

**Success Response (200 OK):**
```json
[
  {
    "id": 1,
    "item_id": 1,
    "user_id": 123,
    "rating": 5,
    "title": "Excellent quality!",
    "body": "These apples are crisp and delicious. Highly recommend!",
    "created_at": "2025-10-01T12:00:00Z"
  },
  {
    "id": 2,
    "item_id": 1,
    "user_id": 456,
    "rating": 4,
    "title": "Good but pricey",
    "body": "Good quality apples but a bit expensive.",
    "created_at": "2025-09-30T15:30:00Z"
  }
]
```

**Response Fields:**
- `id` - Review ID
- `item_id` - Item being reviewed
- `user_id` - User who wrote the review
- `rating` - Rating (1-5)
- `title` - Review title (optional)
- `body` - Review text
- `created_at` - When review was created

**Error Responses:**
- `404 Not Found` - Item doesn't exist

---

### 4. Create/Update Review

Create a new review or update an existing review for an item.

**Authentication Required:** Yes (JWT token or X-User-Id header)

**Endpoint:** `POST /api/items/{item_id}/reviews`

**Path Parameters:**
- `item_id` (integer, required) - The ID of the item

**Headers:**
```
Authorization: Bearer <jwt-token>
```
OR (legacy):
```
X-User-Id: <user-id>
```

**Request Body:**
```json
{
  "rating": 5,
  "title": "Excellent!",
  "body": "These apples are amazing. Fresh and crispy!"
}
```

**Request Fields:**
- `rating` (integer, required) - Rating from 1 to 5
- `title` (string, optional) - Review title
- `body` (string, required) - Review text (minimum 5 characters)

**Success Response (201 Created):**
```json
{
  "ok": true
}
```

**Behavior:**
- If user has already reviewed this item, the review is **updated**
- If user hasn't reviewed this item, a new review is **created**
- Item's `avg_rating` and `ratings_count` are automatically recalculated

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Item doesn't exist or is inactive
- `422 Unprocessable Entity` - Invalid input (rating out of range, body too short)

**Example Requests:**
```bash
# With JWT token
curl -X POST http://localhost:8000/api/items/1/reviews \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{"rating": 5, "title": "Great!", "body": "Highly recommend"}'

# With legacy X-User-Id header
curl -X POST http://localhost:8000/api/items/1/reviews \
  -H "X-User-Id: 123" \
  -H "Content-Type: application/json" \
  -d '{"rating": 4, "body": "Pretty good quality"}'
```

---

## Use Cases & Frontend Integration

### 1. Product Listing Page (Scrolling/Browsing)

**Goal:** Display a list of products that users can scroll through

```typescript
// Fetch items for initial load
const response = await fetch('http://localhost:8000/api/items?limit=20');
const items = await response.json();

// Display items in a grid/list
items.forEach(item => {
  displayItem({
    id: item.id,
    name: item.name,
    price: item.price_cents / 100, // Convert to dollars
    image: item.image_url,
    rating: item.avg_rating,
    reviewCount: item.ratings_count
  });
});
```

### 2. Infinite Scroll

**Goal:** Load more items as user scrolls down

```typescript
let offset = 0;
const limit = 20;

async function loadMoreItems() {
  const response = await fetch(
    `http://localhost:8000/api/items?limit=${limit}&offset=${offset}`
  );
  const items = await response.json();
  
  if (items.length > 0) {
    appendItemsToList(items);
    offset += limit;
  }
}

// Call loadMoreItems() when user scrolls near bottom
```

### 3. Search Functionality

**Goal:** Search for items by name

```typescript
async function searchItems(query: string) {
  const response = await fetch(
    `http://localhost:8000/api/items?q=${encodeURIComponent(query)}&limit=20`
  );
  const items = await response.json();
  displaySearchResults(items);
}
```

### 4. Category Filter

**Goal:** Filter items by category

```typescript
async function filterByCategory(category: string) {
  const response = await fetch(
    `http://localhost:8000/api/items?category=${category}&limit=20`
  );
  const items = await response.json();
  displayItems(items);
}
```

### 5. Item Detail Page (Click Item)

**Goal:** Show complete information when user clicks an item

```typescript
async function showItemDetail(itemId: number) {
  // Fetch item details
  const itemResponse = await fetch(`http://localhost:8000/api/items/${itemId}`);
  const item = await itemResponse.json();
  
  // Fetch reviews
  const reviewsResponse = await fetch(
    `http://localhost:8000/api/items/${itemId}/reviews?limit=10`
  );
  const reviews = await reviewsResponse.json();
  
  // Display item details and reviews
  displayItemDetails(item);
  displayReviews(reviews);
}
```

### 6. Submit Review

**Goal:** Let users submit a review for an item

```typescript
async function submitReview(itemId: number, rating: number, body: string, title?: string) {
  const token = localStorage.getItem('access_token');
  
  const response = await fetch(
    `http://localhost:8000/api/items/${itemId}/reviews`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rating, title, body }),
    }
  );
  
  if (response.ok) {
    // Refresh item details to show updated rating
    refreshItemDetails(itemId);
  }
}
```

---

## React/Next.js Component Examples

### Product Card Component

```typescript
// src/components/ProductCard.tsx
interface ProductCardProps {
  id: number;
  name: string;
  price_cents: number;
  image_url?: string;
  avg_rating: number;
  ratings_count: number;
  onClick: (id: number) => void;
}

export default function ProductCard({ 
  id, name, price_cents, image_url, avg_rating, ratings_count, onClick 
}: ProductCardProps) {
  return (
    <div 
      onClick={() => onClick(id)}
      className="border rounded-lg p-4 cursor-pointer hover:shadow-lg transition"
    >
      {image_url && (
        <img src={image_url} alt={name} className="w-full h-48 object-cover rounded" />
      )}
      <h3 className="font-semibold mt-2">{name}</h3>
      <p className="text-lg font-bold">${(price_cents / 100).toFixed(2)}</p>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-yellow-500">★ {avg_rating.toFixed(1)}</span>
        <span className="text-gray-500 text-sm">({ratings_count} reviews)</span>
      </div>
    </div>
  );
}
```

### Product List Component with Infinite Scroll

```typescript
// src/components/ProductList.tsx
'use client';

import { useState, useEffect } from 'react';
import ProductCard from './ProductCard';

interface Item {
  id: number;
  name: string;
  price_cents: number;
  image_url?: string;
  avg_rating: number;
  ratings_count: number;
}

export default function ProductList() {
  const [items, setItems] = useState<Item[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;

  const loadItems = async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/items?limit=${limit}&offset=${offset}`
      );
      const newItems = await response.json();
      
      if (newItems.length < limit) {
        setHasMore(false);
      }
      
      setItems(prev => [...prev, ...newItems]);
      setOffset(prev => prev + limit);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleScroll = () => {
    if (
      window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 &&
      !loading &&
      hasMore
    ) {
      loadItems();
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, hasMore]);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map(item => (
          <ProductCard
            key={item.id}
            {...item}
            onClick={(id) => window.location.href = `/items/${id}`}
          />
        ))}
      </div>
      {loading && <div className="text-center py-4">Loading...</div>}
      {!hasMore && <div className="text-center py-4">No more items</div>}
    </div>
  );
}
```

### Item Detail Page

```typescript
// src/app/items/[id]/page.tsx
import { notFound } from 'next/navigation';

async function getItem(id: string) {
  const res = await fetch(`http://localhost:8000/api/items/${id}`, {
    cache: 'no-store'
  });
  if (!res.ok) return null;
  return res.json();
}

async function getReviews(id: string) {
  const res = await fetch(`http://localhost:8000/api/items/${id}/reviews`, {
    cache: 'no-store'
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function ItemDetailPage({ params }: { params: { id: string } }) {
  const item = await getItem(params.id);
  if (!item) notFound();
  
  const reviews = await getReviews(params.id);

  return (
    <div className="container mx-auto p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          {item.image_url && (
            <img 
              src={item.image_url} 
              alt={item.name} 
              className="w-full rounded-lg"
            />
          )}
        </div>
        
        <div>
          <h1 className="text-3xl font-bold">{item.name}</h1>
          <p className="text-2xl font-bold mt-4">
            ${(item.price_cents / 100).toFixed(2)}
          </p>
          <p className="text-gray-600 mt-2">{item.weight_oz} oz</p>
          
          <div className="flex items-center gap-2 mt-4">
            <span className="text-yellow-500 text-xl">
              ★ {item.avg_rating.toFixed(1)}
            </span>
            <span className="text-gray-500">({item.ratings_count} reviews)</span>
          </div>
          
          <p className="mt-6">{item.description}</p>
          
          <div className="mt-4">
            <span className={`px-3 py-1 rounded ${
              item.stock_qty > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {item.stock_qty > 0 ? `${item.stock_qty} in stock` : 'Out of stock'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Reviews</h2>
        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review: any) => (
              <div key={review.id} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-yellow-500">{'★'.repeat(review.rating)}</span>
                  <span className="font-semibold">{review.title}</span>
                </div>
                <p className="text-gray-700">{review.body}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {new Date(review.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No reviews yet. Be the first to review!</p>
        )}
      </div>
    </div>
  );
}
```

---

## Query Parameter Combinations

You can combine multiple query parameters for advanced filtering:

```bash
# Search for apples in fruits category that are in stock
GET /api/items?q=apple&category=fruits&in_stock=true&limit=10

# Get page 2 of vegetables (items 20-40)
GET /api/items?category=vegetables&limit=20&offset=20

# Search with pagination
GET /api/items?q=organic&limit=15&offset=15
```

---

## Response Format Notes

### Price Format
- Prices are in **cents** (integer)
- To display: `price_cents / 100` 
- Example: `399` → `$3.99`

### Rating Format
- `avg_rating` is a float (0.0 to 5.0)
- Display with 1-2 decimal places
- Example: `4.666666666666667` → `4.67`

### Image URLs
- May be `null` if no image is available
- Always check for null before displaying

### Dates
- All dates are in ISO 8601 format
- Example: `"2025-10-01T12:00:00Z"`
- Use JavaScript: `new Date(created_at).toLocaleDateString()`

---

## Error Handling

### Common Errors

**404 Not Found:**
```json
{
  "detail": "not_found"
}
```
- Item doesn't exist or is inactive

**401 Unauthorized (for reviews):**
```json
{
  "detail": "invalid_token"
}
```
- User not authenticated

**422 Validation Error:**
```json
{
  "detail": [
    {
      "loc": ["body", "rating"],
      "msg": "ensure this value is greater than or equal to 1",
      "type": "value_error.number.not_ge"
    }
  ]
}
```
- Invalid input data

---

## Testing

### Manual Testing with curl

```bash
# List items
curl http://localhost:8000/api/items?limit=5

# Get item detail
curl http://localhost:8000/api/items/1

# Get reviews
curl http://localhost:8000/api/items/1/reviews

# Create review (with auth)
curl -X POST http://localhost:8000/api/items/1/reviews \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rating": 5, "body": "Excellent product!"}'
```

### Automated Tests

Run the test suite:
```bash
PYTHONPATH=. pytest tests/test_items.py -v
```

---

## Performance Tips

1. **Use Pagination**: Always use `limit` and `offset` for large datasets
2. **Lazy Loading**: Load images lazily as user scrolls
3. **Caching**: Consider caching item lists client-side
4. **Debouncing**: Debounce search queries to reduce API calls
5. **Prefetching**: Prefetch next page of items before user reaches bottom

---

## Summary

✅ **List Items** - `GET /api/items` - Browse/scroll products  
✅ **Item Details** - `GET /api/items/{id}` - Click to see details  
✅ **Item Reviews** - `GET /api/items/{id}/reviews` - View reviews  
✅ **Create Review** - `POST /api/items/{id}/reviews` - Submit review (auth required)  
✅ **Filtering** - Category, search, stock status  
✅ **Pagination** - Supports infinite scroll  

All APIs are **fully functional and tested!** 🎉

