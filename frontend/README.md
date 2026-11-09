# Morrow Market frontend

Responsive React storefront and role-based shopping/admin experiences connected to the Express API, using a consistent glassmorphism-inspired visual style.

## Run locally

1. Start MongoDB and the backend by following `../backend/README.md`.
2. From this folder, run `npm install`.
3. Copy `.env.example` to `.env` if the API is not at `http://localhost:5000/api`, then set `VITE_API_URL`.
4. Run `npm run dev` and open the local address printed by Vite.

## Included

- Responsive storefront landing page with API-driven categories and featured products
- Product catalog with search, category filtering, sorting, and pagination
- Product details loaded from the backend
- Registration and login connected to the auth API
- Customer cart with quantity controls, delivery details, and simulated checkout
- Customer account overview, order history, wishlist, and profile editing
- Seller overview, product management with image upload, and order fulfillment
- Admin overview, user/seller application management, category management, product moderation, and order status controls
- Shared cart and wishlist state synchronized with the API
- Shared Axios client adds the JWT to protected requests
- Glassmorphism styling, responsive layouts, and loading, empty, not-found, and API error states

## Learn the file structure

- `src/services/api.js` creates one Axios client for the whole frontend.
- `src/context/AuthContext.jsx` shares the current account and login/logout methods across pages.
- `src/context/CartContext.jsx` and `src/context/WishlistContext.jsx` keep shopping state shared between pages.
- `src/components/` contains layout and reusable product cards.
- `src/pages/` contains storefront, customer, seller, admin, and authentication screens.
- `src/App.jsx` connects URL paths to page components.
- `src/App.css` contains responsive page and glass styles; `src/index.css` contains shared base styles.

## Demo limitations

Checkout creates an order through the API but does not process a real payment. Product images are uploaded to the backend's local storage. For this learning/demo project, JWTs are saved in browser local storage; production applications should assess safer session approaches and XSS protections.
