"use strict";

/* Shared API-backed product catalog for category, cart, and checkout pages. */
const PRODUCTS_API_BASE_URL = "http://localhost:5000";
const PRODUCTS_ENDPOINT = `${PRODUCTS_API_BASE_URL}/api/products`;
const CART_KEY = "cart";

let allProducts = [];
let productsReadyResolve;
const productsReady = new Promise(resolve => { productsReadyResolve = resolve; });

async function loadAllProducts() {
    try {
        const response = await fetch(PRODUCTS_ENDPOINT);
        if (!response.ok) throw new Error(`API request failed: ${response.status}`);
        const data = await response.json();
        allProducts = Array.isArray(data.products) ? data.products : [];
    } catch (error) {
        console.error("Unable to load products from the backend:", error);
        allProducts = [];
    } finally {
        productsReadyResolve(allProducts);
    }
}

function getProductById(productId) {
    const product = allProducts.find(item => String(item._id) === String(productId));
    return product ? { ...product, id: product._id } : null;
}

function getProductsByCategory(category) {
    const normalized = String(category || "").trim().toLowerCase();
    return allProducts
        .filter(product => String(product.category || "").trim().toLowerCase() === normalized)
        .map(product => ({ ...product, id: product._id }));
}

function getProductImageUrl(imagePath) {
    if (!imagePath) return "";
    const path = String(imagePath).trim().replace(/\\/g, "/");
    if (/^(https?:|data:)/i.test(path)) return path;
    const normalized = path
        .replace(/^\.?\/?assets\/images\//i, "/images/")
        .replace(/^\/?images\//i, "/images/");
    const imagePathWithPrefix = normalized.startsWith("/") ? normalized : `/images/${normalized}`;
    return `${PRODUCTS_API_BASE_URL}${imagePathWithPrefix
        .split("/")
        .map((part, index) => index === 0 ? part : encodeURIComponent(part))
        .join("/")}`;
}

function getCartFromStorage() {
    try {
        const saved = localStorage.getItem(CART_KEY);
        const cart = saved ? JSON.parse(saved) : {};
        return cart && typeof cart === "object" && !Array.isArray(cart) ? cart : {};
    } catch (_) {
        return {};
    }
}

function addToCart(productId, quantity = 1) {
    const product = getProductById(productId);
    if (!product) return false;
    const cart = getCartFromStorage();
    cart[product.id] = (Number(cart[product.id]) || 0) + Math.max(1, Math.floor(Number(quantity) || 1));
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCountBadges();
    return true;
}

function updateCartCountBadges() {
    const count = Object.values(getCartFromStorage()).reduce((total, quantity) => total + Math.max(0, Number(quantity) || 0), 0);
    document.querySelectorAll(".cart-count").forEach(element => { element.textContent = count; });
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderProductsPage() {
    const grid = document.getElementById("productsGrid");
    if (!grid) return;
    if (!allProducts.length) {
        grid.innerHTML = '<p class="text-center text-muted">Products are unavailable. Please start the backend and seed the database.</p>';
        return;
    }

    grid.innerHTML = allProducts.map(product => `
        <article class="col-6 col-md-4 col-lg-3">
            <div class="card h-100 product-card">
                <img src="${getProductImageUrl(product.image)}" class="card-img-top" alt="${escapeHtml(product.name)}" loading="lazy">
                <div class="card-body d-flex flex-column">
                    <span class="text-muted text-capitalize small">${escapeHtml(product.category)}</span>
                    <h2 class="h6 card-title">${escapeHtml(product.name)}</h2>
                    <p class="fw-bold mt-auto mb-3">$${Number(product.price || 0).toFixed(2)}</p>
                    <button class="btn btn-dark" data-product-id="${escapeHtml(product._id)}">Add to cart</button>
                </div>
            </div>
        </article>`).join("");

    grid.addEventListener("click", event => {
        const button = event.target.closest("[data-product-id]");
        if (button) addToCart(button.dataset.productId);
    });
}

window.CART_KEY = CART_KEY;
window.productsReady = productsReady;
window.getProductById = getProductById;
window.getProductsByCategory = getProductsByCategory;
window.getProductImageUrl = getProductImageUrl;
window.addToCart = addToCart;
window.updateCartCountBadges = updateCartCountBadges;

/*
window.allProducts is defined as a live getter (not a
plain assignment) because `allProducts` is REASSIGNED
inside loadAllProducts() once the fetch resolves — a
plain `window.allProducts = allProducts` would only ever
capture the empty array from before the fetch completed.
A getter always reads the current value of the variable.
*/
Object.defineProperty(window, "allProducts", {
    get() {
        return allProducts;
    },
    configurable: true
});

loadAllProducts().then(() => {
    renderProductsPage();
    updateCartCountBadges();
});