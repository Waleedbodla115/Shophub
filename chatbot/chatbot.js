/* =========================================================
   SHOPHUB - SHOPPY AI CHATBOT
   Frontend chatbot
   Backend: http://localhost:5000/api/chat
   ========================================================= */

(function () {
    "use strict";

    /* =========================================================
       CONFIG
       ========================================================= */

    const CHAT_API_URL = "http://localhost:5000/api/chat";

    let chatHistory = [];
    let isSending = false;

    /* =========================================================
       CREATE CHATBOT UI
       ========================================================= */

    function createShoppy() {
        if (document.getElementById("shoppy-widget")) {
            return;
        }

        const widget = document.createElement("div");
        widget.id = "shoppy-widget";

        widget.innerHTML = `
            <button id="shoppy-toggle" aria-label="Open Shoppy AI">
                <span class="shoppy-toggle-icon">🤖</span>
            </button>

            <div id="shoppy-panel">

                <div class="shoppy-header">
                    <div>
                        <div class="shoppy-title">
                            Shoppy · ShopHub
                        </div>

                        <div class="shoppy-status">
                            <span class="shoppy-online-dot"></span>
                            AI Shopping Assistant
                        </div>
                    </div>

                    <button
                        id="shoppy-close"
                        class="shoppy-close"
                        aria-label="Close chatbot"
                    >
                        ×
                    </button>
                </div>

                <div
                    id="shoppy-messages"
                    class="shoppy-messages"
                >
                    <div class="shoppy-message shoppy-bot-message">

                        <div class="shoppy-avatar">
                            🤖
                        </div>

                        <div class="shoppy-bubble shoppy-bot-bubble">
                            Hi! I'm Shoppy 👋
                            <br>
                            Tell me what you're looking for and
                            I'll find matching products from the
                            ShopHub catalog.
                        </div>

                    </div>
                </div>

                <div class="shoppy-suggestions">

                    <button
                        type="button"
                        data-question="Show me products under $100"
                    >
                        Under $100
                    </button>

                    <button
                        type="button"
                        data-question="Show me the best rated products"
                    >
                        ⭐ Best rated
                    </button>

                    <button
                        type="button"
                        data-question="Show me electronics"
                    >
                        Electronics
                    </button>

                    <button
                        type="button"
                        data-question="Show me men's products"
                    >
                        Men's
                    </button>

                </div>

                <div class="shoppy-input-area">

                    <input
                        id="shoppy-input"
                        type="text"
                        placeholder="Ask Shoppy anything..."
                        autocomplete="off"
                    />

                    <button
                        id="shoppy-send"
                        type="button"
                        aria-label="Send message"
                    >
                        ➤
                    </button>

                </div>

            </div>
        `;

        document.body.appendChild(widget);

        addShoppyStyles();
        setupShoppyEvents();
    }

    /* =========================================================
       CSS
       ========================================================= */

    function addShoppyStyles() {
        if (document.getElementById("shoppy-styles")) {
            return;
        }

        const style = document.createElement("style");
        style.id = "shoppy-styles";

        style.textContent = `
            #shoppy-widget {
                position: fixed;
                right: 24px;
                bottom: 24px;
                z-index: 999999;
                font-family: Arial, Helvetica, sans-serif;
            }

            #shoppy-toggle {
                width: 62px;
                height: 62px;
                border: none;
                border-radius: 50%;
                background: #111827;
                color: white;
                cursor: pointer;
                box-shadow: 0 8px 25px rgba(0,0,0,.25);
                font-size: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: .2s ease;
            }

            #shoppy-toggle:hover {
                transform: scale(1.07);
            }

            .shoppy-toggle-icon {
                line-height: 1;
            }

            #shoppy-panel {
                position: absolute;
                right: 0;
                bottom: 76px;
                width: 390px;
                height: 620px;
                background: #ffffff;
                border-radius: 18px;
                box-shadow: 0 18px 55px rgba(0,0,0,.25);
                overflow: hidden;
                display: none;
                flex-direction: column;
                border: 1px solid #e5e7eb;
            }

            #shoppy-panel.active {
                display: flex;
            }

            .shoppy-header {
                min-height: 70px;
                padding: 14px 16px;
                background: #111827;
                color: white;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .shoppy-title {
                font-size: 16px;
                font-weight: 700;
            }

            .shoppy-status {
                margin-top: 5px;
                font-size: 12px;
                opacity: .85;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .shoppy-online-dot {
                width: 7px;
                height: 7px;
                border-radius: 50%;
                background: #22c55e;
                display: inline-block;
            }

            .shoppy-close {
                width: 32px;
                height: 32px;
                border: none;
                background: transparent;
                color: white;
                font-size: 26px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .shoppy-messages {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                background: #f8fafc;
            }

            .shoppy-message {
                display: flex;
                gap: 8px;
                margin-bottom: 14px;
                align-items: flex-start;
            }

            .shoppy-user-message {
                justify-content: flex-end;
            }

            .shoppy-avatar {
                width: 30px;
                height: 30px;
                min-width: 30px;
                border-radius: 50%;
                background: #e5e7eb;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
            }

            .shoppy-bubble {
                max-width: 78%;
                padding: 10px 13px;
                border-radius: 13px;
                font-size: 14px;
                line-height: 1.5;
                background: white;
                color: #1f2937;
                box-shadow: 0 1px 4px rgba(0,0,0,.08);
            }

            .shoppy-user-bubble {
                background: #111827;
                color: white;
                border-bottom-right-radius: 4px;
            }

            .shoppy-bot-bubble {
                border-bottom-left-radius: 4px;
            }

            .shoppy-suggestions {
                padding: 9px 10px;
                display: flex;
                gap: 7px;
                overflow-x: auto;
                background: white;
                border-top: 1px solid #e5e7eb;
            }

            .shoppy-suggestions button {
                flex-shrink: 0;
                border: 1px solid #d1d5db;
                background: white;
                color: #374151;
                border-radius: 20px;
                padding: 7px 11px;
                font-size: 12px;
                cursor: pointer;
            }

            .shoppy-suggestions button:hover {
                background: #f3f4f6;
            }

            .shoppy-input-area {
                display: flex;
                gap: 8px;
                padding: 11px;
                background: white;
                border-top: 1px solid #e5e7eb;
            }

            #shoppy-input {
                flex: 1;
                min-width: 0;
                border: 1px solid #d1d5db;
                border-radius: 22px;
                padding: 11px 14px;
                outline: none;
                font-size: 14px;
            }

            #shoppy-input:focus {
                border-color: #6b7280;
            }

            #shoppy-send {
                width: 42px;
                height: 42px;
                border: none;
                border-radius: 50%;
                background: #111827;
                color: white;
                cursor: pointer;
                font-size: 17px;
            }

            #shoppy-send:disabled {
                opacity: .5;
                cursor: not-allowed;
            }

            .shoppy-typing {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 8px 4px;
            }

            .shoppy-typing span {
                width: 7px;
                height: 7px;
                border-radius: 50%;
                background: #9ca3af;
                animation: shoppyTyping 1.2s infinite;
            }

            .shoppy-typing span:nth-child(2) {
                animation-delay: .15s;
            }

            .shoppy-typing span:nth-child(3) {
                animation-delay: .3s;
            }

            @keyframes shoppyTyping {
                0%, 60%, 100% {
                    transform: translateY(0);
                }

                30% {
                    transform: translateY(-5px);
                }
            }

            .shoppy-products {
                width: 100%;
                margin-top: 10px;
                display: flex;
                flex-direction: column;
                gap: 9px;
            }

            .shoppy-product-card {
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 12px;
                padding: 9px;
                box-shadow: 0 2px 7px rgba(0,0,0,.06);
            }

            .shoppy-product-image {
                width: 100%;
                height: 125px;
                object-fit: cover;
                border-radius: 9px;
                background: #f3f4f6;
            }

            .shoppy-product-category {
                margin-top: 7px;
                font-size: 10px;
                text-transform: uppercase;
                color: #6b7280;
                letter-spacing: .4px;
            }

            .shoppy-product-name {
                margin-top: 3px;
                font-size: 14px;
                font-weight: 700;
                color: #111827;
            }

            .shoppy-product-price {
                margin-top: 5px;
                font-size: 15px;
                font-weight: 700;
                color: #111827;
            }

            .shoppy-product-meta {
                margin-top: 4px;
                font-size: 11px;
                color: #6b7280;
            }

            .shoppy-product-actions {
                display: flex;
                gap: 6px;
                margin-top: 8px;
            }

            .shoppy-product-actions button {
                flex: 1;
                padding: 7px 8px;
                border-radius: 7px;
                border: 1px solid #d1d5db;
                background: white;
                cursor: pointer;
                font-size: 11px;
            }

            .shoppy-product-actions button:last-child {
                background: #111827;
                color: white;
                border-color: #111827;
            }

            @media (max-width: 520px) {
                #shoppy-widget {
                    right: 12px;
                    bottom: 12px;
                }

                #shoppy-panel {
                    width: calc(100vw - 24px);
                    height: min(620px, 78vh);
                }
            }
        `;

        document.head.appendChild(style);
    }

    /* =========================================================
       EVENTS
       ========================================================= */

    function setupShoppyEvents() {
        const toggle = document.getElementById("shoppy-toggle");
        const close = document.getElementById("shoppy-close");
        const input = document.getElementById("shoppy-input");
        const send = document.getElementById("shoppy-send");

        if (!toggle || !close || !input || !send) {
            console.error("❌ Shoppy UI elements not found");
            return;
        }

        toggle.addEventListener("click", toggleShoppy);

        close.addEventListener("click", closeShoppy);

        send.addEventListener("click", function () {
            sendShoppyMessage();
        });

        input.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                sendShoppyMessage();
            }
        });

        document
            .querySelectorAll(".shoppy-suggestions button")
            .forEach(function (button) {
                button.addEventListener("click", function () {
                    const question = button.dataset.question;

                    if (!question || isSending) {
                        return;
                    }

                    sendShoppyMessage(question);
                });
            });
    }

    /* =========================================================
       OPEN / CLOSE
       ========================================================= */

    function toggleShoppy() {
        const panel = document.getElementById("shoppy-panel");

        if (!panel) {
            return;
        }

        panel.classList.toggle("active");

        if (panel.classList.contains("active")) {
            setTimeout(function () {
                document
                    .getElementById("shoppy-input")
                    ?.focus();
            }, 100);
        }
    }

    function closeShoppy() {
        const panel = document.getElementById("shoppy-panel");

        if (panel) {
            panel.classList.remove("active");
        }
    }

    /* =========================================================
       SEND MESSAGE
       ========================================================= */

    async function sendShoppyMessage(customText = null) {
        if (isSending) {
            return;
        }

        const input = document.getElementById("shoppy-input");

        if (!input) {
            console.error("❌ Shoppy input not found");
            return;
        }

        const text = (
            customText !== null
                ? String(customText)
                : input.value
        ).trim();

        if (!text) {
            return;
        }

        isSending = true;

        input.value = "";

        addUserMessage(text);

        chatHistory.push({
            role: "user",
            content: text
        });

        showTyping();
        setSendingState(true);

        /*
         * IMPORTANT:
         * Do NOT use AbortSignal.timeout(20000).
         *
         * Ollama can sometimes take longer on the first request.
         * We use AbortController with a 60-second timeout.
         */

        const controller = new AbortController();

        const timeoutId = setTimeout(function () {
            console.warn(
                "⚠️ Shoppy request timed out after 60 seconds"
            );

            controller.abort();
        }, 60000);

        try {
            console.log("🤖 Sending message to Shoppy...");
            console.log("📡 API:", CHAT_API_URL);

            const response = await fetch(CHAT_API_URL, {
                method: "POST",

                signal: controller.signal,

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },

                body: JSON.stringify({
                    message: text,
                    history: chatHistory.slice(-12),
                    stream: false
                })
            });

            clearTimeout(timeoutId);

            console.log(
                "✅ Backend HTTP Status:",
                response.status
            );

            if (!response.ok) {
                let errorMessage =
                    `Server error (${response.status})`;

                try {
                    const errorText = await response.text();

                    if (errorText) {
                        try {
                            const errorData =
                                JSON.parse(errorText);

                            if (errorData?.message) {
                                errorMessage =
                                    errorData.message;
                            } else if (errorData?.error) {
                                errorMessage =
                                    errorData.error;
                            }
                        } catch {
                            errorMessage = errorText;
                        }
                    }
                } catch (error) {
                    console.warn(
                        "Could not read server error:",
                        error
                    );
                }

                throw new Error(errorMessage);
            }

            hideTyping();

            const contentType =
                response.headers.get("content-type") || "";

            console.log(
                "📦 Response Content-Type:",
                contentType
            );

            /*
             * Backend may return text/plain if stream mode
             * is ever enabled.
             */

            if (
                contentType.includes("text/plain") ||
                contentType.includes("text/event-stream")
            ) {
                await readStreamingResponse(response);
                return;
            }

            /*
             * Normal backend response:
             *
             * {
             *   success: true,
             *   reply: "...",
             *   products: [...]
             * }
             */

            const rawText = await response.text();

            console.log(
                "📥 Backend Response:",
                rawText
            );

            if (!rawText.trim()) {
                throw new Error(
                    "Backend returned an empty response."
                );
            }

            let data;

            try {
                data = JSON.parse(rawText);
            } catch (parseError) {
                console.error(
                    "❌ JSON Parse Error:",
                    parseError
                );

                console.error(
                    "Raw backend response:",
                    rawText
                );

                throw new Error(
                    "Invalid response received from backend."
                );
            }

            console.log(
                "✅ Parsed AI Response:",
                data
            );

            const reply =
                data.reply ||
                data.message ||
                data.response ||
                "Sorry, I couldn't find a response.";

            const products =
                Array.isArray(data.products)
                    ? data.products
                    : [];

            addBotMessage(
                reply,
                products
            );

            chatHistory.push({
                role: "assistant",
                content: reply
            });

        } catch (error) {
            clearTimeout(timeoutId);

            console.error(
                "❌ Shoppy Chat Error:",
                error
            );

            hideTyping();

            let errorMessage =
                "Sorry, Shoppy couldn't connect to the ShopHub AI service.";

            if (
                error?.name === "AbortError" ||
                error?.name === "TimeoutError"
            ) {
                errorMessage =
                    "⏱️ Shoppy is taking too long to respond. Please try again.";
            } else if (
                error?.message
                    ?.toLowerCase()
                    .includes("failed to fetch")
            ) {
                errorMessage =
                    "🔌 Shoppy couldn't connect to the backend. Please make sure the ShopHub backend is running on port 5000.";
            } else if (error?.message) {
                errorMessage =
                    `❌ ${error.message}`;
            }

            addBotMessage(errorMessage);

        } finally {
            setSendingState(false);

            isSending = false;

            const inputField =
                document.getElementById("shoppy-input");

            if (inputField) {
                inputField.focus();
            }
        }
    }

    /* =========================================================
       STREAMING RESPONSE
       ========================================================= */

    async function readStreamingResponse(response) {
        if (!response.body) {
            throw new Error(
                "Streaming response body is unavailable."
            );
        }

        const reader = response.body.getReader();

        const decoder = new TextDecoder("utf-8");

        let reply = "";

        const messageElement =
            createStreamingBotMessage();

        const bubble =
            messageElement.querySelector(
                ".shoppy-bubble"
            );

        try {
            while (true) {
                const {
                    value,
                    done
                } = await reader.read();

                if (done) {
                    break;
                }

                const chunk =
                    decoder.decode(
                        value,
                        {
                            stream: true
                        }
                    );

                reply += chunk;

                bubble.innerHTML =
                    formatBotText(reply);

                scrollMessagesToBottom();
            }

            const remaining =
                decoder.decode();

            if (remaining) {
                reply += remaining;

                bubble.innerHTML =
                    formatBotText(reply);
            }

            let products = [];

            const productHeader =
                response.headers.get(
                    "X-AI-Products"
                );

            if (productHeader) {
                try {
                    products =
                        JSON.parse(productHeader);
                } catch (error) {
                    console.warn(
                        "Could not parse X-AI-Products",
                        error
                    );
                }
            }

            if (
                Array.isArray(products) &&
                products.length > 0
            ) {
                appendProductsToMessage(
                    messageElement,
                    products
                );
            }

            chatHistory.push({
                role: "assistant",
                content: reply
            });

        } catch (error) {
            console.error(
                "❌ Streaming Error:",
                error
            );

            if (!reply) {
                bubble.textContent =
                    "Shoppy didn't return a response.";
            }
        }
    }

    /* =========================================================
       ADD USER MESSAGE
       ========================================================= */

    function addUserMessage(text) {
        const container =
            document.getElementById(
                "shoppy-messages"
            );

        if (!container) {
            return;
        }

        const message =
            document.createElement("div");

        message.className =
            "shoppy-message shoppy-user-message";

        message.innerHTML = `
            <div class="shoppy-bubble shoppy-user-bubble">
                ${escapeHtml(text)}
            </div>
        `;

        container.appendChild(message);

        scrollMessagesToBottom();
    }

    /* =========================================================
       ADD BOT MESSAGE
       ========================================================= */

    function addBotMessage(
        text,
        products = []
    ) {
        const container =
            document.getElementById(
                "shoppy-messages"
            );

        if (!container) {
            return;
        }

        const message =
            document.createElement("div");

        message.className =
            "shoppy-message shoppy-bot-message";

        message.innerHTML = `
            <div class="shoppy-avatar">
                🤖
            </div>

            <div class="shoppy-bubble shoppy-bot-bubble">
                ${formatBotText(text)}
            </div>
        `;

        container.appendChild(message);

        if (
            Array.isArray(products) &&
            products.length > 0
        ) {
            appendProductsToMessage(
                message,
                products
            );
        }

        scrollMessagesToBottom();
    }

    /* =========================================================
       STREAMING BOT MESSAGE
       ========================================================= */

    function createStreamingBotMessage() {
        const container =
            document.getElementById(
                "shoppy-messages"
            );

        const message =
            document.createElement("div");

        message.className =
            "shoppy-message shoppy-bot-message";

        message.innerHTML = `
            <div class="shoppy-avatar">
                🤖
            </div>

            <div class="shoppy-bubble shoppy-bot-bubble"></div>
        `;

        container.appendChild(message);

        return message;
    }

    /* =========================================================
       PRODUCT CARDS
       ========================================================= */

    function appendProductsToMessage(
        messageElement,
        products
    ) {
        if (
            !Array.isArray(products) ||
            products.length === 0
        ) {
            return;
        }

        const wrapper =
            document.createElement("div");

        wrapper.className =
            "shoppy-products";

        products.forEach(function (product) {
            if (!product) {
                return;
            }

            const card =
                createShoppyProductCard(product);

            wrapper.appendChild(card);
        });

        messageElement.appendChild(wrapper);

        scrollMessagesToBottom();
    }

    /*
     * IMPORTANT:
     *
     * This is intentionally called
     * createShoppyProductCard instead of
     * createProductCard.
     *
     * This prevents conflict with shop.js.
     */

    function createShoppyProductCard(product) {
        const card =
            document.createElement("div");

        card.className =
            "shoppy-product-card";

        const id =
            product.id ||
            product._id ||
            "";

        const name =
            product.name ||
            "ShopHub Product";

        const category =
            product.category ||
            "";

        const price =
            Number(product.price || 0);

        const rating =
            Number(product.rating || 0);

        const stock =
            Number(product.stock || 0);

        const image =
            getProductImageUrl(
                product.image
            );

        card.innerHTML = `
            ${
                image
                    ? `
                        <img
                            class="shoppy-product-image"
                            src="${escapeHtml(image)}"
                            alt="${escapeHtml(name)}"
                            loading="lazy"
                            onerror="this.style.display='none'"
                        />
                    `
                    : ""
            }

            <div class="shoppy-product-category">
                ${escapeHtml(category)}
            </div>

            <div class="shoppy-product-name">
                ${escapeHtml(name)}
            </div>

            <div class="shoppy-product-price">
                $${price.toFixed(2)}
            </div>

            <div class="shoppy-product-meta">
                ⭐ ${rating.toFixed(1)}
                · Stock: ${stock}
            </div>

            <div class="shoppy-product-actions">

                <button
                    type="button"
                    class="shoppy-view-product"
                >
                    View Product
                </button>

                <button
                    type="button"
                    class="shoppy-add-cart"
                >
                    Add to Cart
                </button>

            </div>
        `;

        const viewButton =
            card.querySelector(
                ".shoppy-view-product"
            );

        const cartButton =
            card.querySelector(
                ".shoppy-add-cart"
            );

        if (viewButton) {
            viewButton.addEventListener(
                "click",
                function () {
                    openProductFromAI(id);
                }
            );
        }

        if (cartButton) {
            cartButton.addEventListener(
                "click",
                function () {
                    addAIProductToCart(product);
                }
            );
        }

        return card;
    }

    /* =========================================================
       PRODUCT IMAGE URL
       ========================================================= */

    function getProductImageUrl(image) {
        if (!image) {
            return "";
        }

        let value =
            String(image).trim();

        if (!value) {
            return "";
        }

        /*
         * Already full URL
         */

        if (
            value.startsWith("http://") ||
            value.startsWith("https://")
        ) {
            return value;
        }

        /*
         * Remove leading slash
         */

        value =
            value.replace(/^\/+/, "");

        /*
         * Already starts with images/
         */

        if (
            value.toLowerCase().startsWith("images/")
        ) {
            return `http://localhost:5000/${value}`;
        }

        /*
         * Normal backend image
         */

        return `http://localhost:5000/images/${value}`;
    }

    /* =========================================================
       ADD AI PRODUCT TO CART
       ========================================================= */

    function addAIProductToCart(product) {
        const id =
            product.id ||
            product._id;

        if (!id) {
            console.warn(
                "❌ Product ID missing"
            );

            return;
        }

        /*
         * Use existing shop.js cart function
         * when available.
         */

        if (
            typeof window.addToCart ===
            "function"
        ) {
            try {
                window.addToCart(
                    String(id),
                    1
                );

                showTemporaryMessage(
                    "Added to cart ✓"
                );

                return;

            } catch (error) {
                console.warn(
                    "window.addToCart failed:",
                    error
                );
            }
        }

        /*
         * Fallback localStorage cart
         */

        try {
            const cart =
                JSON.parse(
                    localStorage.getItem("cart") ||
                    "{}"
                );

            const key =
                String(id);

            if (cart[key]) {
                cart[key].quantity =
                    Number(
                        cart[key].quantity || 0
                    ) + 1;
            } else {
                cart[key] = {
                    id: key,
                    _id: key,

                    name:
                        product.name ||
                        "Product",

                    price:
                        Number(
                            product.price || 0
                        ),

                    image:
                        product.image ||
                        "",

                    quantity: 1
                };
            }

            localStorage.setItem(
                "cart",
                JSON.stringify(cart)
            );

            if (
                typeof window.updateCartCountBadges ===
                "function"
            ) {
                window.updateCartCountBadges();
            }

            showTemporaryMessage(
                "Added to cart ✓"
            );

        } catch (error) {
            console.error(
                "❌ Cart error:",
                error
            );
        }
    }

    /* =========================================================
       VIEW PRODUCT
       ========================================================= */

    function openProductFromAI(productId) {
        if (!productId) {
            return;
        }

        /*
         * Use existing product modal when available.
         */

        if (
            typeof window.openProductModal ===
            "function"
        ) {
            try {
                window.openProductModal(
                    productId
                );

                return;

            } catch (error) {
                console.warn(
                    "openProductModal failed:",
                    error
                );
            }
        }

        /*
         * Fallback
         */

        window.location.href =
            `/product.html?id=${encodeURIComponent(
                productId
            )}`;
    }

    /* =========================================================
       TYPING INDICATOR
       ========================================================= */

    function showTyping() {
        hideTyping();

        const container =
            document.getElementById(
                "shoppy-messages"
            );

        if (!container) {
            return;
        }

        const typing =
            document.createElement("div");

        typing.id =
            "shoppy-typing-message";

        typing.className =
            "shoppy-message shoppy-bot-message";

        typing.innerHTML = `
            <div class="shoppy-avatar">
                🤖
            </div>

            <div class="shoppy-bubble">
                <div class="shoppy-typing">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;

        container.appendChild(typing);

        scrollMessagesToBottom();
    }

    function hideTyping() {
        document
            .getElementById(
                "shoppy-typing-message"
            )
            ?.remove();
    }

    /* =========================================================
       BUTTON / INPUT STATE
       ========================================================= */

    function setSendingState(sending) {
        const input =
            document.getElementById(
                "shoppy-input"
            );

        const button =
            document.getElementById(
                "shoppy-send"
            );

        if (input) {
            input.disabled = sending;
        }

        if (button) {
            button.disabled = sending;
        }
    }

    /* =========================================================
       SCROLL
       ========================================================= */

    function scrollMessagesToBottom() {
        const container =
            document.getElementById(
                "shoppy-messages"
            );

        if (!container) {
            return;
        }

        requestAnimationFrame(function () {
            container.scrollTop =
                container.scrollHeight;
        });
    }

    /* =========================================================
       TEXT FORMATTER
       ========================================================= */

    function formatBotText(text) {
        if (!text) {
            return "";
        }

        let value =
            escapeHtml(
                String(text)
            );

        /*
         * Bold:
         * **text**
         */

        value =
            value.replace(
                /\*\*(.*?)\*\*/g,
                "<strong>$1</strong>"
            );

        /*
         * Italic:
         * *text*
         */

        value =
            value.replace(
                /(?<!\*)\*([^*]+)\*(?!\*)/g,
                "<em>$1</em>"
            );

        /*
         * New lines
         */

        value =
            value.replace(
                /\r?\n/g,
                "<br>"
            );

        return value;
    }

    /* =========================================================
       HTML ESCAPE
       ========================================================= */

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /* =========================================================
       TEMP MESSAGE
       ========================================================= */

    function showTemporaryMessage(text) {
        const container =
            document.getElementById(
                "shoppy-messages"
            );

        if (!container) {
            return;
        }

        const message =
            document.createElement("div");

        message.className =
            "shoppy-message shoppy-bot-message";

        message.innerHTML = `
            <div class="shoppy-avatar">
                🤖
            </div>

            <div class="shoppy-bubble shoppy-bot-bubble">
                ${escapeHtml(text)}
            </div>
        `;

        container.appendChild(message);

        scrollMessagesToBottom();

        setTimeout(function () {
            message.remove();
        }, 2500);
    }

    /* =========================================================
       GLOBAL HELPER
       ========================================================= */

    window.openShoppyWithQuestion =
        function (question) {

            const panel =
                document.getElementById(
                    "shoppy-panel"
                );

            const input =
                document.getElementById(
                    "shoppy-input"
                );

            if (!panel) {
                return;
            }

            panel.classList.add("active");

            if (question) {
                sendShoppyMessage(question);
            } else {
                input?.focus();
            }
        };

    /* =========================================================
       START CHATBOT
       ========================================================= */

    function startShoppy() {
        createShoppy();

        console.log(
            "🤖 Shoppy AI Chatbot Ready"
        );
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            startShoppy
        );
    } else {
        startShoppy();
    }

})();