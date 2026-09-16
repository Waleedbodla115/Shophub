/* =========================================================
   CONFIGURATION
========================================================= */

const THEME_KEY = "theme";
const WISHLIST_KEY = "wishlist";
const SHIPPING_FEE = 10;

/*
   Backend image server.

   Product images are stored like:

   /images/men/men-jacket.jpg
   /images/women/women-dress.jpg
   /images/electronics/Earbuds.jpg

   Frontend:
   5500 / 5501

   Backend:
   5000

   Therefore images must come from:

   http://localhost:5000/images/...
*/

const IMAGE_BASE_URL = "http://localhost:5000";


/* =========================================================
   CART STATE
========================================================= */

let cart = {};


/* =========================================================
   DOM ELEMENTS
========================================================= */

const cartItemsContainer =
    document.getElementById("cartItems");

const emptyCartElement =
    document.getElementById("emptyCart");

const cartItemsCountElement =
    document.getElementById("cartItemsCount");

const cartSubtotalElement =
    document.getElementById("cartSubtotal");

const cartShippingElement =
    document.getElementById("cartShipping");

const cartDiscountElement =
    document.getElementById("cartDiscount");

const cartTotalElement =
    document.getElementById("cartTotal");

const discountRow =
    document.getElementById("discountRow");

const checkoutButton =
    document.getElementById("checkoutBtn");

const themeToggle =
    document.getElementById("themeToggle");


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


    /* -----------------------------------------------------
       Already complete URL
    ----------------------------------------------------- */

    if (
        imagePath.startsWith("http://") ||
        imagePath.startsWith("https://") ||
        imagePath.startsWith("data:")
    ) {
        return imagePath;
    }


    /* -----------------------------------------------------
       Normalize Windows / accidental backslashes
    ----------------------------------------------------- */

    imagePath = imagePath.replace(/\\/g, "/");


    /* -----------------------------------------------------
       Remove accidental ./ from beginning
    ----------------------------------------------------- */

    imagePath = imagePath.replace(/^\.\/+/, "");


    /* -----------------------------------------------------
       IMPORTANT:
       Fix old/wrong assets/images path

       Example:

       /assets/images/electronics/Earbuds.jpg

       becomes:

       /images/electronics/Earbuds.jpg
    ----------------------------------------------------- */

    imagePath = imagePath.replace(
        /^\/?assets\/images\//i,
        "/images/"
    );


    /* -----------------------------------------------------
       If path already starts with /images/
    ----------------------------------------------------- */

    if (imagePath.startsWith("/images/")) {

        return (
            IMAGE_BASE_URL +
            imagePath
        );
    }


    /* -----------------------------------------------------
       If path starts with images/
    ----------------------------------------------------- */

    if (imagePath.startsWith("images/")) {

        return (
            IMAGE_BASE_URL +
            "/" +
            imagePath
        );
    }


    /* -----------------------------------------------------
       If database stores only filename

       Example:

       Earbuds.jpg

       becomes:

       http://localhost:5000/images/Earbuds.jpg
    ----------------------------------------------------- */

    if (!imagePath.includes("/")) {

        return (
            IMAGE_BASE_URL +
            "/images/" +
            encodeURIComponent(imagePath)
        );
    }


    /* -----------------------------------------------------
       Any remaining relative image path
    ----------------------------------------------------- */

    if (!imagePath.startsWith("/")) {
        imagePath = "/" + imagePath;
    }


    return (
        IMAGE_BASE_URL +
        imagePath
    );
}


/* =========================================================
   FORMAT CURRENCY
========================================================= */

function formatCurrency(amount) {

    const number =
        Number(amount) || 0;

    return `$${number.toFixed(2)}`;
}


/* =========================================================
   GET TOTAL CART QUANTITY
========================================================= */

function getTotalQuantity() {

    return Object.values(cart).reduce(
        (total, quantity) => {

            const qty =
                Number(quantity);

            if (
                !Number.isFinite(qty) ||
                qty <= 0
            ) {
                return total;
            }

            return (
                total +
                Math.floor(qty)
            );
        },
        0
    );
}


/* =========================================================
   CALCULATE SUBTOTAL
========================================================= */

