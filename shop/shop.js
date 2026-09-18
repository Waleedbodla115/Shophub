"use strict";

/* =========================================================
   SHOPHUB SHOP PAGE
   MongoDB API + Backend Images + Theme + Cart + Products
========================================================= */


/* =========================================================
   CONFIGURATION
========================================================= */

const API_BASE_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000"
        : "https://shophub-bice.vercel.app";

const PRODUCTS_API =
    `${API_BASE_URL}/api/products`;

const CART_KEY = "cart";

const THEME_KEY = "theme";

const IMAGE_BASE_URL =
    `${API_BASE_URL}/images`;


/* =========================================================
   PRODUCTS STATE
========================================================= */

let shopProducts = [];


/* =========================================================
   IMAGE FOLDERS
========================================================= */

const IMAGE_FOLDERS = [
    "men",
    "women",
    "kids",
    "accessories",
    "electronics"
];


/* =========================================================
   IMAGE ALIASES
   Handles old MongoDB image names
========================================================= */

const IMAGE_ALIASES = {

    /* ================= MEN ================= */

    "running shoes.jpg":
        "men/men-sneaker.png",

    "running shoes":
        "men/men-sneaker.png",

    "men,s jacket.jpg":
        "men/men-jacket.png",

    "men,s jacket":
        "men/men-jacket.png",

    "men jacket.jpg":
        "men/men-jacket.png",

    "men jacket":
        "men/men-jacket.png",

    "men's jacket.jpg":
        "men/men-jacket.png",

    "men's jacket":
        "men/men-jacket.png",

    "men jeans.jpg":
        "men/men-jeans.jpg",

    "men jeans":
        "men/men-jeans.jpg",

    "men sneakers.jpg":
        "men/men-sneaker.png",

    "men sneakers":
        "men/men-sneaker.png",

    "men watch.jpg":
        "men/men-watch.png",

    "men watch":
        "men/men-watch.png",

    "smart watch.jpg":
        "electronics/smart watch.jpg",

    "smart watch":
        "electronics/smart watch.jpg",


    /* ================= ELECTRONICS ================= */

    "earbuds.jpg":
        "electronics/Earbuds.jpg",

    "earbuds":
        "electronics/Earbuds.jpg",

    "powerbank.jpg":
        "electronics/powebank.jpg",

    "powerbank":
        "electronics/powebank.jpg",

    "powebank.jpg":
        "electronics/powebank.jpg",

    "wireless bt.jpg":
        "electronics/wireless BT.jpg",

    "wireless bt":
        "electronics/wireless BT.jpg",

    "wireless speakers.jpg":
        "electronics/wireless speakers.jpg",

    "wireless speakers":
        "electronics/wireless speakers.jpg",


    /* ================= WOMEN ================= */

    "women,s causal top.jpg":
        "women/women,s causal top.jpg",

    "women,s causal top":
        "women/women,s causal top.jpg",

    "women,s handbag.jpg":
        "women/women,s handbag.jpg",

    "women,s handbag":
        "women/women,s handbag.jpg",

    "women,s jacket.jpg":
        "women/women,s jacket.jpg",

    "women,s jacket":
        "women/women,s jacket.jpg",

    "women,s smart watch.jpg":
        "women/women,s smart watch.jpg",

    "women,s smart watch":
        "women/women,s smart watch.jpg",

    "women,s sneakers.jpg":
        "women/women,s sneakers.jpg",

    "women,s sneakers":
        "women/women,s sneakers.jpg",

    "women,s summer dress.jpg":
        "women/women,s summer dress.jpg",

    "women,s summer dress":
        "women/women,s summer dress.jpg",


    /* ================= KIDS ================= */

    "kids accesssories.jpg":
        "kids/kids accesssories.jpg",

    "kids accesssories":
        "kids/kids accesssories.jpg",

    "kids jacket.jpg":
        "kids/kids jacket.jpg",

    "kids jacket":
        "kids/kids jacket.jpg",

    "kids sneakers.jpg":
        "kids/kids sneakers.jpg",

    "kids sneakers":
        "kids/kids sneakers.jpg",

    "kids summer dress.jpg":
        "kids/kids summer dress.jpg",

    "kids summer dress":
        "kids/kids summer dress.jpg",

    "kids t shirt.jpg":
        "kids/kids t shirt.jpg",

    "kids t shirt":
        "kids/kids t shirt.jpg",


    /* ================= ACCESSORIES ================= */

    "classic watch.jpg":
        "accessories/classic watch.jpg",

    "classic watch":
        "accessories/classic watch.jpg",

    "handbag.jpg":
        "accessories/handbag.jpg",

    "handbag":
        "accessories/handbag.jpg",

    "leather belt.jpg":
        "accessories/leather belt.jpg",

    "leather belt":
        "accessories/leather belt.jpg",

    "sun glasses.jpg":
        "accessories/sun glasses.jpg",

    "sun glasses":
        "accessories/sun glasses.jpg",

    "wallet.jpg":
        "accessories/wallet.jpg",

    "wallet":
        "accessories/wallet.jpg"
};


