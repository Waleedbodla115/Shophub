"use strict";

const Order = require("../models/Order");

// =========================================================
// STRIPE SDK
// Only used here for webhook signature verification —
// the rest of this file talks to Stripe directly over REST
// (see stripeRequest below) and that pattern is unchanged.
// =========================================================

// IMPORTANT FIX:
// The Stripe SDK throws at construction time if given an empty
// string ("Neither apiKey nor config.authenticator provided").
// A placeholder like "sk_test_replace_with_your_own_key" is
// also not a real key — treat it as unset so checkout does not
// claim Stripe is enabled, and wrap construction so a bad key
// cannot crash the entire server (chat, orders, products).
function resolveStripeSecret() {
    const key = String(process.env.STRIPE_SECRET_KEY || "").trim();

    if (!key) {
        return "";
    }

    const lower = key.toLowerCase();

    if (
        lower.includes("replace") ||
        lower.includes("your_own") ||
        lower.includes("changeme") ||
        lower.includes("placeholder") ||
        key.includes("...")
    ) {
        return "";
    }

    if (!/^sk_(test|live)_/.test(key)) {
        return "";
    }

    return key;
}

function resolveWebhookSecret() {
    const secret = String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();

    if (!secret) {
        return "";
    }

    const lower = secret.toLowerCase();

    if (
        lower.includes("replace") ||
        lower.includes("your_own") ||
        lower.includes("changeme") ||
        lower.includes("placeholder")
    ) {
        return "";
    }

    return secret;
}

const STRIPE_SECRET = resolveStripeSecret();

let stripe = null;

if (STRIPE_SECRET) {
    try {
        stripe = require("stripe")(STRIPE_SECRET);
    } catch (error) {
        console.error(
            "❌ Invalid STRIPE_SECRET_KEY. Online payments disabled; other APIs still run.",
            error.message
        );
        stripe = null;
    }
}

// =========================================================
// STRIPE REQUEST HELPER
// =========================================================

const stripeRequest = async (endpoint, options = {}) => {
    const secret = STRIPE_SECRET || resolveStripeSecret();

    if (!secret) {
        throw new Error(
            "Online payment is not configured. Add a real STRIPE_SECRET_KEY (sk_test_... or sk_live_...) to backend/.env."
        );
    }

    const response = await fetch(
        `https://api.stripe.com/v1/${endpoint}`,
        {
            ...options,

            headers: {
                Authorization: `Bearer ${secret}`,
                ...(options.headers || {})
            }
        }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data?.error?.message ||
            "Payment provider request failed."
        );
    }

    return data;
};


// =========================================================
// STRIPE CONFIG
// =========================================================

const paymentConfig = async (req, res) => {

    res.json({
        success: true,
        enabled: Boolean(STRIPE_SECRET || resolveStripeSecret()),
        provider: "stripe"
    });

};


// =========================================================
// CREATE STRIPE CHECKOUT SESSION
// =========================================================