function calculateSubtotal() {

    return Object.entries(cart).reduce(
        (subtotal, [productId, quantity]) => {

            const product =
                getProductById(productId);

            if (!product) {
                return subtotal;
            }

            const qty =
                Number(quantity);

            if (
                !Number.isFinite(qty) ||
                qty <= 0
            ) {
                return subtotal;
            }

            return (
                subtotal +
                (
                    Number(product.price) *
                    Math.floor(qty)
                )
            );
        },
        0
    );
}


/* =========================================================
   CALCULATE SHIPPING
========================================================= */

function calculateShipping(subtotal) {

    if (subtotal <= 0) {
        return 0;
    }

    /*
       Free shipping above $150
    */

    if (subtotal >= 150) {
        return 0;
    }

    return SHIPPING_FEE;
}


/* =========================================================
   CALCULATE DISCOUNT
========================================================= */

function calculateDiscount() {

    return 0;
}


/* =========================================================
   UPDATE CART NAVBAR COUNT
========================================================= */

function updateHeaderCartCount() {

    const totalItems =
        getTotalQuantity();

    document
        .querySelectorAll(".cart-count")
        .forEach(element => {

            element.textContent =
                totalItems;
        });
}


/* =========================================================
   UPDATE WISHLIST NAVBAR COUNT
========================================================= */

function updateWishlistCount() {

    let wishlist = [];

    try {

        const savedWishlist =
            localStorage.getItem(
                WISHLIST_KEY
            );

        if (savedWishlist) {

            const parsed =
                JSON.parse(savedWishlist);

            if (Array.isArray(parsed)) {

                wishlist = parsed;

            } else if (
                parsed &&
                typeof parsed === "object"
            ) {

                wishlist =
                    Object.keys(parsed)
                        .filter(
                            key =>
                                parsed[key]
                        );
            }
        }

    } catch (error) {

        console.error(
            "Unable to load wishlist:",
            error
        );
    }


    const count =
        wishlist.length;


    document
        .querySelectorAll(".wishlist-count")
        .forEach(element => {

            element.textContent =
                count;
        });
}


/* =========================================================
   UPDATE CART ITEMS COUNT
========================================================= */

function updateCartItemsCount() {

    if (!cartItemsCountElement) {
        return;
    }

    const totalItems =
        getTotalQuantity();

    cartItemsCountElement.textContent =
        `${totalItems} ${
            totalItems === 1
                ? "Item"
                : "Items"
        }`;
}


/* =========================================================
   CREATE IMAGE HTML
========================================================= */

function createProductImage(product) {

    const imageUrl =
        getProductImageUrl(
            product.image
        );


    if (!imageUrl) {

        return `
            <div class="cart-image-placeholder">
                <i class="fas fa-image"></i>
            </div>
        `;
    }


    return `
        <img
            src="${imageUrl}"
            alt="${product.name || "Product"}"
            loading="lazy"
            class="cart-product-image"
        >
    `;
}


/* =========================================================
   CREATE CART ITEM
========================================================= */

function createCartItem(
    product,
    quantity
) {

    const item =
        document.createElement("article");

    item.className =
        "cart-item";


    const itemTotal =
        Number(product.price) *
        quantity;


    item.innerHTML = `

        <!-- PRODUCT IMAGE -->

        <div class="cart-item-image">

            ${createProductImage(product)}

        </div>


        <!-- PRODUCT INFO -->

        <div class="cart-item-info">

            <span class="cart-item-category">

                ${product.category || "Product"}

            </span>


            <h3 class="cart-item-title">

                <a href="#">

                    ${product.name || "Product"}

                </a>

            </h3>


            <p class="cart-item-price">

                ${formatCurrency(product.price)}

                each

            </p>

        </div>


        <!-- ACTIONS -->

        <div class="cart-item-actions">


            <!-- TOTAL -->

            <div class="cart-item-total">

                ${formatCurrency(itemTotal)}

            </div>


            <!-- QUANTITY -->

            <div class="quantity-control">

                <button
                    type="button"
                    class="quantity-btn decrease-btn"
                    data-id="${product.id}"
                    aria-label="Decrease quantity"
                >

                    <i class="fas fa-minus"></i>

                </button>


                <span class="quantity-value">

                    ${quantity}

                </span>


                <button
                    type="button"
                    class="quantity-btn increase-btn"
                    data-id="${product.id}"
                    aria-label="Increase quantity"
                >

                    <i class="fas fa-plus"></i>

                </button>

            </div>


            <!-- REMOVE -->

            <button
                type="button"
                class="remove-item"
                data-id="${product.id}"
            >

                <i class="fas fa-trash"></i>

                Remove

            </button>

        </div>
    `;


    /* -----------------------------------------------------
       IMAGE ERROR FALLBACK
    ----------------------------------------------------- */

    const image =
        item.querySelector(
            ".cart-product-image"
        );


    if (image) {

        image.addEventListener(
            "error",
            function () {

                console.warn(
                    "⚠️ Cart image not found:",
                    this.src
                );


                const placeholder =
                    document.createElement("div");


                placeholder.className =
                    "cart-image-placeholder";


                placeholder.innerHTML =
                    `<i class="fas fa-image"></i>`;


                this.replaceWith(
                    placeholder
                );
            }
        );
    }


    return item;
}


