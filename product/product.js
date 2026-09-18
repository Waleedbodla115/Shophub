"use strict";

/* =========================================================
   SHOPHUB - PRODUCT DETAIL PAGE
   Uses the shared products.js catalog for product data,
   cart, and image URLs.
========================================================= */

const API_BASE_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000"
        : "https://shophub-bice.vercel.app";

const WISHLIST_API = `${API_BASE_URL}/api/wishlist`;
const RECOMMENDATIONS_API =
    `${API_BASE_URL}/api/ai/recommendations`;

let currentProduct = null;
let currentWishlistIds = [];


/* =========================================================
   GET PRODUCT ID FROM URL
========================================================= */

function getProductIdFromUrl() {
    const params =
        new URLSearchParams(window.location.search);

    return params.get("id");
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   TOAST
========================================================= */

function showToast(message) {
    const toastEl =
        document.getElementById("shopHubToast");

    const toastMessage =
        document.getElementById("toastMessage");

    if (!toastEl || !toastMessage) {
        return;
    }

    toastMessage.textContent = message;

    const toast =
        bootstrap.Toast.getOrCreateInstance(toastEl);

    toast.show();
}


/* =========================================================
   RENDER STARS
========================================================= */

function renderStars(rating) {
    const rounded = Math.round(
        Math.max(
            0,
            Math.min(5, Number(rating) || 0)
        )
    );

    let stars = "";

    for (let i = 1; i <= 5; i++) {
        stars +=
            i <= rounded
                ? `<i class="bi bi-star-fill"></i>`
                : `<i class="bi bi-star"></i>`;
    }

    return stars;
}


/* =========================================================
   RENDER PRODUCT
========================================================= */

function renderProduct(product) {
    document.title =
        `ShopHub - ${product.name}`;

    /* Product Image */

    const mainImage =
        document.getElementById(
            "mainProductImage"
        );

    if (mainImage) {
        mainImage.src =
            window.getProductImageUrl(
                product.image
            );

        mainImage.alt =
            product.name || "Product";

        mainImage.onerror = () => {
            mainImage.onerror = null;
            mainImage.removeAttribute("src");
        };
    }


    /* Category */

    const categoryEl =
        document.getElementById(
            "productCategory"
        );

    if (categoryEl) {
        categoryEl.textContent =
            product.category || "Product";
    }


    /* Name */

    const nameEl =
        document.getElementById(
            "productName"
        );

    if (nameEl) {
        nameEl.textContent =
            product.name ||
            "Unnamed Product";
    }


    /* Rating */

    const rating =
        Number(product.rating) || 0;

    const starsEl =
        document.getElementById(
            "productRatingStars"
        );

    const ratingValueEl =
        document.getElementById(
            "productRatingValue"
        );

    if (starsEl) {
        starsEl.innerHTML =
            renderStars(rating);
    }

    if (ratingValueEl) {
        ratingValueEl.textContent =
            rating.toFixed(1);
    }


    /* Price */

    const priceEl =
        document.getElementById(
            "productPrice"
        );

    if (priceEl) {
        priceEl.textContent =
            (
                Number(product.price) || 0
            ).toFixed(2);
    }


    /* Description */

    const descriptionEl =
        document.getElementById(
            "productDescription"
        );

    if (descriptionEl) {
        descriptionEl.textContent =
            product.description ||
            "Premium quality product available at ShopHub.";
    }


    /* Stock */

    const stockEl =
        document.getElementById(
            "productStock"
        );

    const stock =
        Number(product.stock);

    const inStock =
        Number.isFinite(stock) &&
        stock > 0;

    if (stockEl) {
        stockEl.textContent =
            inStock
                ? `In Stock (${stock} available)`
                : "Out of Stock";

        stockEl.classList.toggle(
            "in-stock",
            inStock
        );

        stockEl.classList.toggle(
            "out-of-stock",
            !inStock
        );
    }


    /* Quantity */

    const quantityInput =
        document.getElementById(
            "quantity"
        );

    if (quantityInput) {
        quantityInput.max =
            inStock
                ? Math.min(99, stock)
                : 1;

        quantityInput.value = 1;
    }


    /* Add To Cart Button */

    const addToCartBtn =
        document.getElementById(
            "addToCartBtn"
        );

    if (addToCartBtn) {
        addToCartBtn.disabled =
            !inStock;

        addToCartBtn.textContent = "";

        const icon =
            document.createElement("i");

        icon.className =
            "bi bi-cart-plus";

        addToCartBtn.appendChild(icon);

        addToCartBtn.append(
            inStock
                ? " Add to Cart"
                : " Out of Stock"
        );
    }


    /* Reveal */

    document
        .getElementById("loadingMessage")
        ?.classList.add("d-none");

    document
        .getElementById("productDetails")
        ?.classList.remove("d-none");
}


/* =========================================================
   SHOW ERROR
========================================================= */

function showProductError() {
    document
        .getElementById("loadingMessage")
        ?.classList.add("d-none");

    const errorEl =
        document.getElementById(
            "errorMessage"
        );

    if (errorEl) {
        errorEl.classList.remove(
            "d-none"
        );
    }
}


/* =========================================================
   QUANTITY CONTROLS
========================================================= */

function setupQuantityControls() {
    const quantityInput =
        document.getElementById(
            "quantity"
        );

    const decreaseBtn =
        document.getElementById(
            "decreaseQuantity"
        );

    const increaseBtn =
        document.getElementById(
            "increaseQuantity"
        );

    if (!quantityInput) {
        return;
    }

    const clamp = value => {
        const max =
            Number(quantityInput.max) || 99;

        const min =
            Number(quantityInput.min) || 1;

        return Math.max(
            min,
            Math.min(max, value)
        );
    };


    decreaseBtn?.addEventListener(
        "click",
        () => {
            quantityInput.value =
                clamp(
                    (Number(
                        quantityInput.value
                    ) || 1) - 1
                );
        }
    );


    increaseBtn?.addEventListener(
        "click",
        () => {
            quantityInput.value =
                clamp(
                    (Number(
                        quantityInput.value
                    ) || 1) + 1
                );
        }
    );


    quantityInput.addEventListener(
        "change",
        () => {
            quantityInput.value =
                clamp(
                    Number(
                        quantityInput.value
                    ) || 1
                );
        }
    );
}


/* =========================================================
   ADD TO CART
========================================================= */

function setupAddToCart() {
    const addToCartBtn =
        document.getElementById(
            "addToCartBtn"
        );

    const quantityInput =
        document.getElementById(
            "quantity"
        );

    if (!addToCartBtn) {
        return;
    }

    addToCartBtn.addEventListener(
        "click",
        () => {

            if (!currentProduct) {
                return;
            }

            const quantity =
                Number(
                    quantityInput?.value
                ) || 1;

            const added =
                window.addToCart(
                    currentProduct.id,
                    quantity
                );

            if (added) {
                showToast(
                    `${currentProduct.name} added to cart`
                );
            } else {
                showToast(
                    "Unable to add this product to your cart."
                );
            }
        }
    );
}


/* =========================================================
   WISHLIST
========================================================= */

function getAuthToken() {
    return localStorage.getItem(
        "authToken"
    );
}


async function fetchWishlistIds() {
    const token =
        getAuthToken();

    if (!token) {
        currentWishlistIds = [];
        return;
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
            response.ok &&
            data.success
        ) {
            currentWishlistIds =
                (
                    data.wishlist ||
                    data.items ||
                    []
                ).map(
                    entry =>
                        String(
                            entry.product?._id ||
                            entry.productId ||
                            entry._id ||
                            entry
                        )
                );
        }

    } catch (error) {

        console.error(
            "❌ Wishlist fetch error:",
            error
        );
    }
}


