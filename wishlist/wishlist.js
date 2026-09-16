"use strict";

/* =========================================================
SHOPHUB WISHLIST
========================================================= */

/* CART_KEY comes from products.js (shared catalog script) — do not redeclare it here */
const THEME_KEY = "theme";
const AUTH_TOKEN_KEY = "authToken";

const API_BASE_URL = "http://localhost:5000";
const IMAGE_BASE_URL = API_BASE_URL;
const WISHLIST_API_URL = `${API_BASE_URL}/api/wishlist`;

/* =========================================================
STATE

NOTE: the wishlist now lives on the backend (per-user,
tied to the logged-in account) instead of localStorage.
wishlistProducts holds the FULL product objects returned
by GET /api/wishlist (already populated by the backend),
so there is no need to match IDs against products.js
anymore — that's what the old "wishlistCatalog" /
"findProduct" matching step was for.
========================================================= */

let wishlistProducts = [];
let filteredProducts = [];

/* =========================================================
DOM
========================================================= */

const wishlistContainer =
    document.getElementById("wishlistContainer");

const emptyWishlist =
    document.getElementById("emptyWishlist");

const wishlistCountElement =
    document.getElementById("wishlistCount");

const wishlistItemsCount =
    document.getElementById("wishlistItemsCount");

const wishlistSearch =
    document.getElementById("wishlistSearch");

const clearWishlistBtn =
    document.getElementById("clearWishlistBtn");

const themeToggle =
    document.getElementById("themeToggle");

/* =========================================================
AUTH HELPERS
========================================================= */

function getAuthToken() {

    try {

        return (
            localStorage.getItem(
                AUTH_TOKEN_KEY
            ) || ""
        );

    }
    catch (error) {

        console.error(
            "Unable to read auth token:",
            error
        );

        return "";
    }
}

function authHeaders(extra = {}) {

    const token =
        getAuthToken();

    return {
        ...extra,
        Authorization: `Bearer ${token}`
    };
}

/* =========================================================
IMAGE PATH HELPER
========================================================= */

function getProductImageUrl(image) {

    if (!image) {
        return "";
    }

    let imagePath = String(image).trim();

    if (!imagePath) {
        return "";
    }

    /* Already complete URL */

    if (
        imagePath.startsWith("http://") ||
        imagePath.startsWith("https://") ||
        imagePath.startsWith("data:")
    ) {
        return imagePath;
    }

    /* Remove ./ */

    imagePath = imagePath.replace(/^\.\/+/, "");

    /* /images/... */

    if (imagePath.startsWith("/images/")) {

        return (
            IMAGE_BASE_URL +
            imagePath
        );
    }

    /* images/... */

    if (imagePath.startsWith("images/")) {

        return (
            IMAGE_BASE_URL +
            "/" +
            imagePath
        );
    }

    /* Filename only */

    if (!imagePath.includes("/")) {

        return (
            IMAGE_BASE_URL +
            "/images/" +
            encodeURIComponent(imagePath)
        );
    }

    /* Other relative path */

    if (!imagePath.startsWith("/")) {

        imagePath =
            "/" + imagePath;
    }

    return (
        IMAGE_BASE_URL +
        imagePath
    );
}

/* =========================================================
ESCAPE HTML
========================================================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* =========================================================
CURRENCY
========================================================= */

function formatCurrency(amount) {

    const value =
        Number(amount) || 0;

    return `$${value.toFixed(2)}`;
}

/* =========================================================
FETCH WISHLIST FROM BACKEND

GET /api/wishlist (protected — requires a logged-in user).
If there's no auth token, we skip the request entirely and
render the "please log in" state instead of hitting the API
and getting a 401.
========================================================= */

