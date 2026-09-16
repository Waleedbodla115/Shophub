"use strict";

const Product = require("../models/Product");
const {
    parseProductQuery,
    fuzzyMatches
} = require("../utils/nlpQuery");

// =========================================================
// POST /api/ai/find-products
// Body: { query: "black sneakers under $100" }
// =========================================================

const findProducts = async (req, res) => {

    try {

        const { query } = req.body;

        if (!query || typeof query !== "string" || !query.trim()) {

            return res.status(400).json({
                success: false,
                message: "A search query is required"
            });
        }

        const parsed = parseProductQuery(query);

        // -----------------------------------------------
        // Build primary Mongo filter from parsed query
        // -----------------------------------------------

        const filter = { stock: { $gt: 0 } };

        if (parsed.category) {
            filter.category = parsed.category;
        }

        if (parsed.priceMin !== null || parsed.priceMax !== null) {

            filter.price = {};

            if (parsed.priceMin !== null) {
                filter.price.$gte = parsed.priceMin;
            }

            if (parsed.priceMax !== null) {
                filter.price.$lte = parsed.priceMax;
            }
        }

        if (parsed.keywords.length) {

            filter.$or = parsed.keywords.map((word) => ({
                $or: [
                    { name: { $regex: word, $options: "i" } },
                    { description: { $regex: word, $options: "i" } }
                ]
            }));
        }

        let products = await Product.find(filter)
            .sort({ rating: -1 })
            .limit(24)
            .lean();

        let usedFallback = false;
        let usedFuzzy = false;

        // -----------------------------------------------
        // NEW FALLBACK (typo tolerance): the exact regex
        // match above found nothing, but the user typed
        // real keywords (e.g. "sneekers" instead of
        // "sneakers"). Before giving up on keywords
        // entirely, try a Levenshtein-based fuzzy match
        // against real product name/description words.
        // Still 100% real Mongo products — we only ever
        // filter, never invent anything.
        // -----------------------------------------------

        if (!products.length && parsed.keywords.length) {

            const candidateFilter = { stock: { $gt: 0 } };

            if (parsed.category) candidateFilter.category = parsed.category;
            if (filter.price) candidateFilter.price = filter.price;

            const candidates = await Product.find(candidateFilter)
                .sort({ rating: -1 })
                .limit(200)
                .lean();

            const scored = candidates
                .map((product) => {

                    const productWords = `${product.name} ${product.description || ""}`
                        .toLowerCase()
                        .split(/\s+/)
                        .filter(Boolean);

                    let matchCount = 0;

                    for (const keyword of parsed.keywords) {

                        const hasMatch = productWords.some(
                            (word) => fuzzyMatches(keyword, word)
                        );

                        if (hasMatch) {
                            matchCount += 1;
                        }
                    }

                    return { product, matchCount };
                })
                .filter((entry) => entry.matchCount > 0)
                .sort((a, b) => {

                    if (b.matchCount !== a.matchCount) {
                        return b.matchCount - a.matchCount;
                    }

                    return (b.product.rating || 0) - (a.product.rating || 0);
                });

            if (scored.length) {

                usedFuzzy = true;

                products = scored
                    .slice(0, 24)
                    .map((entry) => entry.product);
            }
        }

        // -----------------------------------------------
        // Existing fallback: if there's still nothing,
        // relax the filter step by step. Still 100% real
        // Mongo products, never invented.
        // -----------------------------------------------

        if (!products.length && parsed.keywords.length) {

            usedFallback = true;

            const relaxedFilter = { stock: { $gt: 0 } };

            if (parsed.category) relaxedFilter.category = parsed.category;
            if (filter.price) relaxedFilter.price = filter.price;

            products = await Product.find(relaxedFilter)
                .sort({ rating: -1 })
                .limit(24)
                .lean();
        }

        if (!products.length && (parsed.category || filter.price)) {

            usedFallback = true;

            products = await Product.find({ stock: { $gt: 0 } })
                .sort({ rating: -1 })
                .limit(24)
                .lean();
        }

        return res.status(200).json({
            success: true,
            parsedQuery: parsed,
            usedFallback,
            usedFuzzy,
            count: products.length,
            products
        });

    } catch (error) {

        console.error("❌ AI Product Finder Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to search products"
        });
    }
};

// =========================================================
// GET /api/ai/recommendations/:productId
// "✨ Shoppy recommends" — same category, similar price,
// good rating, in stock. Pure Mongo, no AI call needed.
// =========================================================

