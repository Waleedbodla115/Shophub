"use strict";

const express = require("express");

const router = express.Router();

// =========================================================
// CONTROLLERS
// =========================================================

const {
    createOrder,
    getMyOrders,
    getOrder,
    getAllOrders,
    updateOrderStatus,
    updatePaymentStatus
} = require("../controllers/orderControllers");

// =========================================================
// MIDDLEWARE
// =========================================================

const {
    protect,
    admin
} = require("../middleware/authMiddleware");

// =========================================================
// CREATE ORDER
// POST /api/orders
// =========================================================

router.post(
    "/",
    protect,
    createOrder
);

// =========================================================
// MY ORDERS
// GET /api/orders/my-orders
// =========================================================

router.get(
    "/my-orders",
    protect,
    getMyOrders
);

// =========================================================
// ADMIN - GET ALL ORDERS
// GET /api/orders
// =========================================================

router.get(
    "/",
    protect,
    admin,
    getAllOrders
);

// =========================================================
// GET SINGLE ORDER
// GET /api/orders/:id
// =========================================================

router.get(
    "/:id",
    protect,
    getOrder
);

// =========================================================
// ADMIN - UPDATE ORDER STATUS
// PUT /api/orders/:id/status
// =========================================================

router.put(
    "/:id/status",
    protect,
    admin,
    updateOrderStatus
);

// =========================================================
// ADMIN - UPDATE PAYMENT STATUS
// PUT /api/orders/:id/payment-status
// =========================================================

router.put(
    "/:id/payment-status",
    protect,
    admin,
    updatePaymentStatus
);

// =========================================================
// EXPORT
// =========================================================

module.exports = router;