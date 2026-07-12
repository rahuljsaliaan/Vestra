/**
 * @file Shared JSDoc type definitions. This module contains no runtime code —
 * it exists purely so editors give us IntelliSense and type-checking across the
 * project without a TypeScript build step. Import types with
 * `@typedef {import('../types.js').Product} Product` where needed.
 */

/**
 * A single product review as returned by DummyJSON.
 * @typedef {Object} Review
 * @property {number} rating
 * @property {string} comment
 * @property {string} date ISO string.
 * @property {string} reviewerName
 */

/**
 * A product, normalised from the DummyJSON response after validation.
 * @typedef {Object} Product
 * @property {number} id
 * @property {string} title
 * @property {string} description
 * @property {string} category DummyJSON category slug.
 * @property {number} price Base price in USD (DummyJSON's native unit).
 * @property {number} discountPercentage
 * @property {number} rating
 * @property {number} stock
 * @property {string[]} tags
 * @property {string} [brand] Optional — absent on some products.
 * @property {string} [sku]
 * @property {string} [availabilityStatus]
 * @property {string} [returnPolicy]
 * @property {Review[]} reviews
 * @property {string[]} images
 * @property {string} thumbnail
 */

/**
 * DummyJSON list response envelope.
 * @typedef {Object} ProductListResponse
 * @property {Product[]} products
 * @property {number} total
 * @property {number} skip
 * @property {number} limit
 */

/**
 * A retailer descriptor / adapter (see config/retailers.js).
 * @typedef {Object} Retailer
 * @property {string} id
 * @property {string} name
 * @property {string} color Brand accent colour (hex).
 * @property {(product: Product) => string} buildSearchUrl
 */

/**
 * A simulated cross-store offer (see services/offers-service.js).
 * @typedef {Object} Offer
 * @property {Retailer} retailer
 * @property {number} priceInr
 * @property {boolean} inStock
 * @property {number} deliveryDays
 * @property {string} blurb
 * @property {boolean} isBestPrice
 * @property {string} url
 */

/**
 * A wishlist entry: a lightweight snapshot so the wishlist renders without
 * re-fetching, plus the collection ids it belongs to.
 * @typedef {Object} WishlistItem
 * @property {number} id
 * @property {string} title
 * @property {string} thumbnail
 * @property {string} category
 * @property {number} priceInr
 * @property {number} addedAt Epoch ms.
 * @property {string[]} collectionIds
 */

/**
 * A named wishlist collection.
 * @typedef {Object} Collection
 * @property {string} id
 * @property {string} name
 * @property {number} createdAt Epoch ms.
 */

/**
 * Persisted wishlist state (schema v1).
 * @typedef {Object} WishlistStateV1
 * @property {number} version
 * @property {WishlistItem[]} items
 * @property {Collection[]} collections
 */

/**
 * The user's style-quiz profile (schema v1).
 * @typedef {Object} QuizProfileV1
 * @property {number} version
 * @property {Record<string,string>} answers Map of step id → selected option id.
 * @property {Record<string,number>} categoryWeights
 * @property {Record<string,number>} tagWeights
 * @property {{minInr:number, maxInr:number}} priceBand
 * @property {number} completedAt Epoch ms.
 */

/**
 * The context object passed to a page's lifecycle methods by the router.
 * @typedef {Object} RouteContext
 * @property {string} routeId
 * @property {Record<string,string>} params Path params, decoded.
 * @property {URLSearchParams} query
 * @property {AbortSignal} signal Aborted when the page unmounts.
 */

/**
 * A mounted page instance.
 * @typedef {Object} Page
 * @property {(root: HTMLElement, ctx: RouteContext) => (void|Promise<void>)} mount
 * @property {((ctx: RouteContext) => void)} [onQueryChange]
 * @property {() => void} unmount
 */

// No exports — types only.
export {};
