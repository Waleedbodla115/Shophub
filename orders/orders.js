"use strict";

/* =========================================================
   SHOPHUB ADMIN - ORDERS
   MongoDB API + LocalStorage Fallback
========================================================= */

/* =========================================================
   CONFIGURATION
========================================================= */

const API_BASE_URL = "http://localhost:5000";
const ORDERS_API = `${API_BASE_URL}/api/orders`;
const IMAGE_BASE_URL = API_BASE_URL;

const ORDERS_KEY = "orders";
const THEME_KEY = "theme";


/* =========================================================
   STATE
========================================================= */

let orders = [];
let filteredOrders = [];
let currentOrder = null;


/* =========================================================
   AUTH
========================================================= */

function getAuthToken() {
    return localStorage.getItem("authToken");
}

function getAuthUser() {
    try {
        return JSON.parse(
            localStorage.getItem("authUser") || "null"
        );
    } catch (error) {
        console.error("Invalid authUser:", error);
        return null;
    }
}


/* =========================================================
   DOM
========================================================= */

const ordersTableBody =
    document.getElementById("ordersTableBody");

const ordersEmpty =
    document.getElementById("ordersEmpty");

const ordersResultInfo =
    document.getElementById("ordersResultInfo");

const orderSearch =
    document.getElementById("orderSearch");

const statusFilter =
    document.getElementById("statusFilter");

const refreshOrdersBtn =
    document.getElementById("refreshOrdersBtn");

const themeToggle =
    document.getElementById("themeToggle");


/* =========================================================
   STATISTICS
========================================================= */

const totalOrders =
    document.getElementById("totalOrders");

const pendingOrders =
    document.getElementById("pendingOrders");

const processingOrders =
    document.getElementById("processingOrders");

const shippedOrders =
    document.getElementById("shippedOrders");

const deliveredOrders =
    document.getElementById("deliveredOrders");

const cancelledOrders =
    document.getElementById("cancelledOrders");


/* =========================================================
   MODAL
========================================================= */

const orderModal =
    document.getElementById("orderModal");

const orderModalTitle =
    document.getElementById("orderModalTitle");

const orderModalBody =
    document.getElementById("orderModalBody");

const closeOrderModal =
    document.getElementById("closeOrderModal");

const cancelModalBtn =
    document.getElementById("cancelModalBtn");


/* =========================================================
   TOAST
========================================================= */

const adminToast =
    document.getElementById("adminToast");

const adminToastMessage =
    document.getElementById("adminToastMessage");


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
   STATUS
========================================================= */

function normalizeStatus(status) {
    const value = String(status || "Pending").trim();

    const statuses = [
        "Pending",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled"
    ];

    const matched = statuses.find(
        item =>
            item.toLowerCase() === value.toLowerCase()
    );

    return matched || "Pending";
}

function getStatusClass(status) {
    return normalizeStatus(status)
        .toLowerCase()
        .replace(/\s+/g, "-");
}


/* =========================================================
   CURRENCY
========================================================= */

function formatCurrency(amount) {
    const value = Number(amount) || 0;
    return `$${value.toFixed(2)}`;
}


/* =========================================================
   DATE
========================================================= */

function formatDate(dateValue) {
    if (!dateValue) {
        return "N/A";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "N/A";
    }

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric"
    });
}


/* =========================================================
   IMAGE URL
========================================================= */

function getOrderImageUrl(image) {
    if (!image) {
        return "";
    }

    let imagePath = String(image).trim();

    if (!imagePath) {
        return "";
    }

    // Already a complete URL
    if (
        imagePath.startsWith("http://") ||
        imagePath.startsWith("https://") ||
        imagePath.startsWith("data:")
    ) {
        return imagePath;
    }

    // Normalize Windows slashes
    imagePath = imagePath.replace(/\\/g, "/");

    // Remove ./ and leading /
    imagePath = imagePath.replace(/^\.\/+/, "");
    imagePath = imagePath.replace(/^\/+/, "");

    // Already contains images/
    if (imagePath.startsWith("images/")) {
        return `${IMAGE_BASE_URL}/${imagePath}`;
    }

    // assets/images/...
    if (imagePath.startsWith("assets/images/")) {
        imagePath = imagePath.replace(
            /^assets\/images\//i,
            ""
        );
    }

    // Filename only
    if (!imagePath.includes("/")) {
        return `${IMAGE_BASE_URL}/images/${encodeURIComponent(
            imagePath
        )}`;
    }

    return `${IMAGE_BASE_URL}/${imagePath}`;
}


