# MERN E-Commerce Backend

This is the local-development backend for the multi-vendor e-commerce proposal. It provides REST APIs for accounts, sellers, products, categories, shopping, verified product reviews, Razorpay test checkout, and dashboard summaries.

## Set up locally

1. Install Node.js and MongoDB Community Server. Make sure the MongoDB service is running.
2. From this folder, copy `.env.example` to `.env`.
3. Generate a private JWT secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and place it in `.env`. Set `ADMIN_PASSWORD` to a private password of at least 8 characters. Set `FRONTEND_ORIGIN` to the browser origin(s) allowed to call the API, comma-separated if needed. The sample values are placeholders.
4. Install dependencies with `npm install`.
5. Create the first admin once with `npm run seed:admin`.
6. Start the API with `npm run dev`.
7. Check `http://localhost:5000/api/health`.

The admin seed script creates an account only if no admin exists. It will not promote an arbitrary public account. Never commit or share `.env`.

### Configure Razorpay test checkout

1. Create or sign in to a Razorpay account and switch its dashboard to **Test Mode**.
2. Generate a test Key ID and Key Secret in the Razorpay dashboard.
3. Put them in the backend `.env` as `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Never put the secret in frontend environment variables or commit it.
4. Enable automatic payment capture in the Razorpay dashboard.
5. Webhooks are optional for local checkout. To receive server-side payment notifications:
   - In the Razorpay dashboard's **Webhooks** settings, add `https://<your-public-backend>/api/payments/razorpay/webhook` and subscribe to `payment.captured`.
   - Choose a new, random webhook secret. You can generate one locally with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
   - Enter that same secret in the Razorpay webhook configuration and in the backend `.env` as `RAZORPAY_WEBHOOK_SECRET`. This is a secret you choose; it is separate from `RAZORPAY_KEY_SECRET`. Never put either secret in frontend code or commit/share them.
   - Razorpay must be able to reach the webhook over HTTPS. For local development, use a secure public tunnel and configure its public HTTPS URL. Checkout signature verification works without a webhook.
6. Restart the backend after changing `.env`. The frontend starts Checkout using the key ID returned by the backend.

The backend creates the payment amount from current database prices, rounds each unit price to paise before saving order snapshots and totals, reserves stock while payment is pending, verifies the Checkout signature and captured payment with Razorpay, and releases stock for expired/failed attempts. Pending payment reservations expire after 15 minutes. Use Razorpay's published test payment details while in Test Mode; no real charge is made. Do not switch to live keys until account activation, HTTPS, webhook delivery, refund handling, and production monitoring are ready.

### Add local demo storefront data

To populate the local storefront with sample listings and customer activity, set `DEMO_PASSWORD` to a password with at least 12 characters, then run `npm run seed:demo`. For example, in PowerShell:

```powershell
$env:MONGODB_URI = "mongodb://127.0.0.1:27017/mern_ecommerce"
$env:DEMO_PASSWORD = "MorrowDemo#2026"
npm run seed:demo
Remove-Item Env:\MONGODB_URI, Env:\DEMO_PASSWORD
```

Choose a different password if you prefer, and use that same value for all five demo accounts. The script only runs against the local `mern_ecommerce` database. It creates two approved demo sellers, three demo customers, four sample categories, eight products, customer carts and wishlists, and four sample orders. It is safe to run again with the same password and does not change existing orders, products, or non-demo accounts. It will refuse to reset a seeded user's password if you provide a different one later.

Demo account emails:

- `demo.maker.one@example.test`
- `demo.maker.two@example.test`
- `demo.shopper.one@example.test`
- `demo.shopper.two@example.test`
- `demo.shopper.three@example.test`

New demo accounts use the password supplied as `DEMO_PASSWORD`. Sample product photos are loaded from Unsplash, so an internet connection is needed to display them. Demo orders are illustrative records; seeding them does not decrement product inventory. These credentials are for local testing only.

## API route summary