/* =========================================================
   INITIALIZE THEME
========================================================= */

function initTheme() {

    const savedTheme =
        localStorage.getItem(THEME_KEY);

    if (savedTheme === "dark") {

        document.body.classList.add(
            "dark-mode"
        );
    }

    const themeToggle =
        document.getElementById(
            "themeToggle"
        );

    if (!themeToggle) {
        return;
    }

    const icon =
        themeToggle.querySelector("i");

    updateThemeIcon(icon);

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
                isDark ? "dark" : "light"
            );

            updateThemeIcon(icon);
        }
    );
}


/* =========================================================
   UPDATE THEME ICON
========================================================= */

function updateThemeIcon(icon) {

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
   CART
========================================================= */

function getCart() {

    try {

        const savedCart =
            localStorage.getItem(
                CART_KEY
            );

        if (!savedCart) {
            return {};
        }

        const cart =
            JSON.parse(savedCart);

        if (
            cart &&
            typeof cart === "object" &&
            !Array.isArray(cart)
        ) {
            return cart;
        }

        return {};

    } catch (error) {

        console.error(
            "❌ Cart parse error:",
            error
        );

        return {};
    }
}


/* =========================================================
   SAVE CART
========================================================= */

function saveCart(cart) {

    try {

        localStorage.setItem(
            CART_KEY,
            JSON.stringify(cart)
        );

    } catch (error) {

        console.error(
            "❌ Unable to save cart:",
            error
        );
    }
}


/* =========================================================
   UPDATE CART COUNT
========================================================= */

function updateCartCount() {

    const cart =
        getCart();

    let totalItems = 0;

    Object.values(cart).forEach(
        quantity => {

            const qty =
                Number(quantity);

            if (
                Number.isFinite(qty) &&
                qty > 0
            ) {

                totalItems += qty;
            }
        }
    );

    document
        .querySelectorAll(".cart-count")
        .forEach(element => {

            element.textContent =
                totalItems;
        });
}


/* =========================================================
   GLOBAL CART COUNT FUNCTION
========================================================= */

window.updateCartCountBadges =
    updateCartCount;


/* =========================================================
   CLEAR INVALID CART
========================================================= */

function clearInvalidCart() {

    try {

        const savedCart =
            localStorage.getItem(
                CART_KEY
            );

        if (!savedCart) {
            return;
        }

        const parsed =
            JSON.parse(savedCart);

        if (
            !parsed ||
            typeof parsed !== "object" ||
            Array.isArray(parsed)
        ) {

            localStorage.removeItem(
                CART_KEY
            );
        }

    } catch (error) {

        localStorage.removeItem(
            CART_KEY
        );
    }
}


/* =========================================================
   TOAST
========================================================= */

function showToast(message) {

    let toast =
        document.getElementById(
            "toast"
        );

    if (!toast) {

        toast =
            document.createElement(
                "div"
            );

        toast.id = "toast";

        toast.className =
            "shop-toast";

        document.body.appendChild(
            toast
        );
    }

    toast.classList.add(
        "shop-toast"
    );

    toast.textContent =
        message;

    toast.classList.add(
        "show"
    );

    clearTimeout(
        window.shopToastTimer
    );

    window.shopToastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            2000
        );
}