async function fetchWishlist() {

    const token =
        getAuthToken();

    if (!token) {

        wishlistProducts = [];

        filterWishlistProducts();

        return;
    }

    try {

        const response =
            await fetch(
                WISHLIST_API_URL,
                {
                    method: "GET",
                    headers: authHeaders()
                }
            );

        /*
        Token missing/expired —
        treat same as logged out.
        */

        if (response.status === 401) {

            localStorage.removeItem(
                AUTH_TOKEN_KEY
            );

            wishlistProducts = [];

            filterWishlistProducts();

            return;
        }

        if (!response.ok) {

            throw new Error(
                `API request failed: ${response.status}`
            );
        }

        const data =
            await response.json();

        wishlistProducts =
            Array.isArray(data.products)
                ? data.products.map(
                    product => ({
                        ...product,
                        id: product._id
                    })
                )
                : [];

    }
    catch (error) {

        console.error(
            "Unable to load wishlist from the backend:",
            error
        );

        wishlistProducts = [];

        showToast(
            "Unable to load your wishlist. Please try again.",
            "error"
        );
    }

    filterWishlistProducts();
}

/* =========================================================
GET PRODUCT ID
========================================================= */

function getProductId(product) {

    if (!product) {
        return "";
    }

    return String(
        product.id ??
        product._id ??
        product.productId ??
        ""
    );
}

/* =========================================================
FIND PRODUCT (within the already-loaded wishlist)
========================================================= */

function findWishlistProduct(productId) {

    const id =
        String(productId);

    return wishlistProducts.find(
        product =>
            getProductId(product) === id
    );
}

/* =========================================================
FILTER WISHLIST PRODUCTS
========================================================= */

function filterWishlistProducts() {

    const search =
        wishlistSearch
            ? wishlistSearch.value
                .trim()
                .toLowerCase()
            : "";

    filteredProducts =
        wishlistProducts.filter(product => {

            if (!search) {
                return true;
            }

            const name =
                String(
                    product.name || ""
                ).toLowerCase();

            const category =
                String(
                    product.category || ""
                ).toLowerCase();

            return (
                name.includes(search) ||
                category.includes(search)
            );
        });

    renderWishlist();
}

/* =========================================================
CREATE PRODUCT CARD
========================================================= */

function createWishlistCard(product) {

    const productId =
        getProductId(product);

    const card =
        document.createElement("article");

    card.className =
        "wishlist-card";

    const imageUrl =
        getProductImageUrl(
            product.image
        );

    const productName =
        product.name ||
        "Product";

    const category =
        product.category ||
        "Product";

    const price =
        Number(product.price) || 0;

    card.innerHTML = `

        <div class="wishlist-image-wrapper">

            ${
                imageUrl
                    ? `
                        <img
                            src="${escapeHTML(imageUrl)}"
                            alt="${escapeHTML(productName)}"
                            class="wishlist-product-image"
                            loading="lazy"
                        >
                    `
                    : `
                        <div class="wishlist-image-placeholder">
                            <i class="fas fa-image"></i>
                        </div>
                    `
            }

            <button
                type="button"
                class="wishlist-remove-btn"
                data-id="${escapeHTML(productId)}"
                aria-label="Remove from wishlist"
                title="Remove from wishlist"
            >
                <i class="fas fa-heart"></i>
            </button>

        </div>

        <div class="wishlist-card-body">

            <span class="wishlist-category">
                ${escapeHTML(category)}
            </span>

            <h3 class="wishlist-product-name">
                ${escapeHTML(productName)}
            </h3>

            <div class="wishlist-price">
                ${formatCurrency(price)}
            </div>

            <div class="wishlist-card-actions">

                <button
                    type="button"
                    class="wishlist-add-cart-btn"
                    data-id="${escapeHTML(productId)}"
                >
                    <i class="fas fa-shopping-cart"></i>
                    Add to Cart
                </button>

                <button
                    type="button"
                    class="wishlist-view-btn"
                    data-id="${escapeHTML(productId)}"
                >
                    <i class="fas fa-eye"></i>
                </button>

            </div>

        </div>

    `;

    /* Image fallback */

    const image =
        card.querySelector(
            ".wishlist-product-image"
        );

    if (image) {

        image.addEventListener(
            "error",
            function () {

                console.warn(
                    "⚠️ Wishlist image not found:",
                    this.src
                );

                const placeholder =
                    document.createElement(
                        "div"
                    );

                placeholder.className =
                    "wishlist-image-placeholder";

                placeholder.innerHTML =
                    `<i class="fas fa-image"></i>`;

                this.replaceWith(
                    placeholder
                );
            }
        );
    }

    return card;
}

