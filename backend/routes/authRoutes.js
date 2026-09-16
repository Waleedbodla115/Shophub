"use strict";

const express = require("express");

const router = express.Router();

const {
    registerUser,
    loginUser,
    getMe
} = require("../controllers/authControllers");

const {
    protect
} = require("../middleware/authMiddleware");


// =========================================================
// REGISTER
// POST /api/auth/register
// =========================================================

router.post(
    "/register",
    registerUser
);


// =========================================================
// LOGIN
// POST /api/auth/login
// =========================================================

router.post(
    "/login",
    loginUser
);


// =========================================================
// CURRENT USER
// GET /api/auth/me
// =========================================================

router.get(
    "/me",
    protect,
    getMe
);


module.exports = router;