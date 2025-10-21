import * as t from "io-ts";

// entities
export const Item = t.type({
    id: t.number,
    name: t.string,
    price_cents: t.number,
    weight_oz: t.number,
    category: t.union([t.string, t.null]),
    image_url: t.union([t.string, t.null]),
    avg_rating: t.number,
    ratings_count: t.number
});

export type ItemT = t.TypeOf<typeof Item>;

export const ItemDetail = t.type({
    id: t.number,
    name: t.string,
    price_cents: t.number,
    weight_oz: t.number,
    category: t.union([t.string, t.null]),
    image_url: t.union([t.string, t.null]),
    description: t.union([t.string, t.null]),
    nutrition_json: t.union([t.string, t.null]),
    avg_rating: t.number,
    ratings_count: t.number,
    stock_qty: t.number,
    is_active: t.boolean,
});

export type ItemDetailT = t.TypeOf<typeof ItemDetail>;

export const CartItem = t.type({
    quantity: t.number,
    item: Item
});

export type CartItemT = t.TypeOf<typeof CartItem>;

// requests
export const UpsertCartItemRequest = t.type({
    item_id: t.number,
    quantity: t.number
});

export type UpsertCartItemRequest = t.TypeOf<typeof UpsertCartItemRequest>;

// search
export const SearchSuggestion = t.type({
    id: t.number,
    name: t.string,
    category: t.union([t.string, t.null]),
    image_url: t.union([t.string, t.null]),
    price_cents: t.number,
    relevance_score: t.number
});

export type SearchSuggestionT = t.TypeOf<typeof SearchSuggestion>;

// responses
export const GenericResponse = t.type({
    ok: t.boolean
});

export type GenericResponseT = t.TypeOf<typeof GenericResponse>;

export const CartItemsResponse = t.type({
    items: t.array(CartItem),
    total_item_cents: t.number,
    total_shipping_cents: t.number,
    total_cents: t.number,
    total_weight_oz: t.number,
    shipping_waived: t.boolean
});

export type CartItemsResponseT = t.TypeOf<typeof CartItemsResponse>;

export const ItemsListResponse = t.array(Item);
export const ItemsByCategoryResponse = t.record(t.string, t.array(Item));
export const SearchSuggestionsResponse = t.array(SearchSuggestion);