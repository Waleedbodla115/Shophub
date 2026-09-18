
"use strict";

/* =========================================================
   SHOPHUB ADMIN DASHBOARD
   admin.js
   BACKEND + MONGODB VERSION
========================================================= */


/* =========================================================
   CONFIGURATION
========================================================= */

const ADMIN_API_BASE =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000"
        : "https://shophub-bice.vercel.app";

const ADMIN_API_URL =
    `${ADMIN_API_BASE}/api`;

const ORDERS_KEY = "orders";
const THEME_KEY = "theme";


/* =========================================================
   STATE
========================================================= */

let orders = [];
let isLoadingOrders = false;


/* =========================================================
   DOM ELEMENTS
========================================================= */

const totalOrdersElement =
    document.getElementById("totalOrders");

const totalSalesElement =
    document.getElementById("totalSales");

const pendingOrdersElement =
    document.getElementById("pendingOrders");

const deliveredOrdersElement =
    document.getElementById("deliveredOrders");

const statusPendingElement =
    document.getElementById("statusPending");

const statusProcessingElement =
    document.getElementById("statusProcessing");

const statusShippedElement =
    document.getElementById("statusShipped");

const statusDeliveredElement =
    document.getElementById("statusDelivered");

const statusCancelledElement =
    document.getElementById("statusCancelled");

const recentOrdersElement =
    document.getElementById("recentOrders");

const themeToggle =
    document.getElementById("themeToggle");

const refreshDashboardButton =
    document.getElementById("refreshDashboardBtn");

const quickRefreshButton =
    document.getElementById("quickRefreshBtn");


/* =========================================================
   AUTH HELPERS
========================================================= */

function getAdminToken() {

    return (
        localStorage.getItem("authToken") ||
        localStorage.getItem("adminToken") ||
        localStorage.getItem("shophub_token") ||
        ""
    );
}


function getAdminUser() {

    try {

        const savedUser =
            localStorage.getItem("authUser");

        if (savedUser) {

            return JSON.parse(savedUser);
        }


        const oldUser =
            localStorage.getItem("shophub_admin");

        if (oldUser) {

            return JSON.parse(oldUser);
        }

    } catch (error) {

        console.error(
            "❌ Unable to read admin user:",
            error
        );

    }

    return null;
}


