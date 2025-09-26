import * as t from "io-ts";

export const Item = t.type({
    id: t.string,
    name: t.string,
    description: t.string,
    category: t.string,
    inStock: t.number,
    imageUrl: t.string
})

export type ItemT = t.TypeOf<typeof Item>;