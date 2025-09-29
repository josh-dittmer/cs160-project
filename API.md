## API Documentation

Base URL (local): `http://localhost:8000`

### Auth

- Header: `X-User-Id: <int>` (required for posting reviews; not required for reads)

### Health

- GET `/healthz`
  - Returns API health.
  - Response 200:
    ```json
    { "ok": true }
    ```

### Items

- GET `/api/items`
  - List items (paged client-side). Results are ordered by name.
  - Query params:
    - `q: string` (optional) — search by name (case-insensitive)
    - `category: string` (optional)
    - `in_stock: boolean` (optional) — `true` only items with stock; `false` out-of-stock
    - `limit: int` (1..100, default 20)
    - `offset: int` (>=0, default 0)
  - Response 200: `ItemListOut[]`
    - `ItemListOut` fields:
      - `id: int`
      - `name: string`
      - `price_cents: int` (format in UI)
      - `weight_oz: int`
      - `category: string | null`
      - `image_url: string | null`
      - `avg_rating: number`
      - `ratings_count: int`
  - Example:
    ```bash
    curl -sS "http://localhost:8000/api/items?limit=20&offset=0"
    ```
    ```json
    [
      {
        "id": 1,
        "name": "Organic Apples",
        "price_cents": 399,
        "weight_oz": 16,
        "category": "fruits",
        "image_url": null,
        "avg_rating": 4.5,
        "ratings_count": 2
      }
    ]
    ```

- GET `/api/items/{item_id}`
  - Get a single item by id.
  - Response:
    - 200: `ItemDetailOut`
    - 404: `{ "detail": "not_found" }` (missing/inactive)
  - `ItemDetailOut` extends `ItemListOut`, plus:
    - `description: string | null`
    - `nutrition_json: string | null`
    - `stock_qty: int`
    - `is_active: bool`
  - Example:
    ```bash
    curl -sS http://localhost:8000/api/items/1
    ```
    ```json
    {
      "id": 1,
      "name": "Organic Apples",
      "price_cents": 399,
      "weight_oz": 16,
      "category": "fruits",
      "image_url": null,
      "avg_rating": 4.5,
      "ratings_count": 2,
      "description": "Crisp organic apples. 1 lb bag.",
      "nutrition_json": null,
      "stock_qty": 50,
      "is_active": true
    }
    ```

### Reviews

- GET `/api/items/{item_id}/reviews`
  - List reviews for an item (newest first).
  - Query params:
    - `limit: int` (1..100, default 10)
    - `offset: int` (>=0, default 0)
  - Response 200: `ReviewOut[]`
    - `ReviewOut` fields:
      - `id: int`
      - `item_id: int`
      - `user_id: int`
      - `rating: int` (1..5)
      - `title: string | null`
      - `body: string`
      - `created_at: ISO timestamp`
  - Example:
    ```bash
    curl -sS "http://localhost:8000/api/items/1/reviews?limit=10"
    ```

- POST `/api/items/{item_id}/reviews`
  - Create or update the calling user’s review of an item.
  - Headers:
    - `X-User-Id: <int>` (required)
  - Body: `ReviewIn`
    - `rating: int` (1..5)
    - `title: string | null`
    - `body: string` (min 5 chars)
  - Responses:
    - 201: `{ "ok": true }`
    - 401: `{ "detail": "invalid_token" }` if missing/invalid `X-User-Id`
    - 404: `{ "detail": "not_found" }` if item missing/inactive
  - Example:
    ```bash
    curl -sS -X POST \
      -H "Content-Type: application/json" \
      -H "X-User-Id: 123" \
      -d '{"rating":5,"title":"Nice","body":"Very good quality"}' \
      http://localhost:8000/api/items/1/reviews
    ```

### Notes for Frontend

- Prices are in cents; format on the client.
- Ratings are precomputed on list view via `avg_rating` and `ratings_count`.
- For details page, call `GET /api/items/{id}` to get `description`, `stock_qty`, and `nutrition_json`.
- Use pagination via `limit`/`offset` on list and reviews.
- Send `X-User-Id` for any action requiring a user context (reviews).