function isAdminAuthenticated() {

    const token =
        getAdminToken();

    const user =
        getAdminUser();

    return Boolean(
        token &&
        user &&
        user.isAdmin === true
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
   NORMALIZE STATUS
========================================================= */

function normalizeStatus(status) {

    if (!status) {

        return "Pending";
    }

    return String(status)
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .replace(/\b\w/g, letter =>
            letter.toUpperCase()
        );
}


/* =========================================================
   GET ORDER TOTAL
========================================================= */

function getOrderTotal(order) {

    if (!order) {

        return 0;
    }


    if (
        order.summary &&
        order.summary.total !== undefined &&
        order.summary.total !== null
    ) {

        const total =
            Number(order.summary.total);

        if (Number.isFinite(total)) {

            return total;
        }
    }


    if (
        order.total !== undefined &&
        order.total !== null
    ) {

        const total =
            Number(order.total);

        if (Number.isFinite(total)) {

            return total;
        }
    }


    if (
        order.amount !== undefined &&
        order.amount !== null
    ) {

        const amount =
            Number(order.amount);

        if (Number.isFinite(amount)) {

            return amount;
        }
    }


    if (Array.isArray(order.items)) {

        return order.items.reduce(
            (total, item) => {

                const price =
                    Number(
                        item.price ||
                        item.productPrice ||
                        0
                    );

                const quantity =
                    Number(
                        item.quantity ||
                        1
                    );

                return total +
                    price * quantity;

            },
            0
        );
    }


    return 0;
}


/* =========================================================
   GET CUSTOMER NAME
========================================================= */

function getCustomerName(order) {

    if (!order) {

        return "Guest Customer";
    }


    if (
        order.customer &&
        order.customer.fullName
    ) {

        return order.customer.fullName;
    }


    if (
        order.customer &&
        order.customer.name
    ) {

        return order.customer.name;
    }


    if (
        order.user &&
        order.user.name
    ) {

        return order.user.name;
    }


    if (order.customerName) {

        return order.customerName;
    }


    if (order.name) {

        return order.name;
    }


    return "Guest Customer";
}


/* =========================================================
   GET ORDER ID
========================================================= */

function getOrderId(order) {

    if (!order) {

        return "Unknown Order";
    }


    if (order.orderId) {

        return String(order.orderId);
    }


    if (order.orderNumber) {

        return String(order.orderNumber);
    }


    if (order.orderNo) {

        return String(order.orderNo);
    }


    if (order._id) {

        return `#${String(order._id).slice(-8).toUpperCase()}`;
    }


    if (order.id) {

        return `#${String(order.id).slice(-8).toUpperCase()}`;
    }


    return "Unknown Order";
}


/* =========================================================
   GET ORDER DATE
========================================================= */

function getOrderDate(order) {

    if (!order) {

        return "Date unavailable";
    }


    const rawDate =
        order.createdAt ||
        order.created_at ||
        order.date ||
        order.orderDate;


    if (!rawDate) {

        return "Date unavailable";
    }


    const date =
        new Date(rawDate);


    if (Number.isNaN(date.getTime())) {

        return "Date unavailable";
    }


    return date.toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    );
}


/* =========================================================
   GET ORDER TIMESTAMP
========================================================= */

function getOrderTimestamp(order) {

    if (!order) {

        return 0;
    }


    const rawDate =
        order.createdAt ||
        order.created_at ||
        order.date ||
        order.orderDate;


    if (!rawDate) {

        return 0;
    }


    const timestamp =
        new Date(rawDate).getTime();


    return Number.isFinite(timestamp)
        ? timestamp
        : 0;
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
   STATUS CLASS
========================================================= */

function getStatusClass(status) {

    return normalizeStatus(status)
        .toLowerCase()
        .replace(/\s+/g, "-");
}


/* =========================================================
   LOAD ORDERS FROM LOCAL STORAGE
========================================================= */

function loadOrdersFromLocalStorage() {

    try {

        const savedOrders =
            localStorage.getItem(ORDERS_KEY);


        if (!savedOrders) {

            orders = [];

            return;
        }


        const parsedOrders =
            JSON.parse(savedOrders);


        if (Array.isArray(parsedOrders)) {

            orders = parsedOrders;

        } else {

            orders = [];
        }

    } catch (error) {

        console.error(
            "❌ Unable to load local orders:",
            error
        );

        orders = [];
    }
}


/* =========================================================
   SAVE ORDERS TO LOCAL STORAGE
========================================================= */

function saveOrdersToLocalStorage() {

    try {

        localStorage.setItem(
            ORDERS_KEY,
            JSON.stringify(orders)
        );

    } catch (error) {

        console.error(
            "❌ Unable to save orders:",
            error
        );

    }
}


/* =========================================================
   LOAD ORDERS FROM BACKEND
========================================================= */

async function loadAdminOrdersFromAPI() {

    const token =
        getAdminToken();

    const user =
        getAdminUser();


    if (
        !token ||
        !user ||
        user.isAdmin !== true
    ) {

        console.warn(
            "⚠️ Admin authentication not found."
        );

        return false;
    }


    try {

        console.log(
            "🌐 Loading orders from MongoDB..."
        );


        const response =
            await fetch(
                `${ADMIN_API_URL}/orders`,
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`,

                        "Content-Type":
                            "application/json"
                    }
                }
            );


        if (response.status === 401) {

            console.error(
                "❌ Admin authentication expired."
            );

            return false;
        }


        if (response.status === 403) {

            console.error(
                "❌ Admin access denied."
            );

            return false;
        }


        let data = {};

        try {

            data =
                await response.json();

        } catch (jsonError) {

            console.error(
                "❌ Invalid API response."
            );

            return false;
        }


        console.log(
            "📦 Orders API response:",
            data
        );


        if (!response.ok) {

            console.error(
                "❌ Orders API error:",
                data.message ||
                response.statusText
            );

            return false;
        }


        if (data.success !== true) {

            console.error(
                "❌ Orders API returned unsuccessful response:",
                data.message
            );

            return false;
        }


        let apiOrders = [];


        if (Array.isArray(data.orders)) {

            apiOrders =
                data.orders;

        } else if (Array.isArray(data.data)) {

            apiOrders =
                data.data;

        } else if (Array.isArray(data.results)) {

            apiOrders =
                data.results;
        }


        orders =
            apiOrders;


        saveOrdersToLocalStorage();


        console.log(
            `✅ ${orders.length} orders loaded from MongoDB.`
        );


        return true;

    } catch (error) {

        console.error(
            "❌ Admin API sync failed:",
            error
        );

        return false;
    }
}


/* =========================================================
   UPDATE STATISTICS
========================================================= */

function updateStatistics() {

    const totalOrders =
        orders.length;


    const totalSales =
        orders.reduce(
            (total, order) => {

                return total +
                    getOrderTotal(order);

            },
            0
        );


    const pending =
        orders.filter(
            order =>
                normalizeStatus(
                    order.status
                ) === "Pending"
        ).length;


    const processing =
        orders.filter(
            order =>
                normalizeStatus(
                    order.status
                ) === "Processing"
        ).length;


    const shipped =
        orders.filter(
            order =>
                normalizeStatus(
                    order.status
                ) === "Shipped"
        ).length;


    const delivered =
        orders.filter(
            order =>
                normalizeStatus(
                    order.status
                ) === "Delivered"
        ).length;


    const cancelled =
        orders.filter(
            order =>
                normalizeStatus(
                    order.status
                ) === "Cancelled"
        ).length;


    if (totalOrdersElement) {

        totalOrdersElement.textContent =
            totalOrders;
    }


    if (totalSalesElement) {

        totalSalesElement.textContent =
            formatCurrency(totalSales);
    }


    if (pendingOrdersElement) {

        pendingOrdersElement.textContent =
            pending;
    }


    if (deliveredOrdersElement) {

        deliveredOrdersElement.textContent =
            delivered;
    }


    if (statusPendingElement) {

        statusPendingElement.textContent =
            pending;
    }


    if (statusProcessingElement) {

        statusProcessingElement.textContent =
            processing;
    }


    if (statusShippedElement) {

        statusShippedElement.textContent =
            shipped;
    }


    if (statusDeliveredElement) {

        statusDeliveredElement.textContent =
            delivered;
    }


    if (statusCancelledElement) {

        statusCancelledElement.textContent =
            cancelled;
    }
}


/* =========================================================
   RENDER RECENT ORDERS
========================================================= */

function renderRecentOrders() {

    if (!recentOrdersElement) {

        console.warn(
            "⚠️ #recentOrders element not found."
        );

        return;
    }


    if (!orders.length) {

        recentOrdersElement.innerHTML = `

            <div class="no-orders">

                <i class="fas fa-box-open"></i>

                <h3>
                    No Orders Yet
                </h3>

                <p>
                    Customer orders will appear here.
                </p>

            </div>

        `;

        return;
    }


    const recentOrders =
        [...orders]
            .sort(
                (a, b) =>
                    getOrderTimestamp(b) -
                    getOrderTimestamp(a)
            )
            .slice(0, 5);


    recentOrdersElement.innerHTML = "";


    recentOrders.forEach(order => {

        const status =
            normalizeStatus(
                order.status
            );


        const statusClass =
            getStatusClass(status);


        const customerName =
            getCustomerName(order);


        const orderId =
            getOrderId(order);


        const orderDate =
            getOrderDate(order);


        const orderTotal =
            getOrderTotal(order);


        const orderElement =
            document.createElement("article");


        orderElement.className =
            "recent-order";


        orderElement.innerHTML = `

            <div class="recent-order-icon">

                <i class="fas fa-box"></i>

            </div>


            <div class="recent-order-info">

                <strong>
                    ${escapeHTML(customerName)}
                </strong>

                <small>
                    ${escapeHTML(orderId)}
                    •
                    ${escapeHTML(orderDate)}
                </small>

            </div>


            <div class="recent-order-right">

                <span class="recent-order-total">

                    ${formatCurrency(orderTotal)}

                </span>


                <span
                    class="order-status ${escapeHTML(statusClass)}">

                    ${escapeHTML(status)}

                </span>

            </div>

        `;


        recentOrdersElement.appendChild(
            orderElement
        );

    });
}


/* =========================================================
   REFRESH DASHBOARD
========================================================= */

async function refreshDashboard() {

    if (isLoadingOrders) {

        console.log(
            "⏳ Dashboard refresh already running..."
        );

        return;
    }


    isLoadingOrders = true;


    console.log(
        "🔄 Refreshing ShopHub Admin Dashboard..."
    );


    try {

        const loadedFromAPI =
            await loadAdminOrdersFromAPI();


        if (!loadedFromAPI) {

            console.warn(
                "⚠️ Backend orders unavailable. Using localStorage."
            );

            loadOrdersFromLocalStorage();

        }


        updateStatistics();

        renderRecentOrders();


        console.log(
            "📦 Total Orders:",
            orders.length
        );


        console.log(
            "💰 Dashboard Updated"
        );

    } catch (error) {

        console.error(
            "❌ Dashboard refresh error:",
            error
        );

        loadOrdersFromLocalStorage();

        updateStatistics();

        renderRecentOrders();

    } finally {

        isLoadingOrders = false;
    }
}


/* =========================================================
   UPDATE ORDER STATUS THROUGH API
========================================================= */

async function updateAdminOrderStatusAPI(
    orderId,
    status
) {

    const token =
        getAdminToken();


    if (!token) {

        throw new Error(
            "Admin authentication token not found."
        );
    }


    if (!orderId) {

        throw new Error(
            "Order ID is required."
        );
    }


    if (!status) {

        throw new Error(
            "Order status is required."
        );
    }


    try {

        console.log(
            "🔄 Updating order status:",
            orderId,
            status
        );


        const response =
            await fetch(
                `${ADMIN_API_URL}/orders/${encodeURIComponent(orderId)}/status`,
                {
                    method: "PUT",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`
                    },

                    body: JSON.stringify({
                        status: status
                    })
                }
            );


        const data =
            await response
                .json()
                .catch(() => ({}));


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Unable to update order status."
            );
        }


        if (data.success !== true) {

            throw new Error(
                data.message ||
                "Unable to update order status."
            );
        }


        console.log(
            "✅ Order status updated:",
            data
        );


        await refreshDashboard();


        return data.order;

    } catch (error) {

        console.error(
            "❌ Update order status error:",
            error
        );

        throw error;
    }
}


