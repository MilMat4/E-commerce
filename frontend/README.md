# Morrow Market frontend

Responsive React storefront and role-based shopping and administration experiences, connected to the Express API. The interface uses a glassmorphism-inspired visual style.

## Run locally

1. Start MongoDB and the backend by following [the backend setup guide](../backend/README.md).
2. From this folder, install dependencies with `npm install`.
3. Copy `.env.example` to `.env` if the backend is not at `http://localhost:5000/api`, then set `VITE_API_URL`.
4. Start Vite with `npm run dev` and open the local address it prints.

## Features

- Responsive storefront, product catalog, category filters, search, sorting, and pagination
- Product details with public reviews and verified-purchase review submission
- Customer registration, login, cart, wishlist, order history, and profile
- Razorpay Checkout integration for test payments
- Seller product management, image uploads, and seller-owned order fulfillment
- Admin user, seller, category, product, order, and review moderation tools
- Redux Toolkit for shared auth, cart, wishlist, and admin state
- Axios client with JWT request handling and expired-session cleanup
- Loading, empty, not-found, and API error states

## Project structure

- `src/services/api.js` configures the shared Axios client and API URL.
- `src/store/` contains the Redux store, feature slices, hooks, and session synchronization.
- `src/components/` contains navigation, page layout, route guards, and reusable product cards.
- `src/pages/` contains storefront, customer, seller, admin, and authentication screens.
- `src/App.jsx` connects URL paths to page components.
- `src/App.css` contains page and responsive styles; `src/index.css` contains shared base styles.

## Checks

```powershell
npm run build
npm run lint
```

## Development notes

- Razorpay payments require test credentials in the backend `.env`; see [the backend Razorpay guide](../backend/README.md#configure-razorpay-test-checkout). Do not use live credentials for local testing.
- Uploaded product images are stored on the backend's local filesystem.
- JWTs are stored in browser local storage for this learning project. Production applications should assess safer session strategies and XSS protections.
- A no-gateway demo checkout is hidden by default. Enable it only for local demos with `VITE_DEMO_CHECKOUT_ENABLED=true` in the frontend and `DEMO_CHECKOUT_ENABLED=true` in the backend; the backend disables demo checkout in production.
