# API Documentation

This document outlines the API endpoints currently used by the frontend application.

**Base URL**: `/api`

## Authentication (`/auth`)

| Method | Endpoint         | Description                                              | Authentication |
| :----- | :--------------- | :------------------------------------------------------- | :------------- |
| `POST` | `/auth/signup`   | Register a new user account.                             | Public         |
| `POST` | `/auth/login`    | Log in with email and password. Returns an access token. | Public         |
| `POST` | `/auth/google`   | Log in or sign up using Google OAuth.                    | Public         |
| `GET`  | `/auth/me`       | Get the currently logged-in user's profile information.  | Required       |
| `PUT`  | `/auth/profile`  | Update user profile (name, address, phone).              | Required       |
| `PUT`  | `/auth/password` | Change user password.                                    | Required       |

## Search (`/search`)

| Method | Endpoint  | Description                                                   | Authentication |
| :----- | :-------- | :------------------------------------------------------------ | :------------- |
| `GET`  | `/search` | Search for items by name. Query params: `q` (query), `limit`. | Public         |

## Items (`/items`)

| Method | Endpoint           | Description                                                       | Authentication |
| :----- | :----------------- | :---------------------------------------------------------------- | :------------- |
| `GET`  | `/items`           | List items. Supports grouping. Query params: `group_by`, `limit`. | Public         |
| `GET`  | `/items/{item_id}` | Get detailed information for a specific item.                     | Public         |

## Cart (`/cart`)

| Method | Endpoint | Description                                                    | Authentication |
| :----- | :------- | :------------------------------------------------------------- | :------------- |
| `GET`  | `/cart`  | Get the current user's shopping cart items.                    | Required       |
| `POST` | `/cart`  | Add or update an item in the cart. Body: item ID and quantity. | Required       |

## Favorites (`/favorites`)

| Method   | Endpoint               | Description                             | Authentication |
| :------- | :--------------------- | :-------------------------------------- | :------------- |
| `GET`    | `/favorites/`          | List the current user's favorite items. | Required       |
| `POST`   | `/favorites/{item_id}` | Add an item to favorites.               | Required       |
| `DELETE` | `/favorites/{item_id}` | Remove an item from favorites.          | Required       |

## Orders (`/orders`)

| Method | Endpoint  | Description                                     | Authentication |
| :----- | :-------- | :---------------------------------------------- | :------------- |
| `GET`  | `/orders` | List the current user's past and active orders. | Required       |

## Payment (`/payment`)

| Method | Endpoint                         | Description                                                                           | Authentication |
| :----- | :------------------------------- | :------------------------------------------------------------------------------------ | :------------- |
| `GET`  | `/payment/validate-cart`         | Validate cart items against current inventory. Returns errors for out-of-stock items. | Required       |
| `GET`  | `/payment/create-payment-intent` | Create a Stripe payment intent for the current cart total.                            | Required       |
| `GET`  | `/payment/create-setup-intent`   | Create a Stripe setup intent for saving payment methods.                              | Required       |
| `POST` | `/payment/confirm-payment/`      | Confirm a successful payment and create the order in the system.                      | Required       |

## Vehicle & Tracking (`/vehicle`)

| Method | Endpoint                          | Description                                           | Authentication |
| :----- | :-------------------------------- | :---------------------------------------------------- | :------------- |
| `GET`  | `/vehicle/order-route/{order_id}` | Get the delivery route polyline for a specific order. | Required       |
| `WS`   | `/vehicle/ws/monitor`             | WebSocket connection for real-time delivery tracking. | Required       |
| `WS`   | `/vehicle/ws/deliver`             | WebSocket connection for delivery drivers.            | Required       |

## Admin (`/admin`)

Requires **Admin** role.

### Users

| Method | Endpoint                        | Description                                        |
| :----- | :------------------------------ | :------------------------------------------------- |
| `GET`  | `/admin/users`                  | List all users in the system.                      |
| `PUT`  | `/admin/users/{userId}/role`    | Update a user's role (e.g., to manager, employee). |
| `PUT`  | `/admin/users/{userId}/block`   | Block or unblock a user.                           |
| `PUT`  | `/admin/users/{userId}/manager` | Assign or update a user's reporting manager.       |

### Items

| Method   | Endpoint                          | Description                                 |
| :------- | :-------------------------------- | :------------------------------------------ |
| `GET`    | `/admin/items`                    | List all items (including inactive ones).   |
| `POST`   | `/admin/items`                    | Create a new item.                          |
| `GET`    | `/admin/items/{itemId}`           | Get details of a specific item for editing. |
| `PUT`    | `/admin/items/{itemId}`           | Update an existing item.                    |
| `PUT`    | `/admin/items/{itemId}/activate`  | Toggle item activation status.              |
| `DELETE` | `/admin/items/{itemId}/permanent` | Permanently delete an item.                 |
| `GET`    | `/admin/categories`               | List available item categories.             |

### Orders

| Method | Endpoint                         | Description                      |
| :----- | :------------------------------- | :------------------------------- |
| `GET`  | `/admin/orders`                  | List all system orders.          |
| `GET`  | `/admin/orders/{orderId}`        | Get details of a specific order. |
| `PUT`  | `/admin/orders/{orderId}/status` | Manually update order status.    |

### Audit Logs

| Method | Endpoint                  | Description                             |
| :----- | :------------------------ | :-------------------------------------- |
| `GET`  | `/admin/audit-logs`       | View system audit logs.                 |
| `GET`  | `/admin/audit-logs/stats` | Get statistics derived from audit logs. |

### Media Generation

| Method | Endpoint                               | Description                                   |
| :----- | :------------------------------------- | :-------------------------------------------- |
| `POST` | `/admin/image/generate`                | Generate an image using AI (asynchronous).    |
| `GET`  | `/admin/image/health`                  | Check health of image generation service.     |
| `POST` | `/admin/video/generate`                | Generate a video using AI (asynchronous).     |
| `POST` | `/admin/video/generate-sync`           | Generate a video using AI (synchronous).      |
| `GET`  | `/admin/video/status/{operationId}`    | Check status of a video generation operation. |
| `GET`  | `/admin/video/operation/{operationId}` | Get details of a video generation operation.  |
| `GET`  | `/admin/video/health`                  | Check health of video generation service.     |

## Manager (`/manager`)

Requires **Manager** or **Admin** role.

| Method | Endpoint                        | Description                     |
| :----- | :------------------------------ | :------------------------------ |
| `PUT`  | `/manager/users/{userId}/role`  | Update a subordinate's role.    |
| `PUT`  | `/manager/users/{userId}/block` | Block or unblock a subordinate. |

## Employee (`/employee`)

Requires **Employee** role.

| Method | Endpoint                     | Description                                |
| :----- | :--------------------------- | :----------------------------------------- |
| `GET`  | `/employee/items`            | List items for inventory management.       |
| `GET`  | `/employee/items/{id}`       | Get details of a specific item.            |
| `PUT`  | `/employee/items/{id}/stock` | Update stock quantity for an item.         |
| `GET`  | `/employee/categories`       | List item categories.                      |
| `GET`  | `/employee/orders`           | List orders assigned for packing/delivery. |
| `GET`  | `/employee/orders/{id}`      | Get details of a specific order.           |