/* =========================================================
   NORMALIZE MONGODB ORDER
========================================================= */

function normalizeApiOrder(order) {
    if (!order || typeof order !== "object") {
        return null;
    }

    /* -----------------------------------------------------
       ORDER ID
    ----------------------------------------------------- */

    const mongoId =
        order._id ||
        order.id ||
        "";

    const orderNumber =
        order.orderNumber ||
        order.orderId ||
        (
            mongoId
                ? `SH-${String(mongoId)
                    .slice(-8)
                    .toUpperCase()}`
                : "Unknown Order"
        );


    /* -----------------------------------------------------
       CUSTOMER
    ----------------------------------------------------- */

    const customer = {
        name:
            order.customerName ||
            order.customer?.name ||
            order.customer?.fullName ||
            "Customer",

        fullName:
            order.customerName ||
            order.customer?.fullName ||
            order.customer?.name ||
            "Customer",

        email:
            order.customerEmail ||
            order.customer?.email ||
            "",

        phone:
            order.customerPhone ||
            order.customer?.phone ||
            ""
    };


    /* -----------------------------------------------------
       SHIPPING
    ----------------------------------------------------- */

    const shippingAddress =
        order.shippingAddress || {};

    customer.address =
        shippingAddress.address ||
        order.customer?.address ||
        "";

    customer.city =
        shippingAddress.city ||
        order.customer?.city ||
        "";

    customer.state =
        shippingAddress.state ||
        order.customer?.state ||
        "";

    customer.postal =
        shippingAddress.postalCode ||
        order.customer?.postal ||
        order.customer?.postalCode ||
        "";

    customer.country =
        shippingAddress.country ||
        order.customer?.country ||
        "Pakistan";


    /* -----------------------------------------------------
       ITEMS
    ----------------------------------------------------- */

    const rawItems =
        Array.isArray(order.items)
            ? order.items
            : Array.isArray(order.products)
                ? order.products
                : [];

    const products = rawItems.map(item => ({
        id:
            item.product ||
            item._id ||
            item.id ||
            "",

        name:
            item.name ||
            item.title ||
            "Product",

        image:
            item.image ||
            "",

        price:
            Number(item.price) || 0,

        quantity:
            Math.max(
                1,
                Number(item.quantity) || 1
            )
    }));


    /* -----------------------------------------------------
       TOTALS
    ----------------------------------------------------- */

    const subtotal =
        Number.isFinite(Number(order.subtotal))
            ? Number(order.subtotal)
            : products.reduce(
                (sum, item) =>
                    sum +
                    item.price * item.quantity,
                0
            );

    const shipping =
        Number(order.shipping) || 0;

    const discount =
        Number(order.discount) || 0;

    const total =
        Number.isFinite(Number(order.total))
            ? Number(order.total)
            : Number(
                (
                    subtotal +
                    shipping -
                    discount
                ).toFixed(2)
            );


    /* -----------------------------------------------------
       RETURN NORMALIZED ORDER
    ----------------------------------------------------- */

    return {
        ...order,

        _id:
            order._id ||
            order.id ||
            "",

        id:
            order.id ||
            order._id ||
            "",

        orderId: orderNumber,
        orderNumber,

        customer,

        shippingAddress,

        products,
        items: products,

        subtotal,
        shipping,
        discount,
        total,

        paymentMethod:
            order.paymentMethod ||
            "Cash on Delivery",

        paymentStatus:
            order.paymentStatus ||
            "Pending",

        status:
            normalizeStatus(order.status),

        createdAt:
            order.createdAt ||
            order.date ||
            null,

        date:
            order.createdAt ||
            order.date ||
            null
    };
}


/* =========================================================
   LOAD ORDERS FROM API
========================================================= */