All routes are prefixed with `/api`.

| Area | Route | Access |
|---|---|---|
| Health | `GET /health` | Public |
| Authentication | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | Public / logged-in |
| Users | `GET /users`, `GET /users/:id`, `PUT /users/profile` | Admin / self-or-admin / logged-in |
| Seller review | `PUT /users/:id/approve-seller`, `PUT /users/:id/reject-seller` | Admin |
| User management | `PUT /users/:id/status` | Admin |
| Categories | `GET /categories`, `GET /categories/all`, `POST /categories`, `PUT /categories/:id`, `DELETE /categories/:id` | Public list / admin |
| Products | `GET /products`, `GET /products/:id`, `GET /products/mine`, `POST /products`, `PUT /products/:id`, `DELETE /products/:id` | Public read / seller or admin write |
| Reviews | `GET /reviews/products/:productId`, `GET /reviews/products/:productId/eligibility`, `POST /reviews/products/:productId` | Public read / delivered-purchase customer write |
| Review moderation | `GET /reviews`, `PUT /reviews/:id/moderation` | Admin |
| Wishlist | `GET /wishlist`, `POST /wishlist/add`, `DELETE /wishlist/remove/:productId` | Customer |
| Cart | `GET /cart`, `POST /cart/add`, `PUT /cart/update`, `DELETE /cart/remove/:productId` | Customer |
| Orders | `GET /orders`, `GET /orders/:id` | Logged-in |
| Demo checkout | `POST /orders/demo` | Customer; explicitly enabled outside production |
| Fulfillment | `PUT /orders/:orderId/items/:itemId/fulfillment` | Owning seller |
| Payments | `POST /payments/razorpay/order`, `POST /payments/razorpay/verify`, `POST /payments/razorpay/order/:id/cancel` | Customer |
| Payment webhook | `POST /payments/razorpay/webhook` | Razorpay HMAC signature |
| Dashboards | `GET /dashboard/admin`, `/dashboard/seller`, `/dashboard/customer` | Matching role |

Protected requests use `Authorization: Bearer <JWT>`. Registration allows customer and seller roles; new sellers remain pending until an admin approves them. Admin accounts are created through the local seed command.

Product listing accepts `search`, `category`, `minPrice`, `maxPrice`, `sort`, `page`, and `limit`. Sort values are `price-low`, `price-high`, and `newest`. Product image uploads use `multipart/form-data`, with up to five files under the `images` field; JPG, PNG, and WEBP are accepted, with both extension/content checks and a 5 MB per-file limit.

## Reviews and order behavior

Customers can submit one review per product only after an order containing that product is delivered. Reviews are published immediately; admins can block or restore reviews from the Reviews screen. Blocked reviews are omitted from public product pages.

Razorpay creates and verifies payments; the backend calculates prices and stores product/seller snapshots. Inventory is reserved atomically during checkout and returned when a pending payment expires or is cancelled. Only captured payments become paid orders and clear purchased quantities from the cart.

Each seller updates fulfillment only for their own paid order items, one step at a time: `pending → confirmed → shipped → delivered`. The overall order status is derived from all its items; mixed item statuses show as `partially_fulfilled`. Admins can view orders and payment status but cannot change fulfillment or overall order status.

The seller dashboard uses a low-stock threshold of 5 units. Cloud image storage, seller payouts, refunds, and production deployment are outside the initial scope.

For local demonstrations only, set `DEMO_CHECKOUT_ENABLED=true` in the backend `.env` and `VITE_DEMO_CHECKOUT_ENABLED=true` in the frontend `.env` to show a no-gateway demo order button. Demo checkout recalculates prices and reserves stock on the backend. The backend rejects this route when `NODE_ENV=production`.

## Tests

Run the backend's automated checks with:

```powershell
npm test
```

These tests cover validation helpers, schema constraints, and the health endpoint. For complete API workflows, run MongoDB and the server, then exercise the endpoints with Postman.