const createCheckoutSession = async (req, res) => {

    try {

        const { orderId } = req.body;

        if (!orderId) {

            return res.status(400).json({
                success: false,
                message: "Order ID is required."
            });

        }


        // -----------------------------------------------------
        // FIND ORDER
        // -----------------------------------------------------

        const order = await Order.findById(orderId);

        if (!order) {

            return res.status(404).json({
                success: false,
                message: "Order not found."
            });

        }


        // -----------------------------------------------------
        // CHECK OWNERSHIP
        // -----------------------------------------------------

        if (
            String(order.user) !== String(req.user._id) &&
            !req.user.isAdmin
        ) {

            return res.status(403).json({
                success: false,
                message:
                    "You are not allowed to pay for this order."
            });

        }


        // -----------------------------------------------------
        // COD DOES NOT NEED STRIPE
        // -----------------------------------------------------

        if (order.paymentMethod === "Cash on Delivery") {

            return res.status(400).json({
                success: false,
                message:
                    "Cash on Delivery does not require online payment."
            });

        }


        // -----------------------------------------------------
        // ALREADY PAID CHECK
        // -----------------------------------------------------

        if (order.paymentStatus === "Paid") {

            return res.status(400).json({
                success: false,
                message: "This order has already been paid."
            });

        }


        // -----------------------------------------------------
        // FRONTEND URL
        // -----------------------------------------------------

        const baseUrl =
            process.env.FRONTEND_URL ||
            "http://127.0.0.1:5500";


        // -----------------------------------------------------
        // STRIPE CHECKOUT PARAMETERS
        // -----------------------------------------------------

        const params = new URLSearchParams();

        params.set(
            "mode",
            "payment"
        );

        params.set(
            "success_url",
            `${baseUrl}/checkout/success.html?order_id=${order._id}&session_id={CHECKOUT_SESSION_ID}`
        );

        params.set(
            "cancel_url",
            `${baseUrl}/checkout/index.html?payment_cancelled=1&order_id=${order._id}`
        );

        params.set(
            "customer_email",
            order.customerEmail
        );

        // -----------------------------------------------------
        // IMPORTANT:
        // Store ShopHub order ID in Stripe metadata
        // =========================================================
        // Set on BOTH the session and the underlying PaymentIntent.
        // The webhook's checkout.session.completed event carries
        // session-level metadata, but async payment methods surface
        // via payment_intent events too — having it on both means
        // the webhook handler can find the order either way.
        // -----------------------------------------------------

        params.set(
            "metadata[orderId]",
            String(order._id)
        );

        params.set(
            "payment_intent_data[metadata][orderId]",
            String(order._id)
        );


        // -----------------------------------------------------
        // STRIPE PRODUCT
        // -----------------------------------------------------

        params.set(
            "line_items[0][price_data][currency]",
            "usd"
        );

        params.set(
            "line_items[0][price_data][product_data][name]",
            `ShopHub Order ${String(order._id)
                .slice(-8)
                .toUpperCase()}`
        );

        params.set(
            "line_items[0][price_data][product_data][description]",
            `${order.items.length} product(s), including shipping/discount adjustments`
        );


        // -----------------------------------------------------
        // AMOUNT
        // -----------------------------------------------------

        const totalAmount =
            Math.round(Number(order.total) * 100);

        if (!Number.isFinite(totalAmount) || totalAmount <= 0) {

            return res.status(400).json({
                success: false,
                message: "Invalid order total."
            });

        }

        params.set(
            "line_items[0][price_data][unit_amount]",
            String(totalAmount)
        );

        params.set(
            "line_items[0][quantity]",
            "1"
        );


        // -----------------------------------------------------
        // CREATE STRIPE SESSION
        // -----------------------------------------------------

        const session = await stripeRequest(
            "checkout/sessions",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },

                body: params.toString()
            }
        );


        // -----------------------------------------------------
        // SAVE STRIPE SESSION ID IN ORDER
        // -----------------------------------------------------

        order.stripeSessionId = session.id;

        await order.save();


        // -----------------------------------------------------
        // RESPONSE
        // -----------------------------------------------------

        return res.status(201).json({

            success: true,

            url: session.url,

            sessionId: session.id,

            orderId: order._id

        });


    } catch (error) {

        console.error(
            "❌ Payment session error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Unable to create payment session."

        });

    }

};


// =========================================================
// VERIFY STRIPE CHECKOUT SESSION
// (still used by success.html as an immediate check —
// the webhook below is the reliable backup for this)
// =========================================================

const verifyCheckoutSession = async (req, res) => {

    try {

        const sessionId =
            req.params.sessionId;


        if (!sessionId) {

            return res.status(400).json({

                success: false,

                message:
                    "Stripe session ID is required."

            });

        }


        // -----------------------------------------------------
        // GET SESSION FROM STRIPE
        // -----------------------------------------------------

        const session =
            await stripeRequest(
                `checkout/sessions/${encodeURIComponent(sessionId)}`
            );


        const orderId =
            session.metadata?.orderId;


        // -----------------------------------------------------
        // ORDER ID CHECK
        // -----------------------------------------------------

        if (!orderId) {

            return res.status(400).json({

                success: false,

                message:
                    "Stripe session does not contain ShopHub order ID."

            });

        }


        // -----------------------------------------------------
        // FIND ORDER
        // -----------------------------------------------------

        const order =
            await Order.findById(orderId);


        if (!order) {

            return res.status(404).json({

                success: false,

                message:
                    "ShopHub order not found."

            });

        }


        // -----------------------------------------------------
        // CHECK USER OWNERSHIP
        // -----------------------------------------------------

        if (
            String(order.user) !== String(req.user._id) &&
            !req.user.isAdmin
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "You are not allowed to verify this payment."

            });

        }


        // -----------------------------------------------------
        // PAYMENT SUCCESS
        // -----------------------------------------------------

        const paid =
            session.payment_status === "paid";


        if (paid) {

            order.paymentStatus = "Paid";

            // Once online payment succeeds,
            // move order from Pending to Processing.

            if (
                order.status === "Pending"
            ) {

                order.status = "Processing";

            }

            await order.save();

        }


        // -----------------------------------------------------
        // RESPONSE
        // -----------------------------------------------------

        return res.json({

            success: true,

            paid,

            status: session.status,

            paymentStatus:
                session.payment_status,

            orderId:

                String(order._id),

            orderNumber:

                `SH-${String(order._id)
                    .slice(-8)
                    .toUpperCase()}`

        });


    } catch (error) {

        console.error(
            "❌ Payment verification error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Unable to verify payment."

        });

    }

};


