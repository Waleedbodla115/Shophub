"use strict";

const jwt = require("jsonwebtoken");
const User = require("../models/User");


// =========================================================
// AUTHENTICATE USER
// =========================================================

const protect = async (req, res, next) => {

    try {

        const authHeader = req.headers.authorization;

        // -------------------------------------------------
        // CHECK AUTHORIZATION HEADER
        // -------------------------------------------------

        if (
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ) {

            return res.status(401).json({
                success: false,
                message: "Authentication required. Please login."
            });

        }

        // -------------------------------------------------
        // GET TOKEN
        // -------------------------------------------------

        const token = authHeader.split(" ")[1];

        if (!token) {

            return res.status(401).json({
                success: false,
                message: "Authentication token missing."
            });

        }

        // -------------------------------------------------
        // VERIFY TOKEN
        // -------------------------------------------------

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // -------------------------------------------------
        // FIND USER
        // -------------------------------------------------

        const user = await User.findById(
            decoded.id
        ).select("-password");

        if (!user) {

            return res.status(401).json({
                success: false,
                message: "User no longer exists."
            });

        }

        // -------------------------------------------------
        // ATTACH USER
        // -------------------------------------------------

        req.user = user;

        next();

    } catch (error) {

        console.error(
            "❌ Auth Middleware Error:",
            error
        );

        if (error.name === "TokenExpiredError") {

            return res.status(401).json({
                success: false,
                message: "Your session has expired. Please login again."
            });

        }

        if (error.name === "JsonWebTokenError") {

            return res.status(401).json({
                success: false,
                message: "Invalid authentication token."
            });

        }

        return res.status(401).json({
            success: false,
            message: "Authentication failed."
        });

    }

};


// =========================================================
// ADMIN ONLY
// =========================================================

const admin = (req, res, next) => {

    if (!req.user) {

        return res.status(401).json({
            success: false,
            message: "Authentication required."
        });

    }

    if (!req.user.isAdmin) {

        return res.status(403).json({
            success: false,
            message: "Admin access required."
        });

    }

    next();

};


// =========================================================
// EXPORT
// =========================================================

module.exports = {
    protect,
    admin
};