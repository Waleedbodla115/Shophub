"use strict";

const express = require("express");

const router = express.Router();

// =========================================================
// CONTROLLERS
// =========================================================

const {
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    clearWishlist
} = require("../controllers/wishlistControllers");

// =========================================================
// MIDDLEWARE
// =========================================================

const {
    protect
} = require("../middleware/authMiddleware");

// =========================================================
// GET MY WISHLIST
// GET /api/wishlist
// =========================================================

router.get(
    "/",
    protect,
    getWishlist
);

// =========================================================
// ADD PRODUCT TO WISHLIST
// POST /api/wishlist
// =========================================================

router.post(
    "/",
    protect,
    addToWishlist
);

// =========================================================
// CLEAR WISHLIST
// DELETE /api/wishlist
// =========================================================

router.delete(
    "/",
    protect,
    clearWishlist
);

// =========================================================
// REMOVE SINGLE PRODUCT FROM WISHLIST
// DELETE /api/wishlist/:productId
// =========================================================

router.delete(
    "/:productId",
    protect,
    removeFromWishlist
);

// =========================================================
// EXPORT
// =========================================================

module.exports = router;