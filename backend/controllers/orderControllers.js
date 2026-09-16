"use strict";

const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");


// =========================================================
// CREATE ORDER
// POST /api/orders
// =========================================================

const createOrder = async (req, res) => {
    try {
        const {
            customerName,
            customerEmail,
            customerPhone,
            shippingAddress,
            items,
            paymentMethod,
            discount = 0
        } = req.body;


        // =====================================================
        // AUTHENTICATION
        // =====================================================

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }


        // =====================================================
        // CUSTOMER VALIDATION
        // =====================================================

        if (
            typeof customerName !== "string" ||
            !customerName.trim() ||
            typeof customerEmail !== "string" ||
            !customerEmail.trim() ||
            typeof customerPhone !== "string" ||
            !customerPhone.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Customer information is required."
            });
        }


        // =====================================================
        // SHIPPING ADDRESS VALIDATION
        // =====================================================

        if (
            !shippingAddress ||
            typeof shippingAddress !== "object" ||
            typeof shippingAddress.address !== "string" ||
            !shippingAddress.address.trim() ||
            typeof shippingAddress.city !== "string" ||
            !shippingAddress.city.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Complete shipping address is required."
            });
        }


        // =====================================================
        // ITEMS VALIDATION
        // =====================================================

        if (
            !Array.isArray(items) ||
            items.length === 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Order must contain at least one product."
            });
        }


        // =====================================================
        // PAYMENT METHOD
        // =====================================================

        const allowedPaymentMethods = [
            "Cash on Delivery",
            "Card",
            "Online Payment"
        ];

        const selectedPaymentMethod =
            allowedPaymentMethods.includes(paymentMethod)
                ? paymentMethod
                : "Cash on Delivery";


        // =====================================================
        // BUILD ORDER ITEMS
        // PRICE ALWAYS COMES FROM DATABASE
        // =====================================================

        const orderItems = [];

        let subtotal = 0;


        for (const item of items) {

            // -------------------------------------------------
            // PRODUCT ID
            // -------------------------------------------------

            if (
                !item.product ||
                !mongoose.Types.ObjectId.isValid(item.product)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid product ID."
                });
            }


            // -------------------------------------------------
            // QUANTITY
            // -------------------------------------------------

            const rawQuantity = Number(item.quantity);

            if (
                !Number.isFinite(rawQuantity) ||
                rawQuantity < 1
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid product quantity."
                });
            }

            const quantity = Math.floor(rawQuantity);


            if (quantity < 1) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid product quantity."
                });
            }


            // -------------------------------------------------
            // FIND PRODUCT
            // -------------------------------------------------

            const product = await Product.findById(item.product);

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found."
                });
            }


            // -------------------------------------------------
            // PRODUCT PRICE
            // -------------------------------------------------

            const productPrice = Number(product.price);

            if (
                !Number.isFinite(productPrice) ||
                productPrice < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid price for ${product.name}.`
                });
            }


            // -------------------------------------------------
            // STOCK CHECK
            // -------------------------------------------------

            if (
                product.stock !== undefined &&
                product.stock !== null
            ) {
                const productStock = Number(product.stock);

                if (
                    !Number.isFinite(productStock) ||
                    productStock < quantity
                ) {
                    return res.status(400).json({
                        success: false,
                        message: `${product.name} does not have enough stock.`
                    });
                }
            }


            // -------------------------------------------------
            // ITEM TOTAL
            // -------------------------------------------------

            const itemTotal =
                productPrice * quantity;

            subtotal += itemTotal;


            // -------------------------------------------------
            // SAVE ORDER ITEM
            // -------------------------------------------------

            orderItems.push({
                product: product._id,

                name: product.name,

                image: product.image || "",

                price: productPrice,

                quantity
            });
        }


        // =====================================================
        // ROUND SUBTOTAL
        // =====================================================

        subtotal = Number(
            subtotal.toFixed(2)
        );


        // =====================================================
        // SHIPPING
        // FREE SHIPPING ABOVE $150
        // =====================================================

        const shipping =
            subtotal >= 150
                ? 0
                : 10;


        // =====================================================
        // DISCOUNT
        // =====================================================

        const safeDiscount =
            Number(discount);

        const validDiscount =
            Number.isFinite(safeDiscount) &&
            safeDiscount > 0
                ? safeDiscount
                : 0;


        const finalDiscount =
            Number(
                Math.min(
                    validDiscount,
                    subtotal + shipping
                ).toFixed(2)
            );


        // =====================================================
        // FINAL TOTAL
        // =====================================================

        const total =
            Number(
                (
                    subtotal +
                    shipping -
                    finalDiscount
                ).toFixed(2)
            );


        // =====================================================
        // CREATE ORDER
        // =====================================================

        const order = await Order.create({

            user: req.user._id,

            customerName:
                customerName.trim(),

            customerEmail:
                customerEmail
                    .trim()
                    .toLowerCase(),

            customerPhone:
                customerPhone.trim(),

            shippingAddress: {

                address:
                    shippingAddress.address.trim(),

                city:
                    shippingAddress.city.trim(),

                state:
                    typeof shippingAddress.state === "string"
                        ? shippingAddress.state.trim()
                        : "",

                postalCode:
                    typeof shippingAddress.postalCode === "string"
                        ? shippingAddress.postalCode.trim()
                        : "",

                country:
                    typeof shippingAddress.country === "string" &&
                    shippingAddress.country.trim()
                        ? shippingAddress.country.trim()
                        : "Pakistan"
            },

            items: orderItems,

            subtotal,

            shipping,

            discount: finalDiscount,

            total,

            paymentMethod:
                selectedPaymentMethod,

            paymentStatus:
                "Pending",

            status:
                "Pending"
        });


        // =====================================================
        // REDUCE PRODUCT STOCK
        // =====================================================

        for (const item of orderItems) {

            // Only decrease stock when the Product model
            // actually has a stock value.

            const product = await Product.findById(
                item.product
            );

            if (
                product &&
                product.stock !== undefined &&
                product.stock !== null
            ) {
                await Product.findByIdAndUpdate(
                    item.product,
                    {
                        $inc: {
                            stock: -item.quantity
                        }
                    }
                );
            }
        }


        // =====================================================
        // ORDER NUMBER
        // =====================================================

        const orderNumber =
            `SH-${order._id
                .toString()
                .slice(-8)
                .toUpperCase()}`;


        // =====================================================
        // RESPONSE
        // =====================================================

        return res.status(201).json({

            success: true,

            message:
                "Order placed successfully.",

            order: {

                id:
                    order._id,

                orderNumber,

                customerName:
                    order.customerName,

                customerEmail:
                    order.customerEmail,

                customerPhone:
                    order.customerPhone,

                subtotal:
                    order.subtotal,

                shipping:
                    order.shipping,

                discount:
                    order.discount,

                total:
                    order.total,

                paymentMethod:
                    order.paymentMethod,

                paymentStatus:
                    order.paymentStatus,

                status:
                    order.status,

                items:
                    order.items,

                shippingAddress:
                    order.shippingAddress,

                createdAt:
                    order.createdAt
            }
        });


    } catch (error) {

        console.error(
            "❌ Create Order Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to place order.",

            error:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined
        });
    }
};


// =========================================================
// GET MY ORDERS
// GET /api/orders/my-orders
// =========================================================

const getMyOrders = async (req, res) => {

    try {

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }


        const orders =
            await Order.find({
                user: req.user._id
            })
            .sort({
                createdAt: -1
            });


        return res.status(200).json({

            success: true,

            count:
                orders.length,

            orders
        });


    } catch (error) {

        console.error(
            "❌ Get My Orders Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to fetch your orders."
        });
    }
};


// =========================================================
// GET SINGLE ORDER
// GET /api/orders/:id
// =========================================================

const getOrder = async (req, res) => {

    try {

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }


        // =====================================================
        // VALIDATE ORDER ID
        // =====================================================

        if (
            !mongoose.Types.ObjectId.isValid(
                req.params.id
            )
        ) {
            return res.status(400).json({

                success: false,

                message:
                    "Invalid order ID."
            });
        }


        // =====================================================
        // FIND ORDER
        // =====================================================

        const order =
            await Order.findById(
                req.params.id
            )
            .populate(
                "user",
                "name email"
            );


        if (!order) {

            return res.status(404).json({

                success: false,

                message:
                    "Order not found."
            });
        }


        // =====================================================
        // CHECK PERMISSION
        // =====================================================

        const orderUserId =
            order.user &&
            order.user._id
                ? order.user._id.toString()
                : null;

        const currentUserId =
            req.user._id.toString();


        const isOwner =
            orderUserId === currentUserId;

        const isAdmin =
            req.user.isAdmin === true;


        if (!isOwner && !isAdmin) {

            return res.status(403).json({

                success: false,

                message:
                    "You are not allowed to view this order."
            });
        }


        // =====================================================
        // RESPONSE
        // =====================================================

        return res.status(200).json({

            success: true,

            order
        });


    } catch (error) {

        console.error(
            "❌ Get Order Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to fetch order."
        });
    }
};


// =========================================================
// GET ALL ORDERS
// ADMIN ONLY
// GET /api/orders
// =========================================================

const getAllOrders = async (req, res) => {

    try {

        if (!req.user) {
            return res.status(401).json({

                success: false,

                message:
                    "Authentication required."
            });
        }


        if (req.user.isAdmin !== true) {

            return res.status(403).json({

                success: false,

                message:
                    "Admin access required."
            });
        }


        const orders =
            await Order.find()
                .populate(
                    "user",
                    "name email"
                )
                .sort({
                    createdAt: -1
                });


        return res.status(200).json({

            success: true,

            count:
                orders.length,

            orders
        });


    } catch (error) {

        console.error(
            "❌ Get All Orders Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to fetch orders."
        });
    }
};


// =========================================================
// UPDATE ORDER STATUS
// ADMIN ONLY
// PUT /api/orders/:id/status
// =========================================================

const updateOrderStatus = async (req, res) => {

    try {

        if (!req.user) {

            return res.status(401).json({

                success: false,

                message:
                    "Authentication required."
            });
        }


        // =====================================================
        // ADMIN CHECK
        // =====================================================

        if (req.user.isAdmin !== true) {

            return res.status(403).json({

                success: false,

                message:
                    "Admin access required."
            });
        }


        // =====================================================
        // ORDER ID VALIDATION
        // =====================================================

        if (
            !mongoose.Types.ObjectId.isValid(
                req.params.id
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid order ID."
            });
        }


        // =====================================================
        // STATUS
        // =====================================================

        const {
            status
        } = req.body;


        const allowedStatuses = [

            "Pending",

            "Processing",

            "Shipped",

            "Delivered",

            "Cancelled"

        ];


        if (
            !allowedStatuses.includes(status)
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid order status."
            });
        }


        // =====================================================
        // FIND ORDER
        // =====================================================

        const order =
            await Order.findById(
                req.params.id
            );


        if (!order) {

            return res.status(404).json({

                success: false,

                message:
                    "Order not found."
            });
        }


        // =====================================================
        // UPDATE STATUS
        // =====================================================

        order.status =
            status;


        // =====================================================
        // COD PAYMENT
        // =====================================================

        if (
            status === "Delivered" &&
            order.paymentMethod === "Cash on Delivery"
        ) {

            order.paymentStatus =
                "Paid";
        }


        // =====================================================
        // CANCELLED ORDER
        // =====================================================

        if (
            status === "Cancelled" &&
            order.paymentMethod === "Cash on Delivery"
        ) {

            order.paymentStatus =
                "Cancelled";
        }


        // =====================================================
        // SAVE
        // =====================================================

        await order.save();


        // =====================================================
        // RESPONSE
        // =====================================================

        return res.status(200).json({

            success: true,

            message:
                "Order status updated successfully.",

            order
        });


    } catch (error) {

        console.error(
            "❌ Update Order Status Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to update order status."
        });
    }
};


// =========================================================
// UPDATE PAYMENT STATUS
// ADMIN ONLY — manual override until a real payment gateway
// (Stripe / JazzCash / etc.) is integrated
// PUT /api/orders/:id/payment-status
// =========================================================

const updatePaymentStatus = async (req, res) => {

    try {

        if (!req.user) {

            return res.status(401).json({

                success: false,

                message:
                    "Authentication required."
            });
        }


        // =====================================================
        // ADMIN CHECK
        // =====================================================

        if (req.user.isAdmin !== true) {

            return res.status(403).json({

                success: false,

                message:
                    "Admin access required."
            });
        }


        // =====================================================
        // ORDER ID VALIDATION
        // =====================================================

        if (
            !mongoose.Types.ObjectId.isValid(
                req.params.id
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid order ID."
            });
        }


        // =====================================================
        // PAYMENT STATUS
        // =====================================================

        const {
            paymentStatus
        } = req.body;


        const allowedPaymentStatuses = [

            "Pending",

            "Paid",

            "Failed",

            "Cancelled"

        ];


        if (
            !allowedPaymentStatuses.includes(paymentStatus)
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid payment status."
            });
        }


        // =====================================================
        // FIND ORDER
        // =====================================================

        const order =
            await Order.findById(
                req.params.id
            );


        if (!order) {

            return res.status(404).json({

                success: false,

                message:
                    "Order not found."
            });
        }


        // =====================================================
        // UPDATE PAYMENT STATUS
        // =====================================================

        order.paymentStatus =
            paymentStatus;


        // =====================================================
        // SAVE
        // =====================================================

        await order.save();


        // =====================================================
        // RESPONSE
        // =====================================================

        return res.status(200).json({

            success: true,

            message:
                "Payment status updated successfully.",

            order
        });


    } catch (error) {

        console.error(
            "❌ Update Payment Status Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to update payment status."
        });
    }
};


// =========================================================
// EXPORT
// =========================================================

module.exports = {

    createOrder,

    getMyOrders,

    getOrder,

    getAllOrders,

    updateOrderStatus,

    updatePaymentStatus

};