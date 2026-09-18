"use strict";

const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const path = require("path");

dotenv.config();

const connectDB = require("./config/db");

// =========================================================
// ROUTES
// =========================================================

const productRoutes = require("./routes/productRoutes");
const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const chatRoutes = require("./routes/chatRoutes");
const aiRoutes = require("./routes/aiRoutes");

// =========================================================
// WEBHOOK CONTROLLER
// =========================================================

const {
    stripeWebhookHandler
} = require("./controllers/paymentController");

// =========================================================
// APP
// =========================================================

const app = express();

const PORT = process.env.PORT || 5000;

// =========================================================
// ENVIRONMENT CHECK
// Does NOT print the secret itself
// =========================================================

console.log(
    "JWT_SECRET available:",
    Boolean(process.env.JWT_SECRET)
);

console.log(
    "MONGO_URI available:",
    Boolean(process.env.MONGO_URI)
);

// =========================================================
// DATABASE
// =========================================================

connectDB();

// =========================================================
// STRIPE WEBHOOK
// MUST be before express.json()
// =========================================================

app.post(
    "/api/payments/webhook",
    express.raw({
        type: "application/json"
    }),
    stripeWebhookHandler
);

// =========================================================
// JSON BODY PARSER
// =========================================================

app.use(
    express.json()
);

app.use(
    express.urlencoded({
        extended: true
    })
);

// =========================================================
// CORS
// =========================================================

app.use(
    cors({
        origin: true,
        exposedHeaders: [
            "X-AI-Products"
        ]
    })
);

// =========================================================
// STATIC IMAGES
// DO NOT CHANGE /images PATH
// =========================================================

app.use(
    "/images",
    express.static(
        path.join(
            __dirname,
            "images"
        )
    )
);

// =========================================================
// TEST ROUTE
// =========================================================

app.get(
    "/",
    (req, res) => {
        res.status(200).json({
            success: true,
            message:
                "ShopHub Backend API is running"
        });
    }
);

// =========================================================
// AUTH API
// =========================================================

app.use(
    "/api/auth",
    authRoutes
);

// =========================================================
// PRODUCT API
// =========================================================

app.use(
    "/api/products",
    productRoutes
);

// =========================================================
// ORDER API
// =========================================================

app.use(
    "/api/orders",
    orderRoutes
);

// =========================================================
// PAYMENT API
// =========================================================

app.use(
    "/api/payments",
    paymentRoutes
);

// =========================================================
// WISHLIST API
// =========================================================

app.use(
    "/api/wishlist",
    wishlistRoutes
);

// =========================================================
// AI CHAT API
// =========================================================

app.use(
    "/api/chat",
    chatRoutes
);

// =========================================================
// AI PRODUCT FINDER + RECOMMENDATIONS API
// =========================================================

app.use(
    "/api/ai",
    aiRoutes
);

// =========================================================
// 404 HANDLER
// =========================================================

app.use(
    (req, res) => {
        res.status(404).json({
            success: false,
            message:
                `Route not found: ${req.method} ${req.originalUrl}`
        });
    }
);

// =========================================================
// ERROR HANDLER
// =========================================================

app.use(
    (error, req, res, next) => {
        console.error(
            "❌ Server Error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Internal server error",
            error:
                error.message
        });
    }
);

// =========================================================
// LOCAL SERVER
// Vercel handles production automatically
// =========================================================

if (require.main === module) {
    app.listen(
        PORT,
        () => {
            console.log(
                "================================="
            );

            console.log(
                "🚀 ShopHub Backend Started"
            );

            console.log(
                `📡 Server: http://localhost:${PORT}`
            );

            console.log(
                "================================="
            );
        }
    );
}

// =========================================================
// EXPORT APP FOR VERCEL
// =========================================================

module.exports = app;