/* =========================================================
   THEME ICON
========================================================= */

function updateThemeIcon() {

    if (!themeToggle) {

        return;
    }


    const icon =
        themeToggle.querySelector("i");


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


    if (savedTheme === "dark") {

        document.body.classList.add(
            "dark-mode"
        );

    } else {

        document.body.classList.remove(
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
   REFRESH BUTTONS
========================================================= */

function setupRefreshButtons() {

    if (refreshDashboardButton) {

        refreshDashboardButton.addEventListener(
            "click",
            async () => {

                await refreshDashboard();

            }
        );
    }


    if (quickRefreshButton) {

        quickRefreshButton.addEventListener(
            "click",
            async () => {

                await refreshDashboard();

            }
        );
    }
}


/* =========================================================
   STORAGE LISTENER
========================================================= */

function setupStorageListener() {

    window.addEventListener(
        "storage",
        event => {

            if (
                event.key === ORDERS_KEY
            ) {

                console.log(
                    "🔄 Orders changed in another tab."
                );


                refreshDashboard();

            }


            if (
                event.key === "authToken" ||
                event.key === "authUser"
            ) {

                refreshDashboard();

            }

        }
    );
}


/* =========================================================
   AUTO REFRESH
========================================================= */

function setupAutoRefresh() {

    setInterval(
        () => {

            refreshDashboard();

        },
        30000
    );

}


/* =========================================================
   DEBUG
========================================================= */

function logAdminState() {

    const user =
        getAdminUser();


    console.log(
        "🛍️ ShopHub Admin"
    );


    console.log(
        "👤 Admin User:",
        user
    );


    console.log(
        "🔐 Admin Authenticated:",
        isAdminAuthenticated()
    );


    console.log(
        "📦 Orders:",
        orders
    );


    console.log(
        "📊 Total Orders:",
        orders.length
    );


    console.log(
        "🌐 Admin API:",
        ADMIN_API_BASE
    );
}


/* =========================================================
   ADMIN AUTH CHECK
========================================================= */

function checkAdminAccess() {

    const token =
        getAdminToken();

    const user =
        getAdminUser();


    if (!token || !user) {

        console.warn(
            "⚠️ No admin session found."
        );

        return false;
    }


    if (user.isAdmin !== true) {

        console.error(
            "❌ User is not an administrator."
        );

        return false;
    }


    return true;
}


/* =========================================================
   PRODUCT MANAGEMENT
========================================================= */

let allAdminProducts = [];


async function fetchAdminProducts() {

    const response =
        await fetch(
            `${ADMIN_API_URL}/products`
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
            "Failed to load products."
        );
    }


    return data.products || [];
}


function renderProductsTable() {

    const tbody =
        document.getElementById(
            "productsTableBody"
        );


    if (!tbody) {

        return;
    }


    if (allAdminProducts.length === 0) {

        tbody.innerHTML = `
            <tr class="products-empty-row">
                <td colspan="6">
                    No products yet.
                    Click "Add Product" to create one.
                </td>
            </tr>
        `;

        return;
    }


    tbody.innerHTML =
        allAdminProducts
            .map(product => {

                const id =
                    product._id ||
                    product.id;

                const price =
                    Number(product.price) ||
                    0;

                const stock =
                    Number(product.stock) ||
                    0;

                const rating =
                    Number(product.rating) ||
                    0;

                const stockClass =
                    stock <= 0
                        ? "product-stock-low"
                        : "";

                const imageSrc =
                    product.image ||
                    "";


                return `
                    <tr data-product-id="${escapeHTML(id)}">

                        <td>

                            <div class="product-cell">

                                ${
                                    imageSrc
                                        ? `
                                            <img
                                                src="${escapeHTML(imageSrc)}"
                                                alt="${escapeHTML(product.name)}"
                                                onerror="this.style.display='none';"
                                            >
                                          `
                                        : ""
                                }

                                <span class="product-cell-name">
                                    ${escapeHTML(product.name)}
                                </span>

                            </div>

                        </td>


                        <td>
                            ${escapeHTML(product.category)}
                        </td>


                        <td>
                            ${formatCurrency(price)}
                        </td>


                        <td class="${stockClass}">
                            ${stock}
                        </td>


                        <td>
                            ${rating.toFixed(1)}
                        </td>


                        <td>

                            <div class="product-row-actions">

                                <button
                                    type="button"
                                    class="edit-product-btn"
                                    data-id="${escapeHTML(id)}"
                                    aria-label="Edit"
                                >

                                    <i class="fas fa-pen"></i>

                                </button>


                                <button
                                    type="button"
                                    class="delete-product-btn"
                                    data-id="${escapeHTML(id)}"
                                    aria-label="Delete"
                                >

                                    <i class="fas fa-trash"></i>

                                </button>

                            </div>

                        </td>

                    </tr>
                `;

            })
            .join("");
}


async function loadAdminProducts() {

    const tbody =
        document.getElementById(
            "productsTableBody"
        );


    try {

        allAdminProducts =
            await fetchAdminProducts();


        renderProductsTable();

    } catch (error) {

        console.error(
            "❌ Load products error:",
            error
        );


        if (tbody) {

            tbody.innerHTML = `
                <tr class="products-error-row">
                    <td colspan="6">
                        Couldn't load products.
                        Is the backend running?
                    </td>
                </tr>
            `;

        }
    }
}


function openProductModal(product) {

    const overlay =
        document.getElementById(
            "productModalOverlay"
        );

    const title =
        document.getElementById(
            "productModalTitle"
        );

    const errorBox =
        document.getElementById(
            "productFormError"
        );


    if (!overlay) {

        return;
    }


    document.getElementById(
        "productId"
    ).value =
        product?._id ||
        product?.id ||
        "";


    document.getElementById(
        "productName"
    ).value =
        product?.name ||
        "";


    document.getElementById(
        "productCategory"
    ).value =
        product?.category ||
        "men";


    document.getElementById(
        "productPrice"
    ).value =
        product?.price ??
        "";


    document.getElementById(
        "productStock"
    ).value =
        product?.stock ??
        0;


    document.getElementById(
        "productImage"
    ).value =
        product?.image ||
        "";


    document.getElementById(
        "productDescription"
    ).value =
        product?.description ||
        "";


    document.getElementById(
        "productRating"
    ).value =
        product?.rating ??
        0;


    if (title) {

        title.textContent =
            product
                ? "Edit Product"
                : "Add Product";
    }


    if (errorBox) {

        errorBox.style.display =
            "none";

        errorBox.textContent =
            "";
    }


    overlay.style.display =
        "flex";
}


function closeProductModal() {

    const overlay =
        document.getElementById(
            "productModalOverlay"
        );


    if (overlay) {

        overlay.style.display =
            "none";
    }
}


async function saveProduct(event) {

    event.preventDefault();


    const errorBox =
        document.getElementById(
            "productFormError"
        );

    const saveBtn =
        document.getElementById(
            "productSaveBtn"
        );

    const token =
        getAdminToken();


    if (!token) {

        window.location.href =
            "../admin-login/index.html";

        return;
    }


    const id =
        document.getElementById(
            "productId"
        ).value;


    const payload = {

        name:
            document
                .getElementById(
                    "productName"
                )
                .value
                .trim(),

        category:
            document.getElementById(
                "productCategory"
            ).value,

        price:
            Number(
                document.getElementById(
                    "productPrice"
                ).value
            ),

        stock:
            Number(
                document.getElementById(
                    "productStock"
                ).value
            ),

        image:
            document
                .getElementById(
                    "productImage"
                )
                .value
                .trim(),

        description:
            document
                .getElementById(
                    "productDescription"
                )
                .value
                .trim(),

        rating:
            Number(
                document.getElementById(
                    "productRating"
                ).value
            ) || 0

    };


    const url =
        id
            ? `${ADMIN_API_URL}/products/${encodeURIComponent(id)}`
            : `${ADMIN_API_URL}/products`;


    const method =
        id
            ? "PUT"
            : "POST";


    try {

        if (saveBtn) {
            saveBtn.disabled = true;
        }


        const response =
            await fetch(
                url,
                {
                    method: method,

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
                "Failed to save product."
            );
        }


        closeProductModal();


        await loadAdminProducts();

    } catch (error) {

        console.error(
            "❌ Save product error:",
            error
        );


        if (errorBox) {

            errorBox.textContent =
                error.message ||
                "Failed to save product.";

            errorBox.style.display =
                "block";
        }

    } finally {

        if (saveBtn) {
            saveBtn.disabled = false;
        }

    }
}


async function deleteProduct(id) {

    const token =
        getAdminToken();


    if (!token) {

        window.location.href =
            "../admin-login/index.html";

        return;
    }


    if (
        !window.confirm(
            "Delete this product? This cannot be undone."
        )
    ) {

        return;
    }


    try {

        const response =
            await fetch(
                `${ADMIN_API_URL}/products/${encodeURIComponent(id)}`,
                {
                    method: "DELETE",

                    headers: {
                        "Authorization":
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
            data.success !== true
        ) {

            throw new Error(
                data.message ||
                "Failed to delete product."
            );
        }


        await loadAdminProducts();

    } catch (error) {

        console.error(
            "❌ Delete product error:",
            error
        );


        alert(
            error.message ||
            "Failed to delete product."
        );
    }
}


function setupProductManagement() {

    const addBtn =
        document.getElementById(
            "addProductBtn"
        );

    const overlay =
        document.getElementById(
            "productModalOverlay"
        );

    const closeBtn =
        document.getElementById(
            "productModalClose"
        );

    const cancelBtn =
        document.getElementById(
            "productCancelBtn"
        );

    const form =
        document.getElementById(
            "productForm"
        );

    const tbody =
        document.getElementById(
            "productsTableBody"
        );


    if (addBtn) {

        addBtn.addEventListener(
            "click",
            () =>
                openProductModal(null)
        );
    }


    if (closeBtn) {

        closeBtn.addEventListener(
            "click",
            closeProductModal
        );
    }


    if (cancelBtn) {

        cancelBtn.addEventListener(
            "click",
            closeProductModal
        );
    }


    if (overlay) {

        overlay.addEventListener(
            "click",
            event => {

                if (
                    event.target === overlay
                ) {

                    closeProductModal();
                }

            }
        );
    }


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                overlay &&
                overlay.style.display === "flex"
            ) {

                closeProductModal();

            }

        }
    );


    if (form) {

        form.addEventListener(
            "submit",
            saveProduct
        );
    }


    if (tbody) {

        tbody.addEventListener(
            "click",
            event => {

                const editBtn =
                    event.target.closest(
                        ".edit-product-btn"
                    );

                const deleteBtn =
                    event.target.closest(
                        ".delete-product-btn"
                    );


                if (editBtn) {

                    const product =
                        allAdminProducts.find(
                            product =>
                                (
                                    product._id ||
                                    product.id
                                ) ===
                                editBtn.dataset.id
                        );


                    openProductModal(
                        product ||
                        null
                    );
                }


                if (deleteBtn) {

                    deleteProduct(
                        deleteBtn.dataset.id
                    );
                }

            }
        );
    }
}


/* =========================================================
   INITIALIZE ADMIN
========================================================= */

async function initAdmin() {

    console.log(
        "🚀 ShopHub Admin Dashboard Starting..."
    );


    initTheme();

    setupRefreshButtons();

    setupStorageListener();

    setupAutoRefresh();


    if (!checkAdminAccess()) {

        console.warn(
            "⚠️ Admin session missing or invalid."
        );

        return;
    }


    await refreshDashboard();


    setupProductManagement();

    await loadAdminProducts();


    logAdminState();


    console.log(
        "✅ ShopHub Admin Dashboard Ready"
    );
}


/* =========================================================
   DOM READY
========================================================= */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initAdmin
    );

} else {

    initAdmin();

}