/* =========================================================
   NORMALIZE IMAGE NAME
========================================================= */

function normalizeImageName(imagePath) {

    if (!imagePath) {
        return "";
    }

    let value =
        String(imagePath)
            .trim()
            .replace(/\\/g, "/");

    /* Already absolute URL */

    if (
        value.startsWith("http://") ||
        value.startsWith("https://")
    ) {

        return value;
    }

    /* Remove leading slash */

    value =
        value.replace(/^\/+/, "");

    /* Remove images/ */

    value =
        value.replace(
            /^images\//i,
            ""
        );

    /* Lowercase */

    return value.toLowerCase();
}


/* =========================================================
   BUILD BACKEND IMAGE URL
========================================================= */

function buildBackendImageUrl(path) {

    if (!path) {
        return "";
    }

    return `${IMAGE_BASE_URL}/${path
        .split("/")
        .filter(Boolean)
        .map(
            part =>
                encodeURIComponent(part)
        )
        .join("/")}`;
}


/* =========================================================
   GET IMAGE URL
   SMART BACKEND IMAGE RESOLVER
========================================================= */

function getImageUrl(
    imagePath,
    category = ""
) {

    if (!imagePath) {
        return "";
    }

    let rawPath =
        String(imagePath).trim();

    /* Already complete URL */

    if (
        rawPath.startsWith("http://") ||
        rawPath.startsWith("https://")
    ) {

        return rawPath;
    }

    /* Normalize Windows slashes */

    rawPath =
        rawPath.replace(
            /\\/g,
            "/"
        );

    /* Remove leading slash */

    let cleanPath =
        rawPath.replace(
            /^\/+/,
            ""
        );

    /* Remove images/ */

    cleanPath =
        cleanPath.replace(
            /^images\//i,
            ""
        );

    /* Remove duplicate slashes */

    cleanPath =
        cleanPath.replace(
            /\/+/g,
            "/"
        );

    /* Already contains category folder */

    const hasCategoryFolder =
        IMAGE_FOLDERS.some(
            folder => {

                return cleanPath
                    .toLowerCase()
                    .startsWith(
                        `${folder.toLowerCase()}/`
                    );
            }
        );

    if (hasCategoryFolder) {

        return buildBackendImageUrl(
            cleanPath
        );
    }

    /* Check aliases */

    const normalizedName =
        normalizeImageName(
            cleanPath
        );

    const alias =
        IMAGE_ALIASES[
            normalizedName
        ];

    if (alias) {

        console.log(
            `🖼️ Image mapped: ${rawPath} → ${alias}`
        );

        return buildBackendImageUrl(
            alias
        );
    }

    /* Try product category */

    const normalizedCategory =
        String(category || "")
            .trim()
            .toLowerCase();

    if (
        IMAGE_FOLDERS.includes(
            normalizedCategory
        )
    ) {

        return buildBackendImageUrl(
            `${normalizedCategory}/${cleanPath}`
        );
    }

    /* Final fallback */

    return buildBackendImageUrl(
        cleanPath
    );
}


/* =========================================================
   FETCH PRODUCTS FROM MONGODB
========================================================= */

async function fetchProducts() {

    const grid =
        document.getElementById(
            "allProductsGrid"
        );

    try {

        console.log(
            "================================="
        );

        console.log(
            "🛍️ Loading ShopHub Products..."
        );

        console.log(
            `📡 API: ${PRODUCTS_API}`
        );

        console.log(
            "================================="
        );

        const response =
            await fetch(
                PRODUCTS_API
            );

        if (!response.ok) {

            throw new Error(
                `API request failed: ${response.status}`
            );
        }

        const data =
            await response.json();

        console.log(
            "📦 API Response:",
            data
        );

        if (!data.success) {

            throw new Error(
                data.message ||
                "Failed to load products"
            );
        }

        shopProducts =
            Array.isArray(
                data.products
            )
                ? data.products
                : [];

        console.log(
            `✅ Products Loaded: ${shopProducts.length}`
        );

        renderAllProducts();

    } catch (error) {

        console.error(
            "❌ Product API Error:",
            error
        );

        if (grid) {

            grid.innerHTML = `

                <div class="col-12">

                    <div class="alert alert-danger text-center">

                        <i class="fas fa-exclamation-triangle"></i>

                        Unable to load products.

                        <br>

                        <small>
                            Please check the ShopHub backend connection.
                        </small>

                    </div>

                </div>

            `;
        }
    }
}


