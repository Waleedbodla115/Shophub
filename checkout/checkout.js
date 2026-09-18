
/* =========================================================
   SHOPHUB CHECKOUT
   BACKEND-CONNECTED VERSION
========================================================= */

/* =========================================================
   CONFIGURATION
========================================================= */

const CHECKOUT_LAST_ORDER_KEY = "lastOrder";
const CHECKOUT_THEME_KEY = "theme";

const SHIPPING_FEE = 10;
const FREE_SHIPPING_LIMIT = 150;

/* ---------------------------------------------------------
   BACKEND CONFIGURATION

   Local:
   http://localhost:5000

   Production:
   https://shophub-bice.vercel.app
--------------------------------------------------------- */

const API_BASE_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000"
        : "https://shophub-bice.vercel.app";

const ORDERS_API =
    `${API_BASE_URL}/api/orders`;

const PRODUCTS_API =
    `${API_BASE_URL}/api/products`;

const AUTH_TOKEN_KEY = "authToken";
const AUTH_USER_KEY = "authUser";

const LOGIN_PAGE = "../login/index.html";


/* =========================================================
   CART KEY
========================================================= */

const CHECKOUT_CART_KEY =
    typeof CART_KEY !== "undefined"
        ? CART_KEY
        : "cart";


/* =========================================================
   DOM ELEMENTS
========================================================= */

const checkoutForm =
    document.getElementById("checkoutForm");

const checkoutProducts =
    document.getElementById("checkoutProducts");

const checkoutItemsCount =
    document.getElementById("checkoutItemsCount");

const checkoutSubtotal =
    document.getElementById("checkoutSubtotal");

const checkoutShipping =
    document.getElementById("checkoutShipping");

const checkoutDiscount =
    document.getElementById("checkoutDiscount");

const checkoutDiscountRow =
    document.getElementById("checkoutDiscountRow");

const checkoutTotal =
    document.getElementById("checkoutTotal");

const placeOrderButton =
    document.getElementById("placeOrderBtn");

const themeToggle =
    document.getElementById("themeToggle");


/* =========================================================
   CART STATE
========================================================= */

let cart = {};

let checkoutTotals = {
    subtotal: 0,
    shipping: 0,
    discount: 0,
    total: 0
};


/* ---------------------------------------------------------
   REAL PRODUCTS FROM BACKEND
--------------------------------------------------------- */

let checkoutProductsCache = [];


/* =========================================================
   AUTH HELPERS
========================================================= */

function getAuthToken() {
    try {
        return localStorage.getItem(
            AUTH_TOKEN_KEY
        );
    } catch (error) {
        return null;
    }
}


function getAuthUser() {
    try {
        const saved =
            localStorage.getItem(
                AUTH_USER_KEY
            );

        return saved
            ? JSON.parse(saved)
            : null;

    } catch (error) {
        return null;
    }
}


function requireAuthOrRedirect() {
    const token =
        getAuthToken();

    if (!token) {
        alert(
            "Please log in to place an order."
        );

        window.location.href =
            LOGIN_PAGE;

        return false;
    }

    return true;
}


/* =========================================================
   FETCH PRODUCTS FROM BACKEND
========================================================= */

