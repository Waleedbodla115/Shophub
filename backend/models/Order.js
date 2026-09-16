"use strict";

const mongoose = require("mongoose");


// =========================================================
// ORDER ITEM SCHEMA
// =========================================================

const orderItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        image: {
            type: String,
            default: ""
        },

        price: {
            type: Number,
            required: true,
            min: 0
        },

        quantity: {
            type: Number,
            required: true,
            min: 1
        }
    },
    {
        _id: false
    }
);


// =========================================================
// ORDER SCHEMA
// =========================================================

const orderSchema = new mongoose.Schema(
    {
        // =====================================================
        // CUSTOMER
        // =====================================================

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        customerName: {
            type: String,
            required: true,
            trim: true
        },

        customerEmail: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },

        customerPhone: {
            type: String,
            required: true,
            trim: true
        },


        // =====================================================
        // SHIPPING ADDRESS
        // =====================================================

        shippingAddress: {
            address: {
                type: String,
                required: true,
                trim: true
            },

            city: {
                type: String,
                required: true,
                trim: true
            },

            state: {
                type: String,
                default: "",
                trim: true
            },

            postalCode: {
                type: String,
                default: "",
                trim: true
            },

            country: {
                type: String,
                default: "Pakistan",
                trim: true
            }
        },


        // =====================================================
        // ORDER PRODUCTS
        // =====================================================

        items: {
            type: [orderItemSchema],
            required: true,

            validate: {
                validator: function (items) {
                    return items && items.length > 0;
                },

                message: "Order must contain at least one product"
            }
        },


        // =====================================================
        // PRICING
        // =====================================================

        subtotal: {
            type: Number,
            required: true,
            min: 0
        },

        shipping: {
            type: Number,
            default: 0,
            min: 0
        },

        discount: {
            type: Number,
            default: 0,
            min: 0
        },

        total: {
            type: Number,
            required: true,
            min: 0
        },


        // =====================================================
        // PAYMENT
        // =====================================================

        paymentMethod: {
            type: String,
            enum: [
                "Cash on Delivery",
                "Card",
                "Online Payment"
            ],
            default: "Cash on Delivery"
        },

        paymentStatus: {
            type: String,
            enum: [
                "Pending",
                "Paid",
                "Failed",
                "Cancelled"
            ],
            default: "Pending"
        },


        // =====================================================
        // ORDER STATUS
        // =====================================================

        status: {
            type: String,
            enum: [
                "Pending",
                "Processing",
                "Shipped",
                "Delivered",
                "Cancelled"
            ],
            default: "Pending"
        }
    },

    {
        timestamps: true
    }
);


// =========================================================
// ORDER NUMBER
// =========================================================

orderSchema.virtual("orderNumber").get(function () {

    return `SH-${this._id
        .toString()
        .slice(-8)
        .toUpperCase()}`;

});


// =========================================================
// EXPORT
// =========================================================

module.exports = mongoose.model(
    "Order",
    orderSchema
);