/* =========================================================
   RENDER ALL PRODUCTS
========================================================= */

function renderAllProducts() {

    const grid =
        document.getElementById(
            "allProductsGrid"
        );

    if (!grid) {

        console.warn(
            "⚠️ #allProductsGrid not found"
        );

        return;
    }

    if (!shopProducts.length) {

        grid.innerHTML = `

            <div class="col-12">

                <div class="alert alert-info text-center">

                    No products found.

                </div>

            </div>

        `;

        return;
    }

    grid.innerHTML = "";

    shopProducts.forEach(
        product => {

            const col =
                document.createElement(
                    "div"
                );

            col.className =
                "col-6 col-md-4 col-lg-3";

            /* IMAGE */

            const imageUrl =
                getImageUrl(
                    product.image,
                    product.category
                );

            /* PRODUCT DATA */

            const price =
                Number(product.price) || 0;

            const rating =
                Number(product.rating) || 0;

            const category =
                escapeHtml(
                    product.category
                );

            const name =
                escapeHtml(
                    product.name
                );

            const productId =
                String(
                    product._id || ""
                );

            console.log(
                `🖼️ ${product.name}:`,
                product.image,
                "→",
                imageUrl
            );

            /* PRODUCT CARD */

            col.innerHTML = `

                <div class="card h-100 shadow-sm product-card">

                    <!-- PRODUCT IMAGE -->

                    <div
                        class="product-image-wrapper product-details-link"
                        data-product-id="${escapeHtml(productId)}"
                        role="button"
                        tabindex="0"
                        title="View product details"
                    >

                        <img
                            src="${imageUrl}"
                            class="card-img-top"
                            alt="${name}"
                            loading="lazy"
                            onerror="handleImageError(this)"
                        >

                    </div>


                    <!-- PRODUCT BODY -->

                    <div class="card-body d-flex flex-column">

                        <!-- CATEGORY -->

                        <span class="text-muted small text-capitalize">
                            ${category}
                        </span>


                        <!-- PRODUCT NAME -->

                        <h6
                            class="card-title mb-1 product-details-link"
                            data-product-id="${escapeHtml(productId)}"
                            role="button"
                            tabindex="0"
                            title="View product details"
                        >
                            ${name}
                        </h6>


                        <!-- RATING -->

                        <div class="product-rating mb-2">

                            ${renderStars(rating)}

                            <small class="text-muted">
                                (${rating})
                            </small>

                        </div>


                        <!-- PRICE -->

                        <p class="fw-bold mb-3">
                            $${price.toFixed(2)}
                        </p>


                        <!-- ACTION BUTTONS -->

                        <div class="d-flex gap-2 mt-auto">

                            <!-- VIEW DETAILS -->

                            <button
                                type="button"
                                class="btn btn-outline-dark flex-grow-1 view-details-btn"
                                data-product-id="${escapeHtml(productId)}"
                            >
                                <i class="fas fa-eye"></i>
                                View
                            </button>


                            <!-- ADD TO CART -->

                            <button
                                type="button"
                                class="btn btn-dark flex-grow-1 add-to-cart-btn"
                                data-id="${escapeHtml(productId)}"
                            >
                                <i class="fas fa-cart-plus"></i>
                                Add
                            </button>

                        </div>

                    </div>

                </div>

            `;
            
            grid.appendChild(col);
        }
    );
}


/* =========================================================
   STAR RATING
========================================================= */

function renderStars(rating) {

    let stars = "";

    const roundedRating =
        Math.round(
            Number(rating) || 0
        );

    for (
        let i = 1;
        i <= 5;
        i++
    ) {

        if (i <= roundedRating) {

            stars += `
                <i class="fas fa-star"></i>
            `;

        } else {

            stars += `
                <i class="far fa-star"></i>
            `;
        }
    }

    return stars;
}


