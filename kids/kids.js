/* ==============================================
   KIDS PAGE SCRIPT

   NOTE: addToCart() and CART_KEY come from the
   shared products.js — must be loaded BEFORE this
   file in kids/index.html:

   <script src="../products/products.js"></script>
   <script src="./kids.js"></script>
============================================== */

/* =========================================================
   WISHLIST CONFIG

   Wishlist now lives on the backend (per-user, tied to the
   logged-in account) instead of localStorage. PRODUCTS_API_BASE_URL
   comes from the shared products.js.
========================================================= */

const AUTH_TOKEN_KEY = 'authToken';
const WISHLIST_API_URL = `${PRODUCTS_API_BASE_URL}/api/wishlist`;

let kidsProducts = [];

// State (wishlist is now fetched from the backend on load — cart comes from products.js)
let searchQuery = '';
let sortOption = 'default';
let wishlist = [];

// DOM Elements
const productsContainer = document.getElementById('productsContainer');
const emptyState = document.getElementById('emptyState');
const productCount = document.getElementById('productCount');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([fetchWishlist(), window.productsReady]);
    kidsProducts = window.getProductsByCategory('kids');
    renderProducts();
    updateCartCountBadges(); // from products.js

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            renderProducts();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            sortOption = e.target.value;
            renderProducts();
        });
    }

    initTheme();
});

/* =========================================================
   AUTH HELPER
========================================================= */

function getAuthToken() {
    try {
        return localStorage.getItem(AUTH_TOKEN_KEY) || '';
    } catch (error) {
        return '';
    }
}

/* =========================================================
   FETCH WISHLIST FROM BACKEND

   GET /api/wishlist (protected). With no auth token (guest),
   we skip the request and just treat the wishlist as empty —
   hearts will prompt a login instead of toggling.
========================================================= */

async function fetchWishlist() {
    const token = getAuthToken();

    if (!token) {
        wishlist = [];
        return;
    }

    try {
        const response = await fetch(WISHLIST_API_URL, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.status === 401) {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            wishlist = [];
            return;
        }

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        wishlist = Array.isArray(data.products)
            ? data.products.map(product => String(product._id))
            : [];

    } catch (error) {
        console.error('Unable to load wishlist from the backend:', error);
        wishlist = [];
    }
}

// Render Products with Images
function renderProducts() {
    let filteredProducts = kidsProducts;

    if (searchQuery) {
        filteredProducts = filteredProducts.filter(product => {
            return product.name.toLowerCase().includes(searchQuery) ||
                   product.category.toLowerCase().includes(searchQuery);
        });
    }

    if (sortOption === 'low') {
        filteredProducts.sort((a, b) => a.price - b.price);
    } else if (sortOption === 'high') {
        filteredProducts.sort((a, b) => b.price - a.price);
    } else if (sortOption === 'name') {
        filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (productCount) {
        productCount.textContent = filteredProducts.length;
    }

    if (emptyState) {
        emptyState.style.display = filteredProducts.length === 0 ? 'block' : 'none';
    }

    if (productsContainer) {
        productsContainer.innerHTML = filteredProducts.map(product => {
            const oldPrice = product.oldPrice ? `<span class="old-price">$${product.oldPrice}</span>` : '';
            const badge = product.badge ? `<span class="product-badge ${product.badgeType || ''}">${product.badge}</span>` : '';
            const stars = '★'.repeat(Math.floor(product.rating)) + '☆'.repeat(5 - Math.floor(product.rating));
            const isWishlisted = wishlist.includes(String(product.id));

            return `
                <div class="col-md-6 col-lg-4 col-xl-3">
                    <div class="product-card">
                        <div class="product-image">
                            ${badge}
                            <img src="${window.getProductImageUrl(product.image)}" alt="${product.name}" class="product-img">
                        </div>
                        <div class="product-details">
                            <span class="product-category">${product.category}</span>
                            <h3 class="product-title">${product.name}</h3>
                            <div class="product-rating">
                                ${stars} <span>(${product.rating})</span>
                            </div>
                            <div class="product-price">
                                <span class="current-price">$${product.price}</span>
                                ${oldPrice}
                            </div>
                            <div class="product-actions">
                                <button class="btn-add-cart" onclick="addToCart('${product.id}')">
                                    <i class="fas fa-cart-plus"></i> Add to Cart
                                </button>
                                <button class="btn-wishlist ${isWishlisted ? 'active' : ''}"
                                        onclick="toggleWishlist('${product.id}')">
                                    <i class="fas fa-heart"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

/* =========================================================
   addToCart() is intentionally NOT defined here.
   It comes from the shared products.js and already:
   - reads/writes localStorage['cart']
   - updates .cart-count badges
========================================================= */

/* =========================================================
   TOGGLE WISHLIST

   POST /api/wishlist to add, DELETE /api/wishlist/:productId
   to remove. Requires login — a logged-out click sends the
   user to the login page instead of silently doing nothing.
========================================================= */

async function toggleWishlist(productId) {
    const token = getAuthToken();

    if (!token) {
        showToast('Please log in to use your wishlist', 'info');
        window.location.href = '../login/index.html';
        return;
    }

    const id = String(productId);
    const isWishlisted = wishlist.includes(id);

    try {
        const response = await fetch(
            isWishlisted
                ? `${WISHLIST_API_URL}/${encodeURIComponent(id)}`
                : WISHLIST_API_URL,
            {
                method: isWishlisted ? 'DELETE' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: isWishlisted ? undefined : JSON.stringify({ productId: id })
            }
        );

        if (response.status === 401) {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            showToast('Please log in to use your wishlist', 'info');
            window.location.href = '../login/index.html';
            return;
        }

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        if (isWishlisted) {
            wishlist = wishlist.filter(itemId => itemId !== id);
            showToast('Removed from wishlist', 'info');
        } else {
            wishlist.push(id);
            showToast('Added to wishlist!', 'success');
        }

        renderProducts();

    } catch (error) {
        console.error('Unable to update wishlist:', error);
        showToast('Unable to update wishlist. Please try again.', 'error');
    }
}

function showToast(message, type = 'success') {
    let toast = document.getElementById('toast');

    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = `toast show ${type}`;

    if (toast.timeout) {
        clearTimeout(toast.timeout);
    }

    toast.timeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');

            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
            }
        });
    }
}

// Export functions used via inline onclick=""
window.toggleWishlist = toggleWishlist;