async function loadOrdersFromAPI() {
    const token = getAuthToken();
    const user = getAuthUser();

    if (!token || !user) {
        console.warn(
            "⚠️ No authentication found."
        );

        return false;
    }

    try {
        const endpoint =
            user.isAdmin
                ? ORDERS_API
                : `${ORDERS_API}/my-orders`;

        console.log(
            "📡 Loading orders from:",
            endpoint
        );

        const response = await fetch(
            endpoint,
            {
                method: "GET",

                headers: {
                    Authorization:
                        `Bearer ${token}`,

                    Accept:
                        "application/json"
                }
            }
        );

        if (response.status === 401) {
            localStorage.removeItem("authToken");
            localStorage.removeItem("authUser");

            showToast(
                "Your session has expired.",
                "error"
            );

            return false;
        }

        const data =
            await response
                .json()
                .catch(() => ({}));

        if (!response.ok) {
            console.error(
                "❌ Orders API error:",
                data
            );

            return false;
        }

        const apiOrders =
            Array.isArray(data.orders)
                ? data.orders
                : Array.isArray(data.data)
                    ? data.data
                    : Array.isArray(data)
                        ? data
                        : [];

        orders =
            apiOrders
                .map(normalizeApiOrder)
                .filter(Boolean);

        console.log(
            "✅ Orders loaded from MongoDB:",
            orders.length
        );

        return true;

    } catch (error) {

        console.error(
            "❌ Failed to load orders:",
            error
        );

        return false;
    }
}


/* =========================================================
   LOCAL STORAGE
========================================================= */

function loadOrdersFromLocalStorage() {
    try {
        const saved =
            localStorage.getItem(
                ORDERS_KEY
            );

        if (!saved) {
            orders = [];
            return;
        }

        const parsed =
            JSON.parse(saved);

        orders =
            Array.isArray(parsed)
                ? parsed
                    .map(normalizeApiOrder)
                    .filter(Boolean)
                : [];

    } catch (error) {

        console.error(
            "❌ LocalStorage error:",
            error
        );

        orders = [];
    }
}

function saveOrders() {
    try {
        localStorage.setItem(
            ORDERS_KEY,
            JSON.stringify(orders)
        );

        return true;

    } catch (error) {

        console.error(
            "❌ Unable to save orders:",
            error
        );

        return false;
    }
}


/* =========================================================
   STATISTICS
========================================================= */

function updateStatistics() {

    const countStatus = status =>
        orders.filter(
            order =>
                normalizeStatus(order.status) ===
                status
        ).length;

    if (totalOrders) {
        totalOrders.textContent =
            orders.length;
    }

    if (pendingOrders) {
        pendingOrders.textContent =
            countStatus("Pending");
    }

    if (processingOrders) {
        processingOrders.textContent =
            countStatus("Processing");
    }

    if (shippedOrders) {
        shippedOrders.textContent =
            countStatus("Shipped");
    }

    if (deliveredOrders) {
        deliveredOrders.textContent =
            countStatus("Delivered");
    }

    if (cancelledOrders) {
        cancelledOrders.textContent =
            countStatus("Cancelled");
    }
}


/* =========================================================
   FILTER
========================================================= */

