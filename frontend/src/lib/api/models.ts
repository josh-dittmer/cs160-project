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

// requests

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
export const ItemsListResponse = t.array(Item);
export const ItemsByCategoryResponse = t.record(t.string, t.array(Item));
export const SearchSuggestionsResponse = t.array(SearchSuggestion);