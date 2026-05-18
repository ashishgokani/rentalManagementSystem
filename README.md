# RentPe - Enterprise Rental Management Platform

RentPe is a premium, modern, and highly feature-rich Enterprise Rental Management System built with a state-of-the-art tech stack. It supports roles for Customers, Vendors, and Administrators, providing out-of-the-box support for product catalogs, custom quotation handling, direct checkouts, auto-billing, transaction logs, and dynamic user wallets.

---

## 🚀 Tech Stack

- **Frontend:** React 18, TypeScript, TailwindCSS, Vite
- **Backend (API):** Node.js, Express, Prisma ORM, PostgreSQL (REST APIs)
- **Authentication:** Role-Based Access Control (RBAC), JWT, OAuth 2.0 (Google, GitHub)
- **Services:** Nodemailer SMTP integration, Google Calendar synchronization

---

## 📂 Project Structure

```text
├── frontend/             # React application (Vite + TypeScript)
│   ├── src/
│   │   ├── api/          # Dynamic API service callers (Auth, Wallet, Invoices, Orders)
│   │   ├── pages/        # Dynamic views (Wallet, Invoices, Orders, Cart, Profile)
│   │   └── context/      # Auth & Application State Contexts
│   └── package.json
│
└── backend/              # Node.js + Express API Server (EXCLUDED IN GIT PUSH)
    ├── prisma/           # PostgreSQL Schema and Migrations
    ├── src/
    │   ├── controllers/  # Controllers (Auth, Product, Wallet, Invoice, Order)
    │   ├── routes/       # REST API Endpoints
    │   └── services/     # Core Business Services (Auth, Google Calendar, Nodemailer SMTP, Wallet)
    └── server.js         # Entrypoint
```

---

## 🛠️ Setup Instructions (At another place / local machine)

Follow these exact steps to restore and launch the project on a new local machine:

### 1. Prerequisites
- **Node.js:** Ensure Node.js (version 18 or above) is installed.
- **PostgreSQL:** Ensure PostgreSQL database service is running locally.

---

### 2. Setting Up the Frontend
1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install node dependencies:
   ```bash
   npm install
   ```
3. Create the local `.env` environment variables file:
   ```bash
   # Create a .env file and write the backend endpoint
   VITE_API_URL=http://localhost:5000
   ```
4. Start the frontend developer server:
   ```bash
   npm run dev
   ```
   *The client application will run successfully on `http://localhost:3000`.*

---

### 3. Setting Up the Backend (If running the Express server)
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install express and prisma dependencies:
   ```bash
   npm install
   ```
3. Configure the database connector `.env` variables:
   ```env
   PORT=5000
   DATABASE_URL="postgresql://<username>:<password>@localhost:5432/<dbname>?schema=public"
   JWT_SECRET="your-jwt-secure-secret-key-string"
   ```
4. Perform database synchronization:
   ```bash
   npx prisma db push
   ```
5. Seed the database with initial user roles, products, wallets, and invoices:
   ```bash
   node seed.js
   ```
6. Start the Express API server:
   ```bash
   npm run dev
   ```
   *The REST API server will launch successfully on `http://localhost:5000`.*

---

## 📦 How to Push Code to GitHub (Excluding Backend)

If you wish to push this project repository to GitHub **without including the backend folder**, do the following:

### Step 1: Initialize Git and verify the `.gitignore`
Make sure you are in the root directory `odooxgcet81/`.
The `.gitignore` has been pre-configured with:
```gitignore
# Exclude backend
backend/
node_modules/
dist/
.env
```

### Step 2: Clear cache (if backend was previously tracked)
If the backend folder was tracked in your git repository history before, run:
```bash
git rm -r --cached backend
```

### Step 3: Stage and Commit the files
Add all other files (frontend code, README, configurations) and commit them:
```bash
git add .
git commit -m "feat: complete node-express services integration and exclude backend from repository"
```

### Step 4: Add your remote GitHub Repository
Link this repository to your remote GitHub repository (replace `<username>` and `<repository>` with your actual URL):
```bash
git remote add origin https://github.com/<username>/<repository>.git
git branch -M main
```

### Step 5: Push to GitHub
```bash
git push -u origin main
```
*Your frontend and top-level configs are now safely pushed to your remote repository while leaving the backend folder perfectly ignored!*