function filterOrders() {

    const search =
        orderSearch
            ? orderSearch.value
                .trim()
                .toLowerCase()
            : "";

    const selectedStatus =
        statusFilter
            ? statusFilter.value
            : "all";

    filteredOrders =
        orders.filter(order => {

            const customer =
                order.customer || {};

            const searchableText = [
                order.orderNumber,
                order.orderId,
                customer.name,
                customer.email,
                customer.phone
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const matchesSearch =
                !search ||
                searchableText.includes(search);

            const matchesStatus =
                selectedStatus === "all" ||
                normalizeStatus(order.status) ===
                    selectedStatus;

            return (
                matchesSearch &&
                matchesStatus
            );
        });

    renderOrders();
}


/* =========================================================
   ITEMS COUNT
========================================================= */

function getOrderItemsCount(order) {

    const products =
        Array.isArray(order.products)
            ? order.products
            : [];

    return products.reduce(
        (total, item) =>
            total +
            (Number(item.quantity) || 0),
        0
    );
}


/* =========================================================
   RENDER TABLE
========================================================= */

function renderOrders() {

    if (!ordersTableBody) {
        return;
    }

    ordersTableBody.innerHTML = "";

    if (filteredOrders.length === 0) {

        if (ordersEmpty) {
            ordersEmpty.hidden = false;
        }

        if (ordersResultInfo) {
            ordersResultInfo.textContent =
                "Showing 0 orders";
        }

        return;
    }

    if (ordersEmpty) {
        ordersEmpty.hidden = true;
    }

    filteredOrders.forEach(order => {

        const row =
            document.createElement("tr");

        const customer =
            order.customer || {};

        const status =
            normalizeStatus(order.status);

        const itemCount =
            getOrderItemsCount(order);

        row.innerHTML = `
            <td>
                <strong class="order-id">
                    ${escapeHTML(
                        order.orderNumber ||
                        order.orderId ||
                        "N/A"
                    )}
                </strong>
            </td>

            <td>
                <div class="customer-cell">
                    <strong>
                        ${escapeHTML(
                            customer.name ||
                            "Unknown Customer"
                        )}
                    </strong>

                    <span>
                        ${escapeHTML(
                            customer.email || ""
                        )}
                    </span>
                </div>
            </td>

            <td>
                ${formatDate(
                    order.createdAt ||
                    order.date
                )}
            </td>

            <td>
                ${itemCount}
            </td>

            <td>
                <strong>
                    ${formatCurrency(order.total)}
                </strong>
            </td>

            <td>
                <span
                    class="order-status status-${getStatusClass(status)}"
                >
                    ${escapeHTML(status)}
                </span>
            </td>

            <td>
                <div class="order-actions">

                    <button
                        type="button"
                        class="action-btn view-order-btn"
                        data-order-id="${escapeHTML(
                            order._id ||
                            order.id ||
                            ""
                        )}"
                        title="View Order"
                    >
                        <i class="fas fa-eye"></i>
                    </button>

                </div>
            </td>
        `;

        ordersTableBody.appendChild(row);
    });

    if (ordersResultInfo) {
        ordersResultInfo.textContent =
            `Showing ${filteredOrders.length} of ${orders.length} orders`;
    }
}


/* =========================================================
   FIND ORDER
========================================================= */

function findOrder(id) {

    return orders.find(
        order =>
            String(
                order._id ||
                order.id
            ) === String(id)
    );
}


/* =========================================================
   OPEN ORDER MODAL
========================================================= */

function openOrderModal(orderId) {

    const order =
        findOrder(orderId);

    if (!order) {

        showToast(
            "Order not found.",
            "error"
        );

        return;
    }

    currentOrder = order;

    const customer =
        order.customer || {};

    const shippingAddress =
        order.shippingAddress || {};

    const products =
        Array.isArray(order.products)
            ? order.products
            : [];

    const status =
        normalizeStatus(order.status);

    if (orderModalTitle) {
        orderModalTitle.textContent =
            order.orderNumber ||
            order.orderId ||
            "Order Details";
    }

    if (!orderModalBody) {
        return;
    }


    /* =====================================================
       PRODUCTS
    ===================================================== */

    let productsHTML = "";

    if (products.length === 0) {

        productsHTML = `
            <div class="modal-empty-products">
                <i class="fas fa-box-open"></i>

                <p>
                    No product information available.
                </p>
            </div>
        `;

    } else {

        productsHTML =
            products.map(product => {

                const quantity =
                    Number(product.quantity) || 1;

                const price =
                    Number(product.price) || 0;

                const itemTotal =
                    price * quantity;

                const imageURL =
                    getOrderImageUrl(
                        product.image
                    );

                return `
                    <div class="modal-product">

                        <div class="modal-product-image">

                            ${
                                imageURL
                                    ? `
                                        <img
                                            src="${escapeHTML(imageURL)}"
                                            alt="${escapeHTML(product.name)}"
                                            class="modal-order-product-image"
                                        >

                                        <div
                                            class="modal-product-placeholder"
                                            style="display:none;"
                                        >
                                            <i class="fas fa-image"></i>
                                        </div>
                                    `
                                    : `
                                        <div
                                            class="modal-product-placeholder"
                                        >
                                            <i class="fas fa-image"></i>
                                        </div>
                                    `
                            }

                        </div>


                        <div class="modal-product-info">

                            <strong>
                                ${escapeHTML(product.name)}
                            </strong>

                            <span>
                                Product
                            </span>

                            <small>
                                Qty: ${quantity}
                            </small>

                            <small>
                                Price:
                                ${formatCurrency(price)}
                            </small>

                        </div>


                        <div class="modal-product-price">

                            <strong>
                                ${formatCurrency(itemTotal)}
                            </strong>

                        </div>

                    </div>
                `;

            }).join("");
    }


    /* =====================================================
       MODAL CONTENT
    ===================================================== */

    orderModalBody.innerHTML = `

        <!-- CUSTOMER -->

        <div class="order-detail-section">

            <div class="detail-heading">
                <i class="fas fa-user"></i>
                Customer Information
            </div>

            <div class="detail-grid">

                <div>
                    <span>Name</span>
                    <strong>
                        ${escapeHTML(
                            customer.name || "N/A"
                        )}
                    </strong>
                </div>

                <div>
                    <span>Email</span>
                    <strong>
                        ${escapeHTML(
                            customer.email || "N/A"
                        )}
                    </strong>
                </div>

                <div>
                    <span>Phone</span>
                    <strong>
                        ${escapeHTML(
                            customer.phone || "N/A"
                        )}
                    </strong>
                </div>

            </div>

        </div>


        <!-- SHIPPING -->

        <div class="order-detail-section">

            <div class="detail-heading">
                <i class="fas fa-location-dot"></i>
                Shipping Information
            </div>

            <div class="detail-grid">

                <div>
                    <span>Address</span>
                    <strong>
                        ${escapeHTML(
                            shippingAddress.address ||
                            customer.address ||
                            "N/A"
                        )}
                    </strong>
                </div>

                <div>
                    <span>City</span>
                    <strong>
                        ${escapeHTML(
                            shippingAddress.city ||
                            customer.city ||
                            "N/A"
                        )}
                    </strong>
                </div>

                <div>
                    <span>State</span>
                    <strong>
                        ${escapeHTML(
                            shippingAddress.state ||
                            customer.state ||
                            "N/A"
                        )}
                    </strong>
                </div>

                <div>
                    <span>Postal Code</span>
                    <strong>
                        ${escapeHTML(
                            shippingAddress.postalCode ||
                            customer.postal ||
                            "N/A"
                        )}
                    </strong>
                </div>

                <div>
                    <span>Country</span>
                    <strong>
                        ${escapeHTML(
                            shippingAddress.country ||
                            customer.country ||
                            "Pakistan"
                        )}
                    </strong>
                </div>

            </div>

        </div>


        <!-- ORDER INFORMATION -->

        <div class="order-detail-section">

            <div class="detail-heading">
                <i class="fas fa-receipt"></i>
                Order Information
            </div>

            <div class="detail-grid">

                <div>
                    <span>Order ID</span>
                    <strong>
                        ${escapeHTML(
                            order.orderNumber ||
                            order.orderId ||
                            "N/A"
                        )}
                    </strong>
                </div>

                <div>
                    <span>Date</span>
                    <strong>
                        ${formatDate(
                            order.createdAt ||
                            order.date
                        )}
                    </strong>
                </div>

                <div>
                    <span>Payment Method</span>
                    <strong>
                        ${escapeHTML(
                            order.paymentMethod ||
                            "Cash on Delivery"
                        )}
                    </strong>
                </div>

                <div>
                    <span>Payment Status</span>
                    <strong>
                        ${escapeHTML(
                            order.paymentStatus ||
                            "Pending"
                        )}
                    </strong>
                </div>

            </div>

        </div>


        <!-- PRODUCTS -->

        <div class="order-detail-section">

            <div class="detail-heading">
                <i class="fas fa-box"></i>
                Products
            </div>

            <div class="modal-products">
                ${productsHTML}
            </div>

        </div>


        <!-- SUMMARY -->

        <div class="order-detail-section">

            <div class="detail-heading">
                <i class="fas fa-credit-card"></i>
                Order Summary
            </div>

            <div class="order-summary-details">

                <div>
                    <span>Subtotal</span>

                    <strong>
                        ${formatCurrency(order.subtotal)}
                    </strong>
                </div>

                <div>
                    <span>Shipping</span>

                    <strong>
                        ${formatCurrency(order.shipping)}
                    </strong>
                </div>

                <div>
                    <span>Discount</span>

                    <strong>
                        -${formatCurrency(order.discount)}
                    </strong>
                </div>

                <div class="summary-total">

                    <span>Total</span>

                    <strong>
                        ${formatCurrency(order.total)}
                    </strong>

                </div>

            </div>

        </div>


        <!-- STATUS -->

        <div class="order-detail-section">

            <div class="detail-heading">
                <i class="fas fa-rotate"></i>
                Update Status
            </div>

            <div class="status-update-box">

                <select
                    id="modalStatusSelect"
                    class="modal-status-select"
                >

                    <option
                        value="Pending"
                        ${status === "Pending" ? "selected" : ""}
                    >
                        Pending
                    </option>

                    <option
                        value="Processing"
                        ${status === "Processing" ? "selected" : ""}
                    >
                        Processing
                    </option>

                    <option
                        value="Shipped"
                        ${status === "Shipped" ? "selected" : ""}
                    >
                        Shipped
                    </option>

                    <option
                        value="Delivered"
                        ${status === "Delivered" ? "selected" : ""}
                    >
                        Delivered
                    </option>

                    <option
                        value="Cancelled"
                        ${status === "Cancelled" ? "selected" : ""}
                    >
                        Cancelled
                    </option>

                </select>


                <button
                    type="button"
                    class="btn-primary"
                    id="updateOrderStatusBtn"
                >

                    <i class="fas fa-save"></i>

                    Update Status

                </button>

            </div>

        </div>


        ${
            order.notes
                ? `
                    <div class="order-detail-section">

                        <div class="detail-heading">
                            <i class="fas fa-note-sticky"></i>
                            Customer Notes
                        </div>

                        <p class="order-notes">
                            ${escapeHTML(order.notes)}
                        </p>

                    </div>
                `
                : ""
        }

    `;


    /* =====================================================
       IMAGE FALLBACK
    ===================================================== */

    orderModalBody
        .querySelectorAll(
            ".modal-order-product-image"
        )
        .forEach(image => {

            image.addEventListener(
                "error",
                function () {

                    console.warn(
                        "⚠️ Product image failed:",
                        this.src
                    );

                    this.style.display =
                        "none";

                    const placeholder =
                        this.parentElement.querySelector(
                            ".modal-product-placeholder"
                        );

                    if (placeholder) {
                        placeholder.style.display =
                            "flex";
                    }
                }
            );
        });


    /* =====================================================
       SHOW MODAL
    ===================================================== */

    if (orderModal) {
        orderModal.hidden = false;
    }

    document.body.classList.add(
        "modal-open"
    );
}


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeModal() {

    if (!orderModal) {
        return;
    }

    orderModal.hidden = true;

    document.body.classList.remove(
        "modal-open"
    );

    currentOrder = null;
}


/* =========================================================
   UPDATE ORDER STATUS
========================================================= */

async function updateOrderStatus() {

    if (!currentOrder) {
        return;
    }

    const select =
        document.getElementById(
            "modalStatusSelect"
        );

    if (!select) {
        return;
    }

    const newStatus =
        normalizeStatus(select.value);

    const oldStatus =
        normalizeStatus(
            currentOrder.status
        );

    const backendId =
        currentOrder._id ||
        currentOrder.id;

    const orderNumber =
        currentOrder.orderNumber ||
        currentOrder.orderId ||
        "Order";


    /* No change */

    if (oldStatus === newStatus) {

        showToast(
            `${orderNumber} is already ${newStatus}.`
        );

        return;
    }


    const token =
        getAuthToken();


    /* =====================================================
       LOCAL FALLBACK
    ===================================================== */

    if (!backendId || !token) {

        currentOrder.status =
            newStatus;

        const index =
            orders.findIndex(
                order =>
                    String(
                        order._id ||
                        order.id
                    ) ===
                    String(backendId)
            );

        if (index !== -1) {
            orders[index] =
                currentOrder;
        }

        saveOrders();

        updateStatistics();

        filterOrders();

        closeModal();

        showToast(
            `${orderNumber} updated to ${newStatus}.`
        );

        return;
    }


    /* =====================================================
       API
    ===================================================== */

    try {

        const response =
            await fetch(
                `${ORDERS_API}/${backendId}/status`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json",

                        Authorization:
                            `Bearer ${token}`,

                        Accept:
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            status:
                                newStatus
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
                "Unable to update order status."
            );
        }


        /* =================================================
           UPDATE LOCAL STATE
        ================================================= */

        const updatedOrder =
            data.order
                ? normalizeApiOrder(
                    data.order
                )
                : {
                    ...currentOrder,
                    status: newStatus
                };

        const index =
            orders.findIndex(
                order =>
                    String(
                        order._id ||
                        order.id
                    ) ===
                    String(backendId)
            );

        if (index !== -1) {
            orders[index] =
                updatedOrder;
        }


        updateStatistics();

        filterOrders();

        closeModal();

        showToast(
            `${orderNumber} updated to ${newStatus}.`
        );

        console.log(
            "✅ Order status updated:",
            updatedOrder
        );

    } catch (error) {

        console.error(
            "❌ Status update failed:",
            error
        );

        showToast(
            error.message ||
            "Unable to update order status.",
            "error"
        );
    }
}


