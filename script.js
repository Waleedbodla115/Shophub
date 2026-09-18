"use strict";

/* =========================================================
SHOPHUB - HOME PAGE SCRIPT
Recommended Products + Dark Mode
========================================================= */

(function () {

    /* =====================================================
       API BASE URL
       Local development -> localhost
       Live Vercel -> deployed backend
    ====================================================== */

    const API_BASE_URL =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
            ? "http://localhost:5000"
            : "https://shophub-bice.vercel.app";

    const PERSONALIZED_API =
        `${API_BASE_URL}/api/ai/personalized`;

    const WISHLIST_API =
        `${API_BASE_URL}/api/wishlist`;

    const RECENTLY_VIEWED_KEY = "recentlyViewed";
    const CART_KEY = "cart";
    const THEME_KEY = "theme";


    /* =====================================================
       DARK MODE
    ====================================================== */

    function initializeTheme() {

        const savedTheme =
            localStorage.getItem(THEME_KEY);

        if (savedTheme === "dark") {
            document.body.classList.add("dark-mode");
        } else {
            document.body.classList.remove("dark-mode");
        }

        updateThemeIcon();
    }


    function updateThemeIcon() {

        const themeToggle =
            document.getElementById("themeToggle");

        if (!themeToggle) {
            return;
        }

        const icon =
            themeToggle.querySelector("i");

        const isDark =
            document.body.classList.contains("dark-mode");

        if (icon) {

            icon.classList.remove(
                "fa-moon",
                "fa-sun"
            );

            icon.classList.add(
                isDark ? "fa-sun" : "fa-moon"
            );
        }

        themeToggle.setAttribute(
            "aria-label",
            isDark
                ? "Switch to light mode"
                : "Switch to dark mode"
        );

        themeToggle.setAttribute(
            "title",
            isDark
                ? "Switch to light mode"
                : "Switch to dark mode"
        );
    }


    function setupThemeToggle() {

        const themeToggle =
            document.getElementById("themeToggle");

        if (!themeToggle) {

            console.warn(
                "⚠️ ShopHub: #themeToggle not found."
            );

            return;
        }

        themeToggle.addEventListener(
            "click",
            function () {

                const isDark =
                    document.body.classList.toggle(
                        "dark-mode"
                    );

                localStorage.setItem(
                    THEME_KEY,
                    isDark ? "dark" : "light"
                );

                updateThemeIcon();
            }
        );

        updateThemeIcon();
    }


    /* =====================================================
       ESCAPE HTML
    ====================================================== */

    function escapeHtml(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* =====================================================
       TOAST
    ====================================================== */

    function showToast(message) {

        const toast =
            document.getElementById("toast");

        if (!toast) {
            return;
        }

        toast.textContent = message;

        toast.classList.add("show");

        clearTimeout(showToast._timer);

        showToast._timer = setTimeout(
            () => {
                toast.classList.remove("show");
            },
            2200
        );
    }


    /* =====================================================
       RECENTLY VIEWED
    ====================================================== */

    function getRecentlyViewedIds() {

        try {

            const viewed =
                JSON.parse(
                    localStorage.getItem(
                        RECENTLY_VIEWED_KEY
                    )
                );

            return Array.isArray(viewed)
                ? viewed
                : [];

        } catch (error) {

            return [];
        }
    }


    /* =====================================================
       CART IDS
    ====================================================== */

    function getCartIds() {

        try {

            const cart =
                JSON.parse(
                    localStorage.getItem(
                        CART_KEY
                    )
                );

            if (
                !cart ||
                typeof cart !== "object" ||
                Array.isArray(cart)
            ) {
                return [];
            }

            return Object.keys(cart);

        } catch (error) {

            return [];
        }
    }


    /* =====================================================
       WISHLIST IDS
    ====================================================== */

    async function getWishlistIds() {

        const token =
            localStorage.getItem(
                "authToken"
            );

        if (!token) {
            return [];
        }

        try {

            const response =
                await fetch(
                    WISHLIST_API,
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        }
                    }
                );

            const data =
                await response
                    .json()
                    .catch(() => ({}));

            if (
                !response.ok ||
                !data.success
            ) {
                return [];
            }

            return (
                data.wishlist ||
                data.items ||
                []
            ).map(
                (entry) =>
                    String(
                        entry.product?._id ||
                        entry.productId ||
                        entry._id ||
                        entry
                    )
            );

        } catch (error) {

            console.error(
                "❌ Wishlist fetch error (home page):",
                error
            );

            return [];
        }
    }


    /* =====================================================
       PRODUCT CARD
    ====================================================== */

    function createRecommendedCard(product) {

        const id =
            String(
                product._id ||
                product.id ||
                ""
            );

        const name =
            escapeHtml(
                product.name ||
                "Unnamed Product"
            );

        const price =
            (
                Number(product.price) ||
                0
            ).toFixed(2);

        const imageUrl =
            window.getProductImageUrl
                ? window.getProductImageUrl(
                    product.image
                )
                : "";

        return `
            <div class="col-6 col-md-4 col-lg-3">

                <div class="card h-100 shadow-sm recommended-card">

                    <a href="product/index.html?id=${encodeURIComponent(id)}">

                        <img
                            src="${imageUrl}"
                            class="card-img-top"
                            alt="${name}"
                            loading="lazy"
                        >

                    </a>

                    <div class="card-body d-flex flex-column">

                        <a
                            href="product/index.html?id=${encodeURIComponent(id)}"
                            class="text-decoration-none text-reset"
                        >

                            <h6 class="card-title mb-1">
                                ${name}
                            </h6>

                        </a>

                        <p class="fw-bold mb-3">
                            $${price}
                        </p>

                        <button
                            type="button"
                            class="btn btn-dark mt-auto recommended-add-btn"
                            data-id="${escapeHtml(id)}"
                        >
                            <i class="fas fa-cart-plus"></i>
                            Add
                        </button>

                    </div>

                </div>

            </div>
        `;
    }


    /* =====================================================
       LOAD RECOMMENDED PRODUCTS
    ====================================================== */

    async function loadRecommendedForYou() {

        const section =
            document.getElementById(
                "recommendedForYou"
            );

        const container =
            document.getElementById(
                "recommendedForYouGrid"
            );

        if (!section || !container) {
            return;
        }

        const [
            recentlyViewedIds,
            wishlistIds
        ] = await Promise.all([

            Promise.resolve(
                getRecentlyViewedIds()
            ),

            getWishlistIds()
        ]);

        const cartIds =
            getCartIds();

        try {

            const response =
                await fetch(
                    PERSONALIZED_API,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            recentlyViewedIds,
                            cartIds,
                            wishlistIds
                        })
                    }
                );

            const data =
                await response
                    .json()
                    .catch(() => ({}));

            if (
                !response.ok ||
                !data.success ||
                !data.products?.length
            ) {
                return;
            }

            container.innerHTML =
                data.products
                    .map(
                        createRecommendedCard
                    )
                    .join("");

            const heading =
                section.querySelector(
                    ".section-heading h2 strong"
                );

            if (heading) {

                heading.textContent =
                    data.basedOn === "activity"
                        ? "For You"
                        : "Top Picks";
            }

            section.classList.remove(
                "d-none"
            );


            /* =================================================
               ADD TO CART
            ================================================= */

            container.addEventListener(
                "click",
                function (event) {

                    const button =
                        event.target.closest(
                            ".recommended-add-btn"
                        );

                    if (!button) {
                        return;
                    }

                    const productId =
                        button.dataset.id;

                    if (
                        productId &&
                        typeof window.addToCart ===
                            "function"
                    ) {

                        const added =
                            window.addToCart(
                                productId
                            );

                        if (added) {

                            showToast(
                                "Added to cart"
                            );
                        }
                    }
                }
            );

        } catch (error) {

            console.error(
                "❌ Recommended for You error:",
                error
            );
        }
    }


    /* =====================================================
       RECOMMENDED STYLES
    ====================================================== */

    function injectRecommendedStyles() {

        if (
            document.getElementById(
                "shopHubRecommendedStyles"
            )
        ) {
            return;
        }

        const style =
            document.createElement(
                "style"
            );

        style.id =
            "shopHubRecommendedStyles";

        style.textContent = `

            .recommended-section {
                padding: 60px 0;
            }

            .recommended-card {
                border-radius: 16px;
                overflow: hidden;
                transition:
                    transform .2s ease,
                    box-shadow .2s ease,
                    background-color .2s ease,
                    border-color .2s ease;
            }

            .recommended-card:hover {
                transform: translateY(-4px);
                box-shadow:
                    0 12px 28px rgba(15,23,42,.10);
            }

            .recommended-card img {
                aspect-ratio: 1 / 1;
                object-fit: cover;
                width: 100%;
            }

            body.dark-mode .recommended-card {
                background: #172033;
                border-color: #263449;
                color: #f8fafc;
            }

            body.dark-mode .recommended-card .card-title,
            body.dark-mode .recommended-card p {
                color: #f8fafc;
            }

            body.dark-mode .recommended-card .text-reset {
                color: #f8fafc !important;
            }

            body.dark-mode .recommended-card .recommended-add-btn {
                background: #f8fafc;
                color: #0b1120;
                border-color: #f8fafc;
            }

            body.dark-mode .recommended-card .recommended-add-btn:hover {
                background: #dbeafe;
                border-color: #dbeafe;
            }

        `;

        document.head.appendChild(
            style
        );
    }


    /* =====================================================
       INIT
    ====================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        async function () {

            /* Dark mode first */
            initializeTheme();
            setupThemeToggle();

            /* Recommended styles */
            injectRecommendedStyles();

            /* Wait for products.js */
            if (window.productsReady) {
                await window.productsReady;
            }

            /* Load recommendations */
            loadRecommendedForYou();
        }
    );


})();