/* =========================================================
RENDER WISHLIST
========================================================= */

function renderWishlist() {

    if (!wishlistContainer) {
        return;
    }

    wishlistContainer.innerHTML = "";

    /*
    Not logged in — wishlist is
    tied to a user account now.
    */

    if (!getAuthToken()) {

        wishlistContainer.hidden =
            true;

        if (emptyWishlist) {

            emptyWishlist.hidden =
                false;

            emptyWishlist.innerHTML = `

                <div class="empty-wishlist-content">

                    <i class="far fa-heart"></i>

                    <h2>
                        Log In to See Your Wishlist
                    </h2>

                    <p>
                        Your wishlist is saved to your account.
                        Log in to view and manage it.
                    </p>

                    <a
                        href="../login/index.html"
                        class="btn-primary"
                    >
                        <i class="fas fa-right-to-bracket"></i>
                        Log In
                    </a>

                </div>

            `;
        }

        updateWishlistCount();

        return;
    }

    /*
    No wishlist items
    */

    if (
        wishlistProducts.length === 0
    ) {

        wishlistContainer.hidden =
            true;

        if (emptyWishlist) {

            emptyWishlist.hidden =
                false;

            emptyWishlist.innerHTML = `

                <div class="empty-wishlist-content">

                    <i class="far fa-heart"></i>

                    <h2>
                        Your Wishlist is Empty
                    </h2>

                    <p>
                        Save your favorite products
                        here and come back later.
                    </p>

                    <a
                        href="../shop/index.html"
                        class="btn-primary"
                    >
                        <i class="fas fa-shopping-bag"></i>
                        Continue Shopping
                    </a>

                </div>

            `;
        }

        updateWishlistCount();

        return;
    }

    if (emptyWishlist) {

        emptyWishlist.hidden =
            true;
    }

    /*
    Search has no results
    */

    if (
        filteredProducts.length === 0
    ) {

        wishlistContainer.hidden =
            false;

        wishlistContainer.innerHTML = `

            <div class="wishlist-no-results">

                <i class="fas fa-search"></i>

                <h3>
                    No wishlist products found
                </h3>

                <p>
                    Try another search.
                </p>

            </div>

        `;

        updateWishlistCount();

        return;
    }

    /*
    Render products
    */

    wishlistContainer.hidden =
        false;

    filteredProducts.forEach(
        product => {

            const card =
                createWishlistCard(
                    product
                );

            wishlistContainer.appendChild(
                card
            );
        }
    );

    updateWishlistCount();
}

/* =========================================================
REMOVE FROM WISHLIST

DELETE /api/wishlist/:productId
========================================================= */

async function removeFromWishlist(productId) {

    const token =
        getAuthToken();

    if (!token) {
        return;
    }

    const id =
        String(productId);

    try {

        const response =
            await fetch(
                `${WISHLIST_API_URL}/${encodeURIComponent(id)}`,
                {
                    method: "DELETE",
                    headers: authHeaders()
                }
            );

        if (!response.ok) {

            throw new Error(
                `API request failed: ${response.status}`
            );
        }

        wishlistProducts =
            wishlistProducts.filter(
                item =>
                    getProductId(item) !== id
            );

        filterWishlistProducts();

        showToast(
            "Product removed from wishlist."
        );

        console.log(
            "❤️ Removed from wishlist:",
            id
        );

    }
    catch (error) {

        console.error(
            "Unable to remove product from wishlist:",
            error
        );

        showToast(
            "Unable to remove product from wishlist.",
            "error"
        );
    }
}

/* =========================================================
CLEAR WISHLIST

DELETE /api/wishlist
========================================================= */

