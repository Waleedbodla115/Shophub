"use strict";

const express = require("express");

const router = express.Router();

const {
    protect,
    admin
} = require("../middleware/authMiddleware");

const {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct
} = require("../controllers/productController");


// =========================================================
// GET ALL PRODUCTS
// =========================================================

router.get("/", getProducts);


// =========================================================
// CREATE PRODUCT
// =========================================================

router.post("/", protect, admin, createProduct);


// =========================================================
// GET SINGLE PRODUCT
// =========================================================

router.get("/:id", getProduct);


// =========================================================
// UPDATE PRODUCT
// =========================================================

router.put("/:id", protect, admin, updateProduct);


// =========================================================
// DELETE PRODUCT
// =========================================================

router.delete("/:id", protect, admin, deleteProduct);


module.exports = router;