function updateWishlistButton() {
    const btn =
        document.getElementById(
            "wishlistBtn"
        );

    if (!btn || !currentProduct) {
        return;
    }

    const isWishlisted =
        currentWishlistIds.includes(
            String(currentProduct.id)
        );

    const icon =
        btn.querySelector("i");

    if (icon) {
        icon.className =
            isWishlisted
                ? "bi bi-heart-fill"
                : "bi bi-heart";
    }

    btn.classList.toggle(
        "is-active",
        isWishlisted
    );
}


function setupWishlist() {
    const btn =
        document.getElementById(
            "wishlistBtn"
        );

    if (!btn) {
        return;
    }

    btn.addEventListener(
        "click",
        async () => {

            if (!currentProduct) {
                return;
            }

            const token =
                getAuthToken();

            if (!token) {

                showToast(
                    "Please log in to use your wishlist."
                );

                window.location.href =
                    "../login/index.html";

                return;
            }

            const id =
                String(
                    currentProduct.id
                );

            const isWishlisted =
                currentWishlistIds.includes(
                    id
                );

            try {

                const response =
                    await fetch(
                        isWishlisted
                            ? `${WISHLIST_API}/${encodeURIComponent(id)}`
                            : WISHLIST_API,
                        {
                            method:
                                isWishlisted
                                    ? "DELETE"
                                    : "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                Authorization:
                                    `Bearer ${token}`
                            },

                            body:
                                isWishlisted
                                    ? undefined
                                    : JSON.stringify({
                                          productId: id
                                      })
                        }
                    );

                const data =
                    await response
                        .json()
                        .catch(() => ({}));

                if (
                    !response.ok ||
                    data.success !== true
                ) {
                    throw new Error(
                        data.message ||
                        "Wishlist update failed."
                    );
                }

                if (isWishlisted) {

                    currentWishlistIds =
                        currentWishlistIds.filter(
                            item => item !== id
                        );

                    showToast(
                        `${currentProduct.name} removed from wishlist`
                    );

                } else {

                    currentWishlistIds.push(id);

                    showToast(
                        `${currentProduct.name} added to wishlist`
                    );
                }

                updateWishlistButton();

            } catch (error) {

                console.error(
                    "❌ Wishlist toggle error:",
                    error
                );

                showToast(
                    "Unable to update your wishlist right now."
                );
            }
        }
    );
}