// =========================================================
// STRIPE WEBHOOK HANDLER
// POST /api/payments/webhook
// Registered in server.js with express.raw() BEFORE
// express.json(), so req.body here is the raw Buffer
// Stripe's signature verification needs.
//
// This is the RELIABLE way payment status gets confirmed —
// it comes directly from Stripe's servers, so it still works
// even if the customer closes their browser before being
// redirected back to success.html.
// =========================================================

const stripeWebhookHandler = async (req, res) => {

    const signature =
        req.headers["stripe-signature"];

    const webhookSecret =
        resolveWebhookSecret();

    let event;


    // =====================================================
    // VERIFY SIGNATURE
    // =====================================================

    try {

        if (!webhookSecret) {

            throw new Error(
                "STRIPE_WEBHOOK_SECRET is not set in backend/.env."
            );

        }

        if (!stripe) {

            throw new Error(
                "STRIPE_SECRET_KEY is not set in backend/.env."
            );

        }

        event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            webhookSecret
        );

    } catch (error) {

        console.error(
            "❌ Webhook signature verification failed:",
            error.message
        );

        return res.status(400).send(
            `Webhook Error: ${error.message}`
        );

    }


    // =====================================================
    // HELPER: mark an order Paid from a Stripe object
    // that carries metadata.orderId (session or PaymentIntent)
    // =====================================================

    const markOrderPaid = async (metadata) => {

        const orderId = metadata?.orderId;

        if (!orderId) {
            return;
        }

        const order = await Order.findById(orderId);

        if (!order) {
            return;
        }

        if (order.paymentStatus !== "Paid") {

            order.paymentStatus = "Paid";

            if (order.status === "Pending") {
                order.status = "Processing";
            }

            await order.save();

            console.log(
                `✅ Webhook: order ${orderId} marked Paid.`
            );

        }

    };

    const markOrderFailed = async (metadata) => {

        const orderId = metadata?.orderId;

        if (!orderId) {
            return;
        }

        const order = await Order.findById(orderId);

        if (!order) {
            return;
        }

        if (order.paymentStatus !== "Paid") {

            order.paymentStatus = "Failed";

            await order.save();

            console.log(
                `⚠️ Webhook: order ${orderId} marked Failed.`
            );

        }

    };


    // =====================================================
    // HANDLE EVENT TYPES
    // =====================================================

    try {

        switch (event.type) {

            case "checkout.session.completed":
            case "checkout.session.async_payment_succeeded": {

                const session = event.data.object;

                await markOrderPaid(session.metadata);

                break;

            }

            case "checkout.session.async_payment_failed": {

                const session = event.data.object;

                await markOrderFailed(session.metadata);

                break;

            }

            case "payment_intent.payment_failed": {

                const intent = event.data.object;

                await markOrderFailed(intent.metadata);

                break;

            }

            default: {

                // Unhandled event types are fine to ignore —
                // Stripe sends many event types we don't need.

                break;

            }

        }

    } catch (error) {

        console.error(
            "❌ Webhook order update error:",
            error
        );

        // Still return 200 so Stripe doesn't keep retrying
        // for an error on our side that a retry won't fix.
        // (Change to 500 only if you want Stripe to retry.)

    }


    // =====================================================
    // ACKNOWLEDGE RECEIPT
    // =====================================================

    return res.status(200).json({
        received: true
    });

};


// =========================================================
// EXPORT
// =========================================================

module.exports = {

    paymentConfig,

    createCheckoutSession,

    verifyCheckoutSession,

    stripeWebhookHandler

};