const getRecommendations = async (req, res) => {

    try {

        const { productId } = req.params;

        const baseProduct = await Product.findById(productId).lean();

        if (!baseProduct) {

            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        const priceMin = baseProduct.price * 0.5;
        const priceMax = baseProduct.price * 1.5;

        let recommendations = await Product.find({
            _id: { $ne: baseProduct._id },
            category: baseProduct.category,
            stock: { $gt: 0 },
            price: { $gte: priceMin, $lte: priceMax }
        })
            .sort({ rating: -1 })
            .limit(4)
            .lean();

        // Not enough close matches? Broaden to same category,
        // ignoring price band, still excluding what we already have.

        if (recommendations.length < 4) {

            const excludeIds = [
                baseProduct._id,
                ...recommendations.map((p) => p._id)
            ];

            const more = await Product.find({
                _id: { $nin: excludeIds },
                category: baseProduct.category,
                stock: { $gt: 0 }
            })
                .sort({ rating: -1 })
                .limit(4 - recommendations.length)
                .lean();

            recommendations = recommendations.concat(more);
        }

        return res.status(200).json({
            success: true,
            baseProduct: {
                id: baseProduct._id,
                name: baseProduct.name
            },
            count: recommendations.length,
            recommendations
        });

    } catch (error) {

        console.error("❌ AI Recommendations Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to load recommendations"
        });
    }
};

// =========================================================
// POST /api/ai/personalized
// Body: { recentlyViewedIds: [...], cartIds: [...], wishlistIds: [...] }
// "Recommended for You" — built from the user's own recent
// activity (all client-supplied, no server-side tracking).
// Pure Mongo queries based on the categories/price ranges of
// those products, same "never invent, only filter" approach
// as findProducts/getRecommendations.
// =========================================================

const getPersonalized = async (req, res) => {

    try {

        const {
            recentlyViewedIds = [],
            cartIds = [],
            wishlistIds = []
        } = req.body || {};

        const sourceIds = [
            ...new Set(
                [...recentlyViewedIds, ...cartIds, ...wishlistIds]
                    .filter(Boolean)
                    .map(String)
            )
        ].slice(0, 30); // keep the lookup bounded

        if (!sourceIds.length) {

            // No activity yet — fall back to top-rated in-stock
            // products so the section never renders empty.

            const fallbackProducts = await Product.find({ stock: { $gt: 0 } })
                .sort({ rating: -1 })
                .limit(8)
                .lean();

            return res.status(200).json({
                success: true,
                basedOn: "top-rated",
                count: fallbackProducts.length,
                products: fallbackProducts
            });
        }

        const sourceProducts = await Product.find({
            _id: { $in: sourceIds }
        }).lean();

        if (!sourceProducts.length) {

            const fallbackProducts = await Product.find({ stock: { $gt: 0 } })
                .sort({ rating: -1 })
                .limit(8)
                .lean();

            return res.status(200).json({
                success: true,
                basedOn: "top-rated",
                count: fallbackProducts.length,
                products: fallbackProducts
            });
        }

        // Build the "taste profile": which categories the user
        // has touched, and a price band around what they look at.

        const categories = [
            ...new Set(sourceProducts.map((p) => p.category))
        ];

        const prices = sourceProducts.map((p) => Number(p.price) || 0);
        const priceMin = Math.min(...prices) * 0.6;
        const priceMax = Math.max(...prices) * 1.4;

        const excludeIds = sourceProducts.map((p) => p._id);

        let products = await Product.find({
            _id: { $nin: excludeIds },
            category: { $in: categories },
            stock: { $gt: 0 },
            price: { $gte: priceMin, $lte: priceMax }
        })
            .sort({ rating: -1 })
            .limit(8)
            .lean();

        // Not enough matches in that price band? Broaden to just
        // the same categories, still excluding what they already
        // viewed/have in cart/wishlist.

        if (products.length < 8) {

            const excludeMore = [
                ...excludeIds,
                ...products.map((p) => p._id)
            ];

            const more = await Product.find({
                _id: { $nin: excludeMore },
                category: { $in: categories },
                stock: { $gt: 0 }
            })
                .sort({ rating: -1 })
                .limit(8 - products.length)
                .lean();

            products = products.concat(more);
        }

        return res.status(200).json({
            success: true,
            basedOn: "activity",
            categories,
            count: products.length,
            products
        });

    } catch (error) {

        console.error("❌ Personalized Recommendations Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to load personalized recommendations"
        });
    }
};

module.exports = {
    findProducts,
    getRecommendations,
    getPersonalized
};