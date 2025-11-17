# Favorites Feature - Complete Implementation

## Overview
This document describes the complete implementation of the favorites feature with backend persistence and proper database design.

## Changes Made

### 1. Backend - Database Model (`backend/app/models.py`)

#### Created `Favorite` Model with Composite Primary Key
```python
class Favorite(Base):
    """Join table for user favorites (many-to-many relationship)"""
    __tablename__ = "favorites"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True, index=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("items.id"), primary_key=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
```

**Design Decision**: Using a composite primary key (user_id, item_id) follows database best practices:
- Eliminates the need for a separate `id` field
- Naturally enforces uniqueness (no need for separate unique constraint)
- More efficient for queries (the primary key is exactly what we query on)
- Standard approach for many-to-many join tables

#### Added Relationships to `User` Model
```python
# Relationship to favorited items (many-to-many through Favorite table)
favorited_items: Mapped[list["Item"]] = relationship(
    "Item",
    secondary="favorites",
    back_populates="favorited_by_users"
)
```

This allows accessing a user's favorites directly: `user.favorited_items`

#### Added Relationships to `Item` Model
```python
# Relationship to users who favorited this item
favorited_by_users: Mapped[list["User"]] = relationship(
    "User",
    secondary="favorites",
    back_populates="favorited_items"
)
```

This allows accessing users who favorited an item: `item.favorited_by_users`

### 2. Backend - Schema (`backend/app/schemas.py`)

#### Created `ItemOut` Schema
```python
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
```

This schema is used by the favorites endpoints to serialize item data.

### 3. Backend - Router Registration (`backend/app/main.py`)

#### Registered Favorites Router
```python
from .routers import favorites as favorites_router
...
app.include_router(favorites_router.router)
```

### 4. Backend - API Endpoints (`backend/app/routers/favorites.py`)

The router was already correctly implemented with three endpoints:

#### GET `/api/favorites/`
- Returns all favorited items for the authenticated user
- Response: `list[ItemOut]`
- Requires authentication

#### POST `/api/favorites/{item_id}`
- Adds an item to the user's favorites
- Returns: `{"message": "Added to favorites"}` or `{"message": "Already favorited"}`
- Validates that the item exists
- Prevents duplicate favorites
- Requires authentication

#### DELETE `/api/favorites/{item_id}`
- Removes an item from the user's favorites
- Returns: `{"message": "Removed from favorites"}`
- Returns 404 if the favorite doesn't exist
- Requires authentication

### 5. Frontend - API Client (`frontend/src/lib/api/favorites.ts`)

#### Created New API Module
This module provides TypeScript functions to interact with the favorites endpoints:

```typescript
// Get all favorites
export async function getFavorites(token: string): Promise<FavoriteItem[]>

// Add to favorites
export async function addFavorite(token: string, itemId: number): Promise<{ message: string }>

// Remove from favorites
export async function removeFavorite(token: string, itemId: number): Promise<{ message: string }>

// Check if an item is favorited
export async function isFavorited(token: string, itemId: number): Promise<boolean>
```

All functions:
- Require authentication token
- Use proper error handling
- Return typed responses
- Follow the existing API client patterns

### 6. Frontend - Item Card Component (`frontend/src/components/item/item.tsx`)

#### Replaced localStorage with Backend API
**Before**: Stored favorites in localStorage
**After**: Uses backend API for all favorite operations

Key changes:
- Added `useAuth` hook to get authentication token
- Added `isLoading` state to prevent duplicate requests
- `useEffect` now calls `isFavorited()` to check backend status
- `toggleFavorite()` now calls `addFavorite()` or `removeFavorite()` API
- Button is disabled when loading or user is not authenticated
- Removed all localStorage code

### 7. Frontend - Favorites Page (`frontend/src/app/home/favorites/page.tsx`)

#### Replaced localStorage with Backend API
**Before**: Read favorites from localStorage
**After**: Fetches favorites from backend

Key changes:
- Added `useAuth` hook to get authentication token
- Added loading and error states
- `useEffect` now calls `getFavorites()` to fetch from backend
- Shows appropriate messages for different states:
  - Not logged in
  - Loading
  - Error
  - No favorites
  - Favorites list
- Removed all localStorage code

## Database Schema

### `favorites` Table
```sql
CREATE TABLE favorites (
    user_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, item_id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (item_id) REFERENCES items (id)
);
```

The composite primary key ensures that:
1. Each user-item pair is unique
2. Efficient querying by user_id or item_id
3. No redundant `id` field needed

## API Usage Examples

### Get User's Favorites
```typescript
const token = "user-auth-token";
const favorites = await getFavorites(token);
console.log(favorites); // [{ id: 1, name: "Apple", ... }, ...]
```

### Add to Favorites
```typescript
const token = "user-auth-token";
const itemId = 5;
const result = await addFavorite(token, itemId);
console.log(result); // { message: "Added to favorites" }
```

### Remove from Favorites
```typescript
const token = "user-auth-token";
const itemId = 5;
const result = await removeFavorite(token, itemId);
console.log(result); // { message: "Removed from favorites" }
```

### Check if Item is Favorited
```typescript
const token = "user-auth-token";
const itemId = 5;
const isFav = await isFavorited(token, itemId);
console.log(isFav); // true or false
```

## Security

- All endpoints require authentication via JWT token
- Users can only access/modify their own favorites
- Input validation ensures item IDs are valid
- Proper error handling prevents information leakage

## Benefits of Current Implementation

1. **Best Practice Database Design**: Composite primary key is the standard for join tables
2. **Data Persistence**: Favorites are stored in the database, not browser localStorage
3. **Cross-Device Sync**: Users see the same favorites on all devices
4. **Proper Authentication**: Only authenticated users can manage favorites
5. **Type Safety**: Full TypeScript support in frontend
6. **Error Handling**: Graceful error handling throughout the stack
7. **Loading States**: Users see loading indicators during API calls
8. **No Duplicate Code**: DRY principle applied with shared API functions

## Testing

To test the implementation:

1. Start the backend server
2. Log in as a user
3. Click the star icon on an item card to favorite it
4. Navigate to the Favorites page to see all favorites
5. Click the star again to unfavorite
6. Verify favorites persist across page refreshes
7. Log in from a different browser/device to verify cross-device sync

## Future Enhancements

Possible improvements:
1. Add real-time updates using WebSockets
2. Add analytics to track most favorited items
3. Add "Recently Favorited" section
4. Allow users to create favorite lists/collections
5. Add sharing functionality for favorite lists
6. Add bulk operations (clear all favorites, export/import)

