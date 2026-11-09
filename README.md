# Morrow Market

A multi-vendor e-commerce learning project built with MongoDB, Express, React, and Node.js. Customers can discover products, manage a cart and wishlist, place orders, and leave verified-purchase reviews. Sellers manage their products and fulfill their own orders, while admins oversee the marketplace and moderate reviews.

The storefront uses a responsive, glassmorphism-inspired design. Payments are integrated with Razorpay in test mode; real payments are not enabled by default.

## Features

- Customer, seller, and admin accounts with role-based access
- Product catalog with categories, search, filters, and image uploads
- Customer cart, wishlist, order history, and profile
- Razorpay test checkout with server-side signature and captured-payment verification
- Verified-purchase reviews, published immediately and manageable by admins
- Seller-managed order fulfillment with overall status derived from order items
- Admin dashboards and marketplace management

## Technology

- **Frontend:** React, Vite, Redux Toolkit, React Router, Axios
- **Backend:** Node.js, Express, Mongoose, JWT
- **Database:** MongoDB
- **Payments:** Razorpay

## Run locally

### Prerequisites

- Node.js and npm
- MongoDB Community Server running locally, or a MongoDB connection string

### 1. Configure and start the backend

Open a terminal in the project root and run:

```powershell
Set-Location .\backend
Copy-Item .env.example .env
npm install
```

Edit `backend/.env`:

- Set `JWT_SECRET` to a private random value. Generate one with:
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Set `ADMIN_PASSWORD` to a private password of at least 8 characters.
- Set `MONGODB_URI` if MongoDB is not using the local default.
- Razorpay values are optional for browsing the app. Follow the [backend Razorpay setup](./backend/README.md#configure-razorpay-test-checkout) to configure test payments and webhooks.

Create the initial admin account and start the API:

```powershell
npm run seed:admin
npm run dev
```

The API runs at `http://localhost:5000`. Check `http://localhost:5000/api/health` to confirm it is available.

### 2. Start the frontend

In a second terminal, from the project root:

```powershell
Set-Location .\frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open the local URL printed by Vite. The default frontend API URL is `http://localhost:5000/api`; set `VITE_API_URL` in `frontend/.env` if your backend uses a different address.

### Optional: add demo storefront data

The backend includes a demo-data seed script for local development. See [backend setup and demo data instructions](./backend/README.md#add-local-demo-storefront-data) for details. Use demo accounts and passwords only in your local development database.

## Testing

Run backend tests:

```powershell
Set-Location .\backend
npm test
```

Build and lint the frontend:

```powershell
Set-Location .\frontend
npm run build
npm run lint
```

## Documentation

- [Backend setup, environment variables, API routes, and Razorpay configuration](./backend/README.md)
- [Frontend setup and code structure](./frontend/README.md)

## Security notes

- Never commit `.env` files or share secrets. The backend `.gitignore` excludes its local `.env`.
- Keep Razorpay secrets on the backend; only use test credentials during local development.
- Do not use the development seed accounts or local configuration for a production deployment.
