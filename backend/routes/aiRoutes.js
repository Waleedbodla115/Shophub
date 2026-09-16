"use strict";

const express = require("express");
const router = express.Router();

const {
    findProducts,
    getRecommendations,
    getPersonalized
} = require("../controllers/aiController");

// POST /api/ai/find-products   -> { query } => { products }
router.post("/find-products", findProducts);

// GET /api/ai/recommendations/:productId -> { recommendations }
router.get("/recommendations/:productId", getRecommendations);

// POST /api/ai/personalized -> { recentlyViewedIds, cartIds, wishlistIds } => { products }
router.post("/personalized", getPersonalized);

module.exports = router;