async function fetchCheckoutProducts() {
    try {
        const response =
            await fetch(PRODUCTS_API);

        if (!response.ok) {
            throw new Error(
                `API request failed: ${response.status}`
            );
        }

        const data =
            await response.json();

        checkoutProductsCache =
            Array.isArray(data.products)
                ? data.products
                : [];

        console.log(
            "✅ Checkout products loaded:",
            checkoutProductsCache.length
        );

    } catch (error) {
        console.error(
            "Unable to load products for checkout:",
            error
        );

        checkoutProductsCache = [];
    }
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
   GET TOTAL QUANTITY
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
   GET PRODUCT BY ID
========================================================= */

function getCheckoutProductById(
    productId
) {
    const found =
        checkoutProductsCache.find(
            product =>
                String(product._id) ===
                String(productId)
        );

    if (!found) {
        return null;
    }

    return {
        ...found,
        id: found._id
    };
}


/* =========================================================
   GET VALID CART ITEMS
========================================================= */

function getValidCartItems() {
    return Object.entries(cart)
        .map(
            ([productId, quantity]) => {
                const product =
                    getCheckoutProductById(
                        productId
                    );

                const qty =
                    Math.floor(
                        Number(quantity)
                    );

                if (
                    !product ||
                    !Number.isFinite(qty) ||
                    qty <= 0
                ) {
                    return null;
                }

                return {
                    product,
                    quantity: qty
                };
            }
        )
        .filter(Boolean);
}


/* =========================================================
   CALCULATE SUBTOTAL
========================================================= */

function calculateSubtotal(items) {
    return items.reduce(
        (subtotal, item) => {
            const price =
                Number(
                    item.product.price
                ) || 0;

            return (
                subtotal +
                price * item.quantity
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

    if (
        subtotal >=
        FREE_SHIPPING_LIMIT
    ) {
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
   UPDATE HEADER CART COUNT
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
   UPDATE WISHLIST COUNT
========================================================= */

function updateWishlistCount() {
    const elements =
        document.querySelectorAll(
            ".wishlist-count"
        );

    let wishlist = [];

    try {
        const savedWishlist =
            localStorage.getItem(
                "wishlist"
            );

        if (!savedWishlist) {
            elements.forEach(
                element => {
                    element.textContent = "0";
                }
            );

            return;
        }

        const parsed =
            JSON.parse(
                savedWishlist
            );

        if (Array.isArray(parsed)) {
            wishlist = parsed;
        } else if (
            parsed &&
            typeof parsed === "object"
        ) {
            wishlist =
                Object.keys(parsed);
        }

    } catch (error) {
        console.warn(
            "Unable to load wishlist:",
            error
        );
    }

    elements.forEach(
        element => {
            element.textContent =
                wishlist.length;
        }
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
   BUILD CHECKOUT IMAGE URL
========================================================= */

function buildCheckoutImageUrl(image) {
    if (!image) {
        return "";
    }

    let imagePath =
        String(image).trim();

    if (!imagePath) {
        return "";
    }


    /* -----------------------------------------------------
       Already complete URL
    ----------------------------------------------------- */

    if (
        imagePath.startsWith("http://") ||
        imagePath.startsWith("https://")
    ) {
        return imagePath;
    }


    /* -----------------------------------------------------
       Normalize backslashes
    ----------------------------------------------------- */

    imagePath =
        imagePath.replace(
            /\\/g,
            "/"
        );


    /* -----------------------------------------------------
       Remove ./ prefix
    ----------------------------------------------------- */

    imagePath =
        imagePath.replace(
            /^\.\/+/,
            ""
        );


    /* -----------------------------------------------------
       Fix assets/images path
    ----------------------------------------------------- */

    imagePath =
        imagePath.replace(
            /^\/?assets\/images\//i,
            "/images/"
        );


    /* -----------------------------------------------------
       /images/... path
    ----------------------------------------------------- */

    if (
        imagePath.startsWith(
            "/images/"
        )
    ) {
        return (
            API_BASE_URL +
            imagePath
        );
    }


    /* -----------------------------------------------------
       images/... path
    ----------------------------------------------------- */

    if (
        imagePath.startsWith(
            "images/"
        )
    ) {
        return (
            API_BASE_URL +
            "/" +
            imagePath
        );
    }


    /* -----------------------------------------------------
       Relative image path
    ----------------------------------------------------- */

    if (
        imagePath.startsWith("/")
    ) {
        return (
            API_BASE_URL +
            imagePath
        );
    }


    return imagePath;
}


/* =========================================================
   CREATE CHECKOUT PRODUCT
========================================================= */

function createCheckoutProduct(
    product,
    quantity
) {
    const item =
        document.createElement(
            "article"
        );

    item.className =
        "checkout-product";

    const price =
        Number(product.price) || 0;

    const itemTotal =
        price * quantity;

    const imageUrl =
        buildCheckoutImageUrl(
            product.image
        );

    let imageHTML = "";


    /* -----------------------------------------------------
       IMAGE
    ----------------------------------------------------- */

    if (imageUrl) {
        imageHTML = `
            <img
                src="${escapeHTML(imageUrl)}"
                alt="${escapeHTML(
                    product.name || "Product"
                )}"
                loading="lazy"
                onerror="
                    this.style.display='none';
                    if(this.nextElementSibling){
                        this.nextElementSibling.style.display='grid';
                    }
                "
            >

            <div
                class="checkout-product-placeholder"
                style="display:none;"
            >
                <i class="fas fa-image"></i>
            </div>
        `;
    } else {
        imageHTML = `
            <div class="checkout-product-placeholder">
                <i class="fas fa-image"></i>
            </div>
        `;
    }


    /* -----------------------------------------------------
       PRODUCT HTML
    ----------------------------------------------------- */

    item.innerHTML = `
        <div class="checkout-product-image">
            ${imageHTML}
        </div>

        <div class="checkout-product-info">

            <h3 class="product-title">
                ${escapeHTML(
                    product.name ||
                    "Product"
                )}
            </h3>

            <span class="checkout-product-category">
                ${escapeHTML(
                    product.category ||
                    "Product"
                )}
            </span>

            <div class="checkout-product-meta">

                <span class="checkout-product-quantity">
                    Qty: ${quantity}
                </span>

                <span class="checkout-product-price">
                    ${formatCurrency(
                        itemTotal
                    )}
                </span>

            </div>

        </div>
    `;

    return item;
}


/* =========================================================
   RENDER CHECKOUT PRODUCTS
========================================================= */

function renderCheckoutProducts(
    items
) {
    if (!checkoutProducts) {
        return;
    }

    checkoutProducts.innerHTML = "";


    if (items.length === 0) {
        checkoutProducts.innerHTML = `
            <div class="checkout-empty">

                <div class="checkout-empty-icon">
                    <i class="fas fa-cart-shopping"></i>
                </div>

                <h3>
                    Your Cart is Empty
                </h3>

                <p>
                    Add products to your cart before checkout.
                </p>

            </div>
        `;

        return;
    }


    items.forEach(item => {
        checkoutProducts.appendChild(
            createCheckoutProduct(
                item.product,
                item.quantity
            )
        );
    });
}


/* =========================================================
   UPDATE CHECKOUT ITEMS COUNT
========================================================= */

function updateCheckoutItemsCount() {
    if (!checkoutItemsCount) {
        return;
    }

    const totalItems =
        getTotalQuantity();

    checkoutItemsCount.textContent =
        `${totalItems} ${
            totalItems === 1
                ? "Item"
                : "Items"
        }`;
}


/* =========================================================
   UPDATE CHECKOUT SUMMARY
========================================================= */

function updateCheckoutSummary(
    items
) {
    const subtotal =
        calculateSubtotal(items);

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

    checkoutTotals = {
        subtotal,
        shipping,
        discount,
        total
    };


    if (checkoutSubtotal) {
        checkoutSubtotal.textContent =
            formatCurrency(
                subtotal
            );
    }


    if (checkoutShipping) {
        checkoutShipping.textContent =
            shipping === 0
                ? "FREE"
                : formatCurrency(
                    shipping
                );
    }


    if (checkoutDiscount) {
        checkoutDiscount.textContent =
            `-${formatCurrency(
                discount
            )}`;
    }


    if (checkoutDiscountRow) {
        checkoutDiscountRow.hidden =
            discount <= 0;
    }


    if (checkoutTotal) {
        checkoutTotal.textContent =
            formatCurrency(
                total
            );
    }
}


/* =========================================================
   LOAD CART
========================================================= */

function loadCart() {
    try {
        const savedCart =
            localStorage.getItem(
                CHECKOUT_CART_KEY
            );

        if (!savedCart) {
            cart = {};
            return;
        }

        const parsedCart =
            JSON.parse(
                savedCart
            );


        /* -------------------------------------------------
           Object format
        ------------------------------------------------- */

        if (
            parsedCart &&
            typeof parsedCart === "object" &&
            !Array.isArray(parsedCart)
        ) {
            cart = parsedCart;
            return;
        }


        /* -------------------------------------------------
           Array format
        ------------------------------------------------- */

        if (Array.isArray(parsedCart)) {
            const normalizedCart =
                {};

            parsedCart.forEach(
                item => {
                    if (!item) {
                        return;
                    }

                    const id =
                        item.id ||
                        item.productId ||
                        item._id;

                    const quantity =
                        Number(
                            item.quantity ||
                            1
                        );

                    if (
                        id !== undefined &&
                        quantity > 0
                    ) {
                        normalizedCart[id] =
                            (
                                normalizedCart[id] ||
                                0
                            ) + quantity;
                    }
                }
            );

            cart =
                normalizedCart;

            return;
        }

        cart = {};

    } catch (error) {
        console.error(
            "Unable to load checkout cart:",
            error
        );

        cart = {};
    }
}


/* =========================================================
   SAVE LAST ORDER
========================================================= */

function saveLastOrder(order) {
    try {
        localStorage.setItem(
            CHECKOUT_LAST_ORDER_KEY,
            JSON.stringify(order)
        );
    } catch (error) {
        console.error(
            "Unable to save last order:",
            error
        );
    }
}


/* =========================================================
   CLEAR CART
========================================================= */

function clearCart() {
    cart = {};

    try {
        localStorage.removeItem(
            CHECKOUT_CART_KEY
        );
    } catch (error) {
        console.error(
            "Unable to clear cart:",
            error
        );
    }
}


/* =========================================================
   INPUT / VALIDATION HELPERS
========================================================= */

function getInputValue(id) {
    const element =
        document.getElementById(id);

    if (!element) {
        return "";
    }

    return element.value.trim();
}


function clearFormErrors() {
    document
        .querySelectorAll(".form-error")
        .forEach(element => {
            element.textContent = "";
        });

    document
        .querySelectorAll(".input-error")
        .forEach(element => {
            element.classList.remove(
                "input-error"
            );
        });
}


function setFieldError(
    inputId,
    errorId,
    message
) {
    const input =
        document.getElementById(
            inputId
        );

    const error =
        document.getElementById(
            errorId
        );

    if (input) {
        input.classList.add(
            "input-error"
        );
    }

    if (error) {
        error.textContent =
            message;
    }
}


function validateCheckoutForm() {
    clearFormErrors();

    let isValid = true;


    /* FULL NAME */

    const fullName =
        getInputValue(
            "fullName"
        );

    if (fullName.length < 3) {
        setFieldError(
            "fullName",
            "fullNameError",
            "Please enter your full name."
        );

        isValid = false;
    }


    /* EMAIL */

    const email =
        getInputValue(
            "email"
        );

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
        !emailPattern.test(email)
    ) {
        setFieldError(
            "email",
            "emailError",
            "Please enter a valid email address."
        );

        isValid = false;
    }


    /* PHONE */

    const phone =
        getInputValue(
            "phone"
        );

    const phoneDigits =
        phone.replace(
            /\D/g,
            ""
        );

    if (
        phoneDigits.length < 7
    ) {
        setFieldError(
            "phone",
            "phoneError",
            "Please enter a valid phone number."
        );

        isValid = false;
    }


    /* ADDRESS */

    const address =
        getInputValue(
            "address"
        );

    if (address.length < 5) {
        setFieldError(
            "address",
            "addressError",
            "Please enter your complete address."
        );

        isValid = false;
    }


    /* CITY */

    const city =
        getInputValue(
            "city"
        );

    if (city.length < 2) {
        setFieldError(
            "city",
            "cityError",
            "Please enter your city."
        );

        isValid = false;
    }

    return isValid;
}


/* =========================================================
   PAYMENT METHOD
========================================================= */

function getPaymentMethod() {
    const selectedPayment =
        document.querySelector(
            'input[name="paymentMethod"]:checked'
        );

    const rawValue =
        selectedPayment
            ? selectedPayment.value
            : "cash_on_delivery";


    /*
       Backend allowed values:

       Cash on Delivery
       Card
       Online Payment
    */

    const paymentMap = {
        cash_on_delivery:
            "Cash on Delivery",

        online:
            "Online Payment",

        card:
            "Card"
    };

    return (
        paymentMap[rawValue] ||
        "Cash on Delivery"
    );
}


/* =========================================================
   BUILD ORDER PAYLOAD
========================================================= */

function buildOrderPayload(
    items
) {
    return {
        customerName:
            getInputValue(
                "fullName"
            ),

        customerEmail:
            getInputValue(
                "email"
            ),

        customerPhone:
            getInputValue(
                "phone"
            ),

        shippingAddress: {
            address:
                getInputValue(
                    "address"
                ),

            city:
                getInputValue(
                    "city"
                ),

            postalCode:
                getInputValue(
                    "postalCode"
                ),

            country:
                "Pakistan"
        },

        items: items.map(
            item => ({
                product:
                    item.product.id,

                quantity:
                    item.quantity
            })
        ),

        paymentMethod:
            getPaymentMethod(),

        discount:
            checkoutTotals.discount ||
            0
    };
}


/* =========================================================
   PLACE ORDER
========================================================= */

async function placeOrder() {
    const items =
        getValidCartItems();


    /* -----------------------------------------------------
       EMPTY CART
    ----------------------------------------------------- */

    if (items.length === 0) {
        alert(
            "Your cart is empty. Please add products before checkout."
        );

        window.location.href =
            "../shop/index.html";

        return;
    }


    /* -----------------------------------------------------
       FORM VALIDATION
    ----------------------------------------------------- */

    if (!validateCheckoutForm()) {
        const firstError =
            document.querySelector(
                ".input-error"
            );

        if (firstError) {
            firstError.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            firstError.focus();
        }

        return;
    }


    /* -----------------------------------------------------
       AUTH
    ----------------------------------------------------- */

    if (!requireAuthOrRedirect()) {
        return;
    }

    const token =
        getAuthToken();


    /* -----------------------------------------------------
       BUTTON LOADING
    ----------------------------------------------------- */

    if (placeOrderButton) {
        placeOrderButton.disabled =
            true;

        placeOrderButton.innerHTML = `
            <span>
                Placing Order...
            </span>

            <i class="fas fa-spinner fa-spin"></i>
        `;
    }


    const payload =
        buildOrderPayload(
            items
        );


    try {

        /* -------------------------------------------------
           CREATE ORDER
        ------------------------------------------------- */

        const response =
            await fetch(
                ORDERS_API,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`
                    },

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );


        let data = null;

        try {
            data =
                await response.json();

        } catch (jsonError) {
            throw new Error(
                "Invalid response received from server."
            );
        }


        /* -------------------------------------------------
           AUTH EXPIRED
        ------------------------------------------------- */

        if (
            response.status === 401
        ) {
            localStorage.removeItem(
                AUTH_TOKEN_KEY
            );

            localStorage.removeItem(
                AUTH_USER_KEY
            );

            alert(
                "Your session has expired. Please log in again."
            );

            window.location.href =
                LOGIN_PAGE;

            return;
        }


        /* -------------------------------------------------
           ORDER ERROR
        ------------------------------------------------- */

        if (
            !response.ok ||
            !data.success
        ) {
            throw new Error(
                data.message ||
                "Failed to place order."
            );
        }


        /* -------------------------------------------------
           SAVE ORDER
        ------------------------------------------------- */

        saveLastOrder(
            data.order
        );


        /* -------------------------------------------------
           ONLINE PAYMENT
        ------------------------------------------------- */

        if (
            payload.paymentMethod !==
            "Cash on Delivery"
        ) {

            const paymentResponse =
                await fetch(
                    `${API_BASE_URL}/api/payments/create-checkout-session`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            "Authorization":
                                `Bearer ${token}`
                        },

                        body:
                            JSON.stringify({
                                orderId:
                                    data.order.id
                            })
                    }
                );


            const paymentData =
                await paymentResponse
                    .json()
                    .catch(
                        () => ({})
                    );


            if (
                !paymentResponse.ok ||
                !paymentData.success ||
                !paymentData.url
            ) {
                throw new Error(
                    paymentData.message ||
                    "Online payment is not configured."
                );
            }


            clearCart();

            window.location.href =
                paymentData.url;

            return;
        }


        /* -------------------------------------------------
           CASH ON DELIVERY
        ------------------------------------------------- */

        clearCart();

        window.location.href =
            "./success.html";

    } catch (error) {

        console.error(
            "❌ Place Order Error:",
            error
        );

        alert(
            error.message ||
            "Unable to place your order. Please try again."
        );


        if (placeOrderButton) {
            placeOrderButton.disabled =
                false;

            placeOrderButton.innerHTML = `
                <span>
                    Place Order
                </span>

                <i class="fas fa-arrow-right"></i>
            `;
        }
    }
}


/* =========================================================
   FORM SUBMIT
========================================================= */

function setupForm() {
    if (!checkoutForm) {
        return;
    }

    checkoutForm.addEventListener(
        "submit",
        event => {
            event.preventDefault();

            placeOrder();
        }
    );
}


/* =========================================================
   PAYMENT UI EVENTS
========================================================= */

function setupPaymentMethods() {
    const paymentOptions =
        document.querySelectorAll(
            ".payment-option"
        );

    paymentOptions.forEach(
        option => {

            const input =
                option.querySelector(
                    'input[name="paymentMethod"]'
                );

            if (
                !input ||
                input.disabled
            ) {
                return;
            }


            input.addEventListener(
                "change",
                () => {

                    document
                        .querySelectorAll(
                            ".payment-option"
                        )
                        .forEach(
                            item => {
                                item.classList.remove(
                                    "active"
                                );
                            }
                        );


                    if (
                        input.checked
                    ) {
                        option.classList.add(
                            "active"
                        );
                    }
                }
            );
        }
    );
}


/* =========================================================
   THEME
========================================================= */

function initTheme() {
    const savedTheme =
        localStorage.getItem(
            CHECKOUT_THEME_KEY
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
                CHECKOUT_THEME_KEY,
                isDark
                    ? "dark"
                    : "light"
            );

            updateThemeIcon();
        }
    );
}


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
   INPUT EVENTS
========================================================= */

function setupInputEvents() {
    const inputs =
        document.querySelectorAll(
            "input, textarea"
        );

    inputs.forEach(
        input => {

            input.addEventListener(
                "input",
                () => {

                    input.classList.remove(
                        "input-error"
                    );


                    if (!input.id) {
                        return;
                    }


                    const errorElement =
                        document.getElementById(
                            `${input.id}Error`
                        );


                    if (errorElement) {
                        errorElement.textContent =
                            "";
                    }
                }
            );
        }
    );
}


/* =========================================================
   PREFILL CUSTOMER INFO
========================================================= */

function prefillCustomerInfo() {
    const user =
        getAuthUser();

    if (!user) {
        return;
    }


    const nameInput =
        document.getElementById(
            "fullName"
        );

    const emailInput =
        document.getElementById(
            "email"
        );


    if (
        nameInput &&
        user.name &&
        !nameInput.value
    ) {
        nameInput.value =
            user.name;
    }


    if (
        emailInput &&
        user.email &&
        !emailInput.value
    ) {
        emailInput.value =
            user.email;
    }
}


/* =========================================================
   RENDER CHECKOUT
========================================================= */

function renderCheckout() {
    const items =
        getValidCartItems();

    renderCheckoutProducts(
        items
    );

    updateCheckoutSummary(
        items
    );

    updateCheckoutItemsCount();

    updateHeaderCartCount();

    updateWishlistCount();


    if (placeOrderButton) {
        placeOrderButton.disabled =
            items.length === 0;
    }
}


/* =========================================================
   PAYMENT CANCELLED BANNER
========================================================= */

function checkPaymentCancelled() {
    const params =
        new URLSearchParams(
            window.location.search
        );


    if (
        params.get(
            "payment_cancelled"
        ) !== "1"
    ) {
        return;
    }


    const banner =
        document.getElementById(
            "paymentCancelledBanner"
        );


    if (banner) {
        banner.style.display =
            "flex";
    }


    const dismissBtn =
        document.getElementById(
            "dismissPaymentCancelledBanner"
        );


    if (dismissBtn) {
        dismissBtn.addEventListener(
            "click",
            () => {
                banner.style.display =
                    "none";
            }
        );
    }


    /* -----------------------------------------------------
       Clean URL
    ----------------------------------------------------- */

    const cleanUrl =
        window.location.pathname;

    window.history.replaceState(
        {},
        document.title,
        cleanUrl
    );
}


/* =========================================================
   INITIALIZE CHECKOUT
========================================================= */

async function initCheckout() {
    console.log(
        "🛍️ ShopHub Checkout Starting..."
    );


    /* -----------------------------------------------------
       REQUIRE LOGIN
    ----------------------------------------------------- */

    if (
        !requireAuthOrRedirect()
    ) {
        return;
    }


    /* -----------------------------------------------------
       PAYMENT CANCELLED
    ----------------------------------------------------- */

    checkPaymentCancelled();


    /* -----------------------------------------------------
       LOAD REAL PRODUCTS FROM BACKEND
    ----------------------------------------------------- */

    await fetchCheckoutProducts();


    /*
       If backend failed, don't silently create
       an invalid order.
    */

    if (
        checkoutProductsCache.length === 0
    ) {
        console.warn(
            "⚠️ No products were loaded from backend."
        );
    }


    /* -----------------------------------------------------
       LOAD CART
    ----------------------------------------------------- */

    loadCart();


    /* -----------------------------------------------------
       INITIALIZE UI
    ----------------------------------------------------- */

    initTheme();

    setupForm();

    setupPaymentMethods();

    setupInputEvents();

    prefillCustomerInfo();

    renderCheckout();


    console.log(
        "✅ ShopHub Checkout Ready"
    );

    console.log(
        "🌐 Checkout API:",
        API_BASE_URL
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
        initCheckout
    );
} else {
    initCheckout();
}

