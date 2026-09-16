"use strict";

const Product = require("../models/Product");


// =========================================================
// GET ALL PRODUCTS
// =========================================================

const getProducts = async (req, res) => {

    try {

        const products = await Product.find()
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: products.length,
            products: products
        });

    } catch (error) {

        console.error("❌ Get Products Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch products",
            error: error.message
        });

    }

};


// =========================================================
// GET SINGLE PRODUCT
// =========================================================

const getProduct = async (req, res) => {

    try {

        const product = await Product.findById(req.params.id);

        if (!product) {

            return res.status(404).json({
                success: false,
                message: "Product not found"
            });

        }

        res.status(200).json({
            success: true,
            product: product
        });

    } catch (error) {

        console.error("❌ Get Product Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch product",
            error: error.message
        });

    }

};


// =========================================================
// CREATE PRODUCT
// =========================================================

const createProduct = async (req, res) => {

    try {

        const product = await Product.create({
            name: req.body.name,
            description: req.body.description,
            price: req.body.price,
            category: req.body.category,
            image: req.body.image,
            stock: req.body.stock,
            rating: req.body.rating
        });

        res.status(201).json({
            success: true,
            message: "Product created successfully",
            product: product
        });

    } catch (error) {

        console.error("❌ Create Product Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create product",
            error: error.message
        });

    }

};


// =========================================================
// UPDATE PRODUCT
// =========================================================

const updateProduct = async (req, res) => {

    try {

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!product) {

            return res.status(404).json({
                success: false,
                message: "Product not found"
            });

        }

        res.status(200).json({
            success: true,
            message: "Product updated successfully",
            product: product
        });

    } catch (error) {

        console.error("❌ Update Product Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update product",
            error: error.message
        });

    }

};


// =========================================================
// DELETE PRODUCT
// =========================================================

const deleteProduct = async (req, res) => {

    try {

        const product = await Product.findByIdAndDelete(
            req.params.id
        );

        if (!product) {

            return res.status(404).json({
                success: false,
                message: "Product not found"
            });

        }

        res.status(200).json({
            success: true,
            message: "Product deleted successfully"
        });

    } catch (error) {

        console.error("❌ Delete Product Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete product",
            error: error.message
        });

    }

};


module.exports = {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct
};