/* =========================================================
   TOAST
========================================================= */

function showToast(
    message,
    type = "success"
) {

    if (!adminToast) {
        return;
    }

    if (adminToastMessage) {
        adminToastMessage.textContent =
            message;
    }

    adminToast.classList.remove(
        "toast-error"
    );

    if (type === "error") {
        adminToast.classList.add(
            "toast-error"
        );
    }

    adminToast.classList.add(
        "show"
    );

    setTimeout(() => {

        adminToast.classList.remove(
            "show"
        );

    }, 3000);
}


/* =========================================================
   TABLE EVENTS
========================================================= */

function setupTableEvents() {

    if (!ordersTableBody) {
        return;
    }

    ordersTableBody.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    ".view-order-btn"
                );

            if (!button) {
                return;
            }

            openOrderModal(
                button.dataset.orderId
            );
        }
    );
}


/* =========================================================
   SEARCH
========================================================= */

function setupSearch() {

    if (orderSearch) {
        orderSearch.addEventListener(
            "input",
            filterOrders
        );
    }

    if (statusFilter) {
        statusFilter.addEventListener(
            "change",
            filterOrders
        );
    }
}


/* =========================================================
   REFRESH
========================================================= */

async function refreshOrders() {

    if (refreshOrdersBtn) {

        refreshOrdersBtn.disabled =
            true;

        refreshOrdersBtn.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            Refreshing...
        `;
    }

    const loaded =
        await loadOrdersFromAPI();

    if (!loaded) {
        loadOrdersFromLocalStorage();
    }

    updateStatistics();

    filterOrders();

    if (refreshOrdersBtn) {

        refreshOrdersBtn.disabled =
            false;

        refreshOrdersBtn.innerHTML = `
            <i class="fas fa-sync-alt"></i>
            Refresh
        `;
    }

    showToast(
        loaded
            ? "Orders refreshed from MongoDB."
            : "Orders refreshed from localStorage."
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


function initTheme() {

    const savedTheme =
        localStorage.getItem(
            THEME_KEY
        );

    if (savedTheme === "dark") {

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
   MODAL EVENTS
========================================================= */

function setupModal() {

    if (closeOrderModal) {

        closeOrderModal.addEventListener(
            "click",
            closeModal
        );
    }

    if (cancelModalBtn) {

        cancelModalBtn.addEventListener(
            "click",
            closeModal
        );
    }


    document.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                orderModal
            ) {
                closeModal();
            }
        }
    );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {
                closeModal();
            }
        }
    );


    if (orderModalBody) {

        orderModalBody.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        "#updateOrderStatusBtn"
                    );

                if (!button) {
                    return;
                }

                updateOrderStatus();
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
                event.key ===
                ORDERS_KEY
            ) {

                loadOrdersFromLocalStorage();

                updateStatistics();

                filterOrders();
            }
        }
    );
}


/* =========================================================
   INITIALIZE
========================================================= */

async function initOrders() {

    console.log(
        "🚀 ShopHub Orders Page Starting..."
    );

    initTheme();

    setupSearch();

    setupTableEvents();

    setupModal();

    setupStorageListener();


    const loadedFromAPI =
        await loadOrdersFromAPI();


    if (!loadedFromAPI) {

        console.log(
            "⚠️ API unavailable. Loading localStorage..."
        );

        loadOrdersFromLocalStorage();
    }


    console.log(
        "📦 Orders Loaded:",
        orders
    );


    updateStatistics();

    filterOrders();


    if (refreshOrdersBtn) {

        refreshOrdersBtn.addEventListener(
            "click",
            refreshOrders
        );
    }


    console.log(
        "📊 Total Orders:",
        orders.length
    );

    console.log(
        "✅ ShopHub Orders Page Ready"
    );
}


/* =========================================================
   DOM READY
========================================================= */

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        initOrders
    );

} else {

    initOrders();
}