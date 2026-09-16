
"use strict";

const express = require("express");

const router = express.Router();

const { sendMessage } = require("../controllers/chatController");

// =========================================================
// CHAT BODY PARSER
// =========================================================
// Server-level express.json() already exists in server.js.
// We also explicitly enable it here so this route always
// receives JSON request bodies correctly.
// =========================================================

router.use(express.json());

router.use(
    express.urlencoded({
        extended: true
    })
);

// =========================================================
// POST /api/chat
// Body:
// {
//     message: "show me electronics",
//     history: [],
//     stream: true
// }
// =========================================================

router.post("/", sendMessage);

module.exports = router;