/* =========================================================
   ASK SHOPPY
========================================================= */

function setupAskShoppy() {
    const btn =
        document.getElementById(
            "askShoppyBtn"
        );

    if (!btn) {
        return;
    }

    btn.addEventListener(
        "click",
        () => {

            const productName =
                currentProduct?.name ||
                "this product";

            if (
                typeof window.openShoppyWithQuestion ===
                "function"
            ) {

                window.openShoppyWithQuestion(
                    `Tell me more about ${productName}`
                );

            } else {

                showToast(
                    "Shoppy isn't available right now."
                );
            }
        }
    );
}


/* =========================================================
   SHOPPY RECOMMENDS
========================================================= */

function createRelatedProductCard(product) {

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
        window.getProductImageUrl(
            product.image
        );

    return `
        <div class="col-6 col-md-4 col-lg-3">

            <a
                href="./index.html?id=${encodeURIComponent(id)}"
                class="card h-100 related-product-card text-decoration-none text-reset"
            >

                <img
                    src="${imageUrl}"
                    class="card-img-top"
                    alt="${name}"
                    loading="lazy"
                >

                <div class="card-body">

                    <h3 class="h6 card-title mb-1">
                        ${name}
                    </h3>

                    <p class="fw-bold mb-0">
                        $${price}
                    </p>

                </div>

            </a>

        </div>
    `;
}


async function loadRecommendations(
    productId
) {

    const section =
        document.getElementById(
            "relatedProductsSection"
        );

    const container =
        document.getElementById(
            "relatedProducts"
        );

    if (!section || !container) {
        return;
    }

    try {

        const response =
            await fetch(
                `${RECOMMENDATIONS_API}/${encodeURIComponent(productId)}`
            );

        const data =
            await response
                .json()
                .catch(() => ({}));

        if (
            !response.ok ||
            data.success !== true ||
            !data.recommendations?.length
        ) {
            return;
        }

        container.innerHTML =
            data.recommendations
                .map(
                    createRelatedProductCard
                )
                .join("");

        section.classList.remove(
            "d-none"
        );

    } catch (error) {

        console.error(
            "❌ Recommendations error:",
            error
        );
    }
}


/* =========================================================
   INIT
========================================================= */

async function initProductPage() {

    const productId =
        getProductIdFromUrl();

    if (!productId) {
        showProductError();
        return;
    }

    await window.productsReady;

    const product =
        window.getProductById(
            productId
        );

    if (!product) {
        showProductError();
        return;
    }

    currentProduct = product;

    await fetchWishlistIds();

    renderProduct(product);

    updateWishlistButton();

    setupQuantityControls();

    setupAddToCart();

    setupWishlist();

    setupAskShoppy();

    window.updateCartCountBadges();

    loadRecommendations(
        product.id
    );
}


document.addEventListener(
    "DOMContentLoaded",
    initProductPage
);