async function clearWishlist() {

    if (
        wishlistProducts.length === 0
    ) {
        return;
    }

    const confirmed =
        confirm(
            "Are you sure you want to clear your wishlist?"
        );

    if (!confirmed) {
        return;
    }

    const token =
        getAuthToken();

    if (!token) {
        return;
    }

    try {

        const response =
            await fetch(
                WISHLIST_API_URL,
                {
                    method: "DELETE",
                    headers: authHeaders()
                }
            );

        if (!response.ok) {

            throw new Error(
                `API request failed: ${response.status}`
            );
        }

        wishlistProducts = [];

        filterWishlistProducts();

        showToast(
            "Wishlist cleared successfully."
        );

    }
    catch (error) {

        console.error(
            "Unable to clear wishlist:",
            error
        );

        showToast(
            "Unable to clear wishlist.",
            "error"
        );
    }
}

/* =========================================================
LOAD CART

Cart is still localStorage-based (guest checkout is not
required to add to cart) — CART_KEY comes from products.js.
========================================================= */

function loadCart() {

    try {

        const savedCart =
            localStorage.getItem(
                CART_KEY
            );

        if (!savedCart) {
            return {};
        }

        const parsed =
            JSON.parse(savedCart);

        /*
        Object format
        */

        if (
            parsed &&
            typeof parsed === "object" &&
            !Array.isArray(parsed)
        ) {

            return parsed;
        }

        /*
        Array format support
        */

        if (Array.isArray(parsed)) {

            const cartObject = {};

            parsed.forEach(item => {

                if (!item) {
                    return;
                }

                const id =
                    getProductId(item);

                if (!id) {
                    return;
                }

                const quantity =
                    Number(
                        item.quantity
                    ) || 1;

                cartObject[id] =
                    quantity;
            });

            return cartObject;
        }

        return {};

    }
    catch (error) {

        console.error(
            "Unable to load cart:",
            error
        );

        return {};
    }
}

/* =========================================================
ADD TO CART
========================================================= */

function addToCart(productId) {

    const id =
        String(productId);

    const product =
        findWishlistProduct(id);

    if (!product) {

        showToast(
            "Product information not found.",
            "error"
        );

        return;
    }

    const cart =
        loadCart();

    if (
        !cart[id]
    ) {

        cart[id] = 1;

    }
    else {

        const current =
            Number(cart[id]) || 0;

        cart[id] =
            current + 1;
    }

    try {

        localStorage.setItem(
            CART_KEY,
            JSON.stringify(cart)
        );

        updateCartCount();

        showToast(
            `${product.name || "Product"} added to cart.`
        );

        console.log(
            "🛒 Added to cart:",
            product.name
        );

    }
    catch (error) {

        console.error(
            "Unable to save cart:",
            error
        );

        showToast(
            "Unable to add product to cart.",
            "error"
        );
    }
}

/* =========================================================
UPDATE CART COUNT
========================================================= */

function updateCartCount() {

    const cart =
        loadCart();

    const count =
        Object.values(cart)
            .reduce(
                (total, quantity) => {

                    const qty =
                        Number(
                            quantity
                        ) || 0;

                    return (
                        total +
                        Math.max(
                            0,
                            Math.floor(qty)
                        )
                    );

                },
                0
            );

    document
        .querySelectorAll(
            ".cart-count"
        )
        .forEach(element => {

            element.textContent =
                count;
        });
}

/* =========================================================
UPDATE WISHLIST COUNT
========================================================= */

function updateWishlistCount() {

    const count =
        wishlistProducts.length;

    document
        .querySelectorAll(
            ".wishlist-count"
        )
        .forEach(element => {

            element.textContent =
                count;
        });

    if (wishlistItemsCount) {

        wishlistItemsCount.textContent =
            `${count} ${
                count === 1
                    ? "Item"
                    : "Items"
            }`;
    }
}

/* =========================================================
PRODUCT MODAL

There's no dedicated single-product page in this project
(confirmed against products/index.html and shop/index.html),
so "view" opens an in-page modal instead of navigating away.
========================================================= */

let productModalOverlay = null;
let productModalQuantity = 1;
let productModalCurrentId = null;