/* =========================================================
   RENDER CART
========================================================= */

function renderCart() {

    if (!cartItemsContainer) {
        return;
    }


    cartItemsContainer.innerHTML = "";


    const validCartItems =
        Object.entries(cart)
            .filter(
                ([productId, quantity]) => {

                    const product =
                        getProductById(
                            productId
                        );

                    const qty =
                        Number(quantity);


                    return (
                        product &&
                        Number.isFinite(qty) &&
                        qty > 0
                    );
                }
            );


    /* -----------------------------------------------------
       EMPTY CART
    ----------------------------------------------------- */

    if (
        validCartItems.length === 0
    ) {

        if (emptyCartElement) {

            emptyCartElement.hidden =
                false;
        }


        cartItemsContainer.hidden =
            true;


        updateSummary();

        return;
    }


    /* -----------------------------------------------------
       CART HAS ITEMS
    ----------------------------------------------------- */

    if (emptyCartElement) {

        emptyCartElement.hidden =
            true;
    }


    cartItemsContainer.hidden =
        false;


    validCartItems.forEach(
        ([productId, quantity]) => {

            const product =
                getProductById(
                    productId
                );


            const qty =
                Math.floor(
                    Number(quantity)
                );


            const cartItem =
                createCartItem(
                    product,
                    qty
                );


            cartItemsContainer.appendChild(
                cartItem
            );
        }
    );


    updateSummary();
}


/* =========================================================
   UPDATE SUMMARY
========================================================= */

function updateSummary() {

    const subtotal =
        calculateSubtotal();


    const shipping =
        calculateShipping(
            subtotal
        );


    const discount =
        calculateDiscount();


    const total =
        subtotal +
        shipping -
        discount;


    if (cartSubtotalElement) {

        cartSubtotalElement.textContent =
            formatCurrency(
                subtotal
            );
    }


    if (cartShippingElement) {

        cartShippingElement.textContent =
            shipping === 0
                ? "FREE"
                : formatCurrency(
                    shipping
                );
    }


    if (cartDiscountElement) {

        cartDiscountElement.textContent =
            `-${formatCurrency(
                discount
            )}`;
    }


    if (cartTotalElement) {

        cartTotalElement.textContent =
            formatCurrency(
                total
            );
    }


    if (discountRow) {

        discountRow.hidden =
            discount <= 0;
    }


    if (checkoutButton) {

        checkoutButton.disabled =
            subtotal <= 0;
    }


    updateCartItemsCount();

    updateHeaderCartCount();

    updateWishlistCount();
}


/* =========================================================
   INCREASE QUANTITY
========================================================= */

function increaseQuantity(productId) {

    if (!cart[productId]) {

        cart[productId] = 1;

    } else {

        cart[productId] =
            Number(
                cart[productId]
            ) + 1;
    }


    syncCart();
}


/* =========================================================
   DECREASE QUANTITY
========================================================= */

function decreaseQuantity(productId) {

    if (!cart[productId]) {
        return;
    }


    const currentQuantity =
        Number(
            cart[productId]
        );


    if (
        currentQuantity <= 1
    ) {

        delete cart[productId];

    } else {

        cart[productId] =
            currentQuantity - 1;
    }


    syncCart();
}


/* =========================================================
   REMOVE PRODUCT
========================================================= */

function removeProduct(productId) {

    if (!cart[productId]) {
        return;
    }


    delete cart[productId];


    syncCart();
}


/* =========================================================
   CART CLICK EVENTS
========================================================= */

function setupCartEvents() {

    if (!cartItemsContainer) {
        return;
    }


    cartItemsContainer.addEventListener(
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


            /* INCREASE */

            if (
                button.classList.contains(
                    "increase-btn"
                )
            ) {

                increaseQuantity(
                    productId
                );

                return;
            }


            /* DECREASE */

            if (
                button.classList.contains(
                    "decrease-btn"
                )
            ) {

                decreaseQuantity(
                    productId
                );

                return;
            }


            /* REMOVE */

            if (
                button.classList.contains(
                    "remove-item"
                )
            ) {

                removeProduct(
                    productId
                );
            }
        }
    );
}


/* =========================================================
   CHECKOUT
========================================================= */

function setupCheckout() {

    if (!checkoutButton) {
        return;
    }


    checkoutButton.addEventListener(
        "click",
        () => {

            const totalItems =
                getTotalQuantity();


            if (totalItems <= 0) {

                alert(
                    "Your cart is empty."
                );

                return;
            }


            window.location.href =
                "../checkout/index.html";
        }
    );
}


/* =========================================================
   THEME INITIALIZATION
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
   UPDATE THEME ICON
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
   LOAD CART
========================================================= */

function loadCart() {

    try {

        const savedCart =
            localStorage.getItem(
                CART_KEY
            );


        if (!savedCart) {
            return;
        }


        const parsedCart =
            JSON.parse(
                savedCart
            );


        if (
            parsedCart &&
            typeof parsedCart === "object" &&
            !Array.isArray(parsedCart)
        ) {

            cart =
                parsedCart;
        }

    } catch (error) {

        console.error(
            "Unable to load cart:",
            error
        );
    }
}


/* =========================================================
   SAVE CART
========================================================= */

function saveCart() {

    try {

        localStorage.setItem(
            CART_KEY,
            JSON.stringify(cart)
        );

    } catch (error) {

        console.error(
            "Unable to save cart:",
            error
        );
    }
}


/* =========================================================
   SYNC CART
========================================================= */

function syncCart() {

    saveCart();

    renderCart();
}


/* =========================================================
   WISHLIST STORAGE LISTENER
========================================================= */

function setupWishlistStorageListener() {

    /*
       If wishlist changes in another page/tab,
       navbar count can update.
    */

    window.addEventListener(
        "storage",
        event => {

            if (
                event.key ===
                WISHLIST_KEY
            ) {

                updateWishlistCount();
            }


            if (
                event.key ===
                CART_KEY
            ) {

                loadCart();

                renderCart();
            }
        }
    );
}


/* =========================================================
   DEBUG INFORMATION
========================================================= */

function logCartState() {

    console.log(
        "🛒 Current Cart:",
        cart
    );


    console.log(
        "📦 Total Items:",
        getTotalQuantity()
    );


    console.log(
        "💰 Subtotal:",
        calculateSubtotal()
    );


    console.log(
        "❤️ Wishlist Count:",
        getWishlistCount()
    );
}


/* =========================================================
   GET WISHLIST COUNT
========================================================= */

function getWishlistCount() {

    try {

        const savedWishlist =
            localStorage.getItem(
                WISHLIST_KEY
            );


        if (!savedWishlist) {
            return 0;
        }


        const parsed =
            JSON.parse(
                savedWishlist
            );


        if (Array.isArray(parsed)) {

            return parsed.length;
        }


        if (
            parsed &&
            typeof parsed === "object"
        ) {

            return Object.keys(parsed)
                .filter(
                    key =>
                        parsed[key]
                )
                .length;
        }


        return 0;

    } catch (error) {

        return 0;
    }
}


/* =========================================================
   INITIALIZE CART (UPDATED: waits for products.js)
========================================================= */

async function initCart() {

    console.log(
        "🛒 ShopHub Cart Starting..."
    );

    // NEW: wait for products.js to finish loading real
    // products from the backend before reading/rendering
    // the cart — otherwise getProductById() returns null
    // for everything (since allProducts is still empty)
    // and the cart looks empty even though items exist.
    await window.productsReady;


    loadCart();


    initTheme();


    setupCartEvents();


    setupCheckout();


    setupWishlistStorageListener();


    renderCart();


    updateWishlistCount();


    logCartState();


    console.log(
        "✅ ShopHub Cart Ready"
    );
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
        initCart
    );

} else {

    initCart();
}