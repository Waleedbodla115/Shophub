

const mongoose = require("mongoose");
const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product");


// =========================================================
// GET MY WISHLIST
// GET /api/wishlist
// =========================================================

const getWishlist = async (req, res) => {

    try {

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        let wishlist = await Wishlist.findOne({
            user: req.user._id
        }).populate("products");

        // Create wishlist automatically
        // if user does not have one yet.

        if (!wishlist) {

            wishlist = await Wishlist.create({
                user: req.user._id,
                products: []
            });

            wishlist = await wishlist.populate("products");
        }

        return res.status(200).json({
            success: true,
            count: wishlist.products.length,
            products: wishlist.products
        });

    } catch (error) {

        console.error(
            "❌ Get Wishlist Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch wishlist."
        });
    }
};


// =========================================================
// ADD TO WISHLIST
// POST /api/wishlist
// =========================================================

const addToWishlist = async (req, res) => {

    try {

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const { productId } = req.body;

        // -------------------------------------------------
        // PRODUCT ID VALIDATION
        // -------------------------------------------------

        if (
            !productId ||
            !mongoose.Types.ObjectId.isValid(productId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID."
            });
        }

        // -------------------------------------------------
        // CHECK PRODUCT
        // -------------------------------------------------

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        // -------------------------------------------------
        // FIND / CREATE WISHLIST
        // -------------------------------------------------

        let wishlist = await Wishlist.findOne({
            user: req.user._id
        });

        if (!wishlist) {

            wishlist = await Wishlist.create({
                user: req.user._id,
                products: []
            });
        }

        // -------------------------------------------------
        // DUPLICATE CHECK
        // -------------------------------------------------

        const alreadyExists =
            wishlist.products.some(
                id => id.toString() === productId.toString()
            );

        if (alreadyExists) {

            return res.status(200).json({
                success: true,
                message: "Product is already in wishlist.",
                wishlist
            });
        }

        // -------------------------------------------------
        // ADD PRODUCT
        // -------------------------------------------------

        wishlist.products.push(product._id);

        await wishlist.save();

        // Populate products for frontend

        await wishlist.populate("products");

        return res.status(200).json({
            success: true,
            message: "Product added to wishlist.",
            count: wishlist.products.length,
            products: wishlist.products
        });

    } catch (error) {

        console.error(
            "❌ Add Wishlist Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to add product to wishlist."
        });
    }
};


// =========================================================
// REMOVE FROM WISHLIST
// DELETE /api/wishlist/:productId
// =========================================================

const removeFromWishlist = async (req, res) => {

    try {

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const { productId } = req.params;

        if (
            !mongoose.Types.ObjectId.isValid(productId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID."
            });
        }

        const wishlist = await Wishlist.findOne({
            user: req.user._id
        });

        if (!wishlist) {
            return res.status(404).json({
                success: false,
                message: "Wishlist not found."
            });
        }

        wishlist.products =
            wishlist.products.filter(
                id =>
                    id.toString() !== productId.toString()
            );

        await wishlist.save();

        await wishlist.populate("products");

        return res.status(200).json({
            success: true,
            message: "Product removed from wishlist.",
            count: wishlist.products.length,
            products: wishlist.products
        });

    } catch (error) {

        console.error(
            "❌ Remove Wishlist Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to remove product."
        });
    }
};


// =========================================================
// CLEAR WISHLIST
// DELETE /api/wishlist
// =========================================================

const clearWishlist = async (req, res) => {

    try {

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const wishlist = await Wishlist.findOne({
            user: req.user._id
        });

        if (!wishlist) {
            return res.status(200).json({
                success: true,
                message: "Wishlist already empty.",
                count: 0,
                products: []
            });
        }

        wishlist.products = [];

        await wishlist.save();

        return res.status(200).json({
            success: true,
            message: "Wishlist cleared successfully.",
            count: 0,
            products: []
        });

    } catch (error) {

        console.error(
            "❌ Clear Wishlist Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to clear wishlist."
        });
    }
};


// =========================================================
// EXPORT
// =========================================================

module.exports = {

    getWishlist,

    addToWishlist,

    removeFromWishlist,

    clearWishlist

};