/* =========================================================
   IMAGE ERROR HANDLER
========================================================= */

function handleImageError(image) {

    if (!image) {
        return;
    }

    console.warn(
        "⚠️ Image failed:",
        image.src
    );

    /* Prevent infinite error loops */

    image.onerror = null;

    /* Remove broken image */

    image.removeAttribute(
        "src"
    );

    /* Add fallback class */

    image.classList.add(
        "img-fallback"
    );
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";
    }

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


/* =========================================================
   ADD PRODUCT TO CART
========================================================= */

function addProductToCart(productId) {

    const product =
        shopProducts.find(
            item =>
                String(item._id) ===
                String(productId)
        );

    if (!product) {

        console.error(
            "❌ Product not found:",
            productId
        );

        return;
    }

    const cart =
        getCart();

    const id =
        String(product._id);

    /* Add product */

    if (!cart[id]) {

        cart[id] = 1;

    } else {

        cart[id] =
            Number(cart[id]) + 1;
    }

    /* Save cart */

    saveCart(cart);

    /* Update cart badge */

    updateCartCount();

    /* Show toast */

    showToast(
        `${product.name} added to cart`
    );

    console.log(
        "🛒 Added to cart:",
        product.name,
        "Quantity:",
        cart[id]
    );
}


/* =========================================================
   ADD TO CART EVENTS
========================================================= */

function setupAddToCartEvents() {

    const grid =
        document.getElementById(
            "allProductsGrid"
        );

    if (!grid) {
        return;
    }

    /* Event delegation */

    grid.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    ".add-to-cart-btn"
                );

            if (!button) {
                return;
            }

            const productId =
                button.dataset.id;

            if (!productId) {

                console.error(
                    "❌ Missing product ID"
                );

                return;
            }

            addProductToCart(
                productId
            );
        }
    );
}


/* =========================================================
   PRODUCT DETAILS NAVIGATION
========================================================= */

function openProductDetails(productId) {

    if (!productId) {

        console.error(
            "❌ Missing product ID"
        );

        return;
    }

    console.log(
        "🔎 Opening product:",
        productId
    );

    window.location.href =
        `../product/index.html?id=${encodeURIComponent(productId)}`;
}


/* =========================================================
   PRODUCT DETAILS EVENTS
========================================================= */

function setupProductDetailsEvents() {

    const grid =
        document.getElementById(
            "allProductsGrid"
        );

    if (!grid) {
        return;
    }

    /* CLICK */

    grid.addEventListener(
        "click",
        event => {

            const detailsElement =
                event.target.closest(
                    ".view-details-btn, .product-details-link"
                );

            if (!detailsElement) {
                return;
            }

            /* Do not trigger details when Add button is clicked */

            if (
                event.target.closest(
                    ".add-to-cart-btn"
                )
            ) {

                return;
            }

            const productId =
                detailsElement.dataset.productId;

            if (!productId) {

                console.error(
                    "❌ Missing product ID"
                );

                return;
            }

            openProductDetails(
                productId
            );
        }
    );


    /* KEYBOARD ACCESSIBILITY */

    grid.addEventListener(
        "keydown",
        event => {

            if (
                event.key !== "Enter" &&
                event.key !== " "
            ) {

                return;
            }

            const detailsElement =
                event.target.closest(
                    ".product-details-link"
                );

            if (!detailsElement) {
                return;
            }

            event.preventDefault();

            const productId =
                detailsElement.dataset.productId;

            if (!productId) {
                return;
            }

            openProductDetails(
                productId
            );
        }
    );
}


/* =========================================================
   INITIALIZE SHOP PAGE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "🚀 ShopHub Shop Page Starting..."
        );

        /* Clear invalid cart */

        clearInvalidCart();

        /* Theme */

        initTheme();

        /* Cart count */

        updateCartCount();

        /* Add to cart */

        setupAddToCartEvents();

        /* Product details */

        setupProductDetailsEvents();

        /* Load MongoDB products */

        await fetchProducts();

        /* Update cart badge */

        updateCartCount();

        console.log(
            "✅ ShopHub Shop Page Ready"
        );
    }
);