function injectProductModalStyles() {

    if (
        document.getElementById("wishlistProductModalStyles")
    ) {
        return;
    }

    const style =
        document.createElement("style");

    style.id =
        "wishlistProductModalStyles";

    style.textContent = `

        .wpm-overlay {
            position: fixed;
            inset: 0;
            background: rgba(17, 24, 39, 0.6);
            display: none;
            align-items: center;
            justify-content: center;
            padding: 20px;
            z-index: 2000;
        }

        .wpm-overlay.show {
            display: flex;
        }

        .wpm-card {
            background: var(--bg-color, #ffffff);
            color: var(--text-color, #111827);
            width: min(720px, 100%);
            max-height: 90vh;
            overflow-y: auto;
            border-radius: 16px;
            position: relative;
            display: grid;
            grid-template-columns: 1fr 1fr;
        }

        @media (max-width: 640px) {

            .wpm-card {
                grid-template-columns: 1fr;
            }
        }

        .wpm-close {
            position: absolute;
            top: 14px;
            right: 14px;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border: none;
            background: rgba(17, 24, 39, 0.08);
            color: inherit;
            font-size: 16px;
            cursor: pointer;
            display: grid;
            place-items: center;
            z-index: 1;
        }

        .wpm-close:hover {
            background: rgba(17, 24, 39, 0.16);
        }

        .wpm-image-wrapper {
            background: #f3f4f6;
            display: grid;
            place-items: center;
            min-height: 260px;
        }

        .wpm-image-wrapper img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .wpm-body {
            padding: 30px 28px;
            display: flex;
            flex-direction: column;
        }

        .wpm-category {
            text-transform: capitalize;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.5px;
            color: #6b7280;
            margin-bottom: 6px;
        }

        .wpm-name {
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 10px;
        }

        .wpm-price {
            font-size: 20px;
            font-weight: 800;
            margin-bottom: 20px;
        }

        .wpm-qty-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
        }

        .wpm-qty-btn {
            width: 34px;
            height: 34px;
            border-radius: 8px;
            border: 1px solid #d1d5db;
            background: #ffffff;
            color: #111827;
            font-size: 16px;
            cursor: pointer;
        }

        .wpm-qty-value {
            min-width: 24px;
            text-align: center;
            font-weight: 700;
        }

        .wpm-actions {
            display: flex;
            gap: 10px;
            margin-top: auto;
        }

        .wpm-actions button {
            flex: 1;
            min-height: 46px;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .wpm-add-cart {
            border: none;
            background: #111827;
            color: #ffffff;
        }

        .wpm-add-cart:hover {
            background: #000000;
        }

        .wpm-remove {
            border: 1px solid #d1d5db;
            background: #ffffff;
            color: #374151;
        }

        .wpm-remove:hover {
            background: #f3f4f6;
        }

    `;

    document.head.appendChild(style);
}

function buildProductModal() {

    if (productModalOverlay) {
        return productModalOverlay;
    }

    injectProductModalStyles();

    const overlay =
        document.createElement("div");

    overlay.className =
        "wpm-overlay";

    overlay.innerHTML = `

        <div class="wpm-card">

            <button
                type="button"
                class="wpm-close"
                aria-label="Close"
            >
                <i class="fas fa-xmark"></i>
            </button>

            <div class="wpm-image-wrapper">
                <img class="wpm-image" src="" alt="">
            </div>

            <div class="wpm-body">

                <span class="wpm-category"></span>
                <h2 class="wpm-name"></h2>
                <div class="wpm-price"></div>

                <div class="wpm-qty-row">

                    <button type="button" class="wpm-qty-btn wpm-qty-minus">
                        <i class="fas fa-minus"></i>
                    </button>

                    <span class="wpm-qty-value">1</span>

                    <button type="button" class="wpm-qty-btn wpm-qty-plus">
                        <i class="fas fa-plus"></i>
                    </button>

                </div>

                <div class="wpm-actions">

                    <button type="button" class="wpm-add-cart">
                        <i class="fas fa-cart-plus"></i>
                        Add to Cart
                    </button>

                    <button type="button" class="wpm-remove">
                        <i class="fas fa-heart-crack"></i>
                        Remove
                    </button>

                </div>

            </div>

        </div>

    `;

    document.body.appendChild(overlay);

    overlay.addEventListener("click", event => {

        if (event.target === overlay) {
            closeProductModal();
        }
    });

    overlay.querySelector(".wpm-close")
        .addEventListener("click", closeProductModal);

    overlay.querySelector(".wpm-qty-minus")
        .addEventListener("click", () => {

            productModalQuantity =
                Math.max(1, productModalQuantity - 1);

            overlay.querySelector(".wpm-qty-value").textContent =
                productModalQuantity;
        });

    overlay.querySelector(".wpm-qty-plus")
        .addEventListener("click", () => {

            productModalQuantity =
                productModalQuantity + 1;

            overlay.querySelector(".wpm-qty-value").textContent =
                productModalQuantity;
        });

    overlay.querySelector(".wpm-add-cart")
        .addEventListener("click", () => {

            if (!productModalCurrentId) {
                return;
            }

            addProductToCartWithQuantity(
                productModalCurrentId,
                productModalQuantity
            );

            closeProductModal();
        });

    overlay.querySelector(".wpm-remove")
        .addEventListener("click", () => {

            if (!productModalCurrentId) {
                return;
            }

            removeFromWishlist(productModalCurrentId);

            closeProductModal();
        });

    document.addEventListener("keydown", event => {

        if (
            event.key === "Escape" &&
            overlay.classList.contains("show")
        ) {
            closeProductModal();
        }
    });

    productModalOverlay = overlay;

    return overlay;
}

