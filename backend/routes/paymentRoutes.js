"use strict";
const express=require("express");
const router=express.Router();
const {protect}=require("../middleware/authMiddleware");
const {paymentConfig,createCheckoutSession,verifyCheckoutSession}=require("../controllers/paymentController");
router.get("/config",paymentConfig);
router.post("/create-checkout-session",protect,createCheckoutSession);
router.get("/verify/:sessionId",protect,verifyCheckoutSession);
module.exports=router;
