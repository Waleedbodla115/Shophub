# ShopHub — E-commerce Project

A full-stack e-commerce app: vanilla HTML/CSS/JS storefront + admin panel, backed by a Node/Express/MongoDB API with JWT auth, cart/wishlist/orders, and Stripe payments.

## Project structure
```
ShopHub/
├── index.html, shop/, men/, women/, kids/, accessories/, electronics/   # storefront pages
├── cart/, wishlist/, checkout/, orders/, product/, products/           # shopping flow
├── login/, register/, account/                                        # customer auth
├── admin/, admin-login/                                                # admin panel
├── assets/                                                             # static images
└── backend/                                                            # Express API + MongoDB
    ├── controllers/, routes/, models/, middleware/, config/, seed/
    ├── server.js
    └── .env.example        # copy to .env and fill in your own secrets
```

## Stack
- Frontend: HTML5, CSS3, JavaScript
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Authentication: bcryptjs + JWT
- Product images: `http://localhost:5000/images/...`
- Orders: MongoDB-backed authenticated API
- Admin: JWT-protected order/product management

## Run backend
```bash
cd backend
npm install
npm run seed
npm start
```

MongoDB must be running and `.env` must contain `MONGO_URI` and `JWT_SECRET`.
Run `npm run seed` after changing the product catalog or image paths.

## Create admin
```bash
cd backend
npm run create-admin
```
Default development credentials are taken from `.env` / `.env.example`. Change them before real use.

## Run frontend
Open the `ShopHub` folder with VS Code Live Server, normally:
`http://127.0.0.1:5500/index.html`

## Customer flow
Register → Login → Browse API products → Add to cart → Checkout → authenticated order → Success → My Orders.

## Payment
Cash on Delivery is fully represented in the order API. Card/online payment is modeled as `Pending` until a real payment provider is configured. Do **not** collect raw card numbers in ShopHub. For production, connect a provider checkout/webhook (Stripe, JazzCash, Easypaisa or another merchant gateway) using its official SDK/API and secrets in the backend.

## Important
Never commit `.env`, JWT secrets, payment secrets, or production credentials to GitHub.