function openProductModal(product) {

    const overlay =
        buildProductModal();

    productModalCurrentId =
        getProductId(product);

    productModalQuantity = 1;

    overlay.querySelector(".wpm-qty-value").textContent = "1";

    const imageUrl =
        getProductImageUrl(product.image);

    const image =
        overlay.querySelector(".wpm-image");

    image.src = imageUrl || "";
    image.alt = product.name || "Product";

    overlay.querySelector(".wpm-category").textContent =
        product.category || "Product";

    overlay.querySelector(".wpm-name").textContent =
        product.name || "Product";

    overlay.querySelector(".wpm-price").textContent =
        formatCurrency(product.price);

    overlay.classList.add("show");

    document.body.style.overflow = "hidden";
}

function closeProductModal() {

    if (!productModalOverlay) {
        return;
    }

    productModalOverlay.classList.remove("show");

    document.body.style.overflow = "";

    productModalCurrentId = null;
}

/* =========================================================
ADD TO CART (WITH CHOSEN QUANTITY)

Used by the product modal's quantity stepper. addToCart()
above always adds exactly 1 and is left untouched for the
existing card button.
========================================================= */

function addProductToCartWithQuantity(productId, quantity) {

    const id =
        String(productId);

    const product =
        findWishlistProduct(id);

    if (!product) {

        showToast(
            "Product information not found.",
            "error"
        );

        return;
    }

    const qty =
        Math.max(1, Math.floor(Number(quantity) || 1));

    const cart =
        loadCart();

    cart[id] =
        (Number(cart[id]) || 0) + qty;

    try {

        localStorage.setItem(
            CART_KEY,
            JSON.stringify(cart)
        );

        updateCartCount();

        showToast(
            `${product.name || "Product"} added to cart.`
        );

    }
    catch (error) {

        console.error(
            "Unable to save cart:",
            error
        );

        showToast(
            "Unable to add product to cart.",
            "error"
        );
    }
}

/* =========================================================
VIEW PRODUCT

Opens an in-page product modal (there's no dedicated
single-product page in this project).
========================================================= */

function viewProduct(productId) {

    const product =
        findWishlistProduct(productId);

    if (!product) {

        showToast(
            "Product information not found.",
            "error"
        );

        return;
    }

    openProductModal(product);
}

/* =========================================================
WISHLIST EVENTS
========================================================= */

function setupWishlistEvents() {

    if (!wishlistContainer) {
        return;
    }

    wishlistContainer.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "button"
                );

            if (!button) {
                return;
            }

            const productId =
                button.dataset.id;

            if (!productId) {
                return;
            }

            /*
            Remove
            */

            if (
                button.classList.contains(
                    "wishlist-remove-btn"
                )
            ) {

                removeFromWishlist(
                    productId
                );

                return;
            }

            /*
            Add to cart
            */

            if (
                button.classList.contains(
                    "wishlist-add-cart-btn"
                )
            ) {

                addToCart(
                    productId
                );

                return;
            }

            /*
            View product
            */

            if (
                button.classList.contains(
                    "wishlist-view-btn"
                )
            ) {

                viewProduct(
                    productId
                );
            }
        }
    );
}

/* =========================================================
SEARCH
========================================================= */

function setupSearch() {

    if (!wishlistSearch) {
        return;
    }

    wishlistSearch.addEventListener(
        "input",
        filterWishlistProducts
    );
}

/* =========================================================
CLEAR BUTTON
========================================================= */

function setupClearWishlist() {

    if (!clearWishlistBtn) {
        return;
    }

    clearWishlistBtn.addEventListener(
        "click",
        clearWishlist
    );
}

/* =========================================================
THEME
========================================================= */

function updateThemeIcon() {

    if (!themeToggle) {
        return;
    }

    const icon =
        themeToggle.querySelector(
            "i"
        );

    if (!icon) {
        return;
    }

    const isDark =
        document.body.classList.contains(
            "dark-mode"
        );

    icon.className =
        isDark
            ? "fas fa-sun"
            : "fas fa-moon";
}

/* =========================================================
INITIALIZE THEME
========================================================= */

function initTheme() {

    const savedTheme =
        localStorage.getItem(
            THEME_KEY
        );

    if (
        savedTheme === "dark"
    ) {

        document.body.classList.add(
            "dark-mode"
        );
    }

    updateThemeIcon();

    if (!themeToggle) {
        return;
    }

    themeToggle.addEventListener(
        "click",
        () => {

            document.body.classList.toggle(
                "dark-mode"
            );

            const isDark =
                document.body.classList.contains(
                    "dark-mode"
                );

            localStorage.setItem(
                THEME_KEY,
                isDark
                    ? "dark"
                    : "light"
            );

            updateThemeIcon();
        }
    );
}

/* =========================================================
STORAGE LISTENER

Cart is still localStorage-based, so keep syncing the cart
badge across tabs. The wishlist itself now lives on the
backend, so there's nothing to sync via the storage event
for it anymore.
========================================================= */

function setupStorageListener() {

    window.addEventListener(
        "storage",
        event => {

            if (
                event.key ===
                CART_KEY
            ) {

                updateCartCount();
            }
        }
    );
}

/* =========================================================
TOAST
========================================================= */

function showToast(
    message,
    type = "success"
) {

    let toast =
        document.getElementById(
            "wishlistToast"
        );

    /*
    Create toast automatically
    if HTML doesn't have one.
    */

    if (!toast) {

        toast =
            document.createElement(
                "div"
            );

        toast.id =
            "wishlistToast";

        toast.className =
            "wishlist-toast";

        document.body.appendChild(
            toast
        );
    }

    toast.textContent =
        message;

    toast.classList.remove(
        "toast-error"
    );

    if (
        type === "error"
    ) {

        toast.classList.add(
            "toast-error"
        );
    }

    toast.classList.add(
        "show"
    );

    clearTimeout(
        toast._timeout
    );

    toast._timeout =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            3000
        );
}

/* =========================================================
INITIALIZE WISHLIST
========================================================= */

function initWishlist() {

    console.log(
        "❤️ ShopHub Wishlist Starting..."
    );

    updateWishlistCount();

    updateCartCount();

    initTheme();

    setupWishlistEvents();

    setupSearch();

    setupClearWishlist();

    setupStorageListener();

    /*
    Load the wishlist from the backend
    (or show the "log in" state if
    there's no auth token).
    */

    fetchWishlist().then(() => {

        updateWishlistCount();

        console.log(
            "❤️ Wishlist Products:",
            wishlistProducts.length
        );

        console.log(
            "✅ ShopHub Wishlist Ready"
        );
    });
}

/* =========================================================
DOM READY
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initWishlist
    );

}
else {

    initWishlist();
}