# Zater — Food Delivery Platform

A full-stack, multi-interface food delivery application with a Customer App, Driver App, and Restaurant/Merchant Management Dashboard. This README covers local setup: installing dependencies, configuring environment variables, running the database schema, and starting the servers.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Structure](#2-project-structure)
3. [Clone the Repository](#3-clone-the-repository)
4. [Install npm Packages](#4-install-npm-packages)
5. [Configure Environment Variables](#5-configure-environment-variables)
6. [Run the SQL Schema](#6-run-the-sql-schema)
7. [Start the Backend Server](#7-start-the-backend-server)
8. [Start the Frontend Servers](#8-start-the-frontend-servers)
9. [Open the App in Your Browser](#9-open-the-app-in-your-browser)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

Make sure the following are installed on your machine before you begin:

1. **Node.js** v18 or later — [https://nodejs.org](https://nodejs.org)
2. **npm** v9 or later (bundled with Node.js)
3. **PostgreSQL** v14 or later — [https://www.postgresql.org/download](https://www.postgresql.org/download)
4. **Git** — [https://git-scm.com](https://git-scm.com)
5. **Redis** v6 or later (used for real-time geolocation caching and pub/sub) — [https://redis.io/download](https://redis.io/download)

Verify your versions:

```bash
node -v
npm -v
psql --version
redis-server --version
```

---

## 2. Project Structure

```
zater/
├── backend/            # Node.js + Express API server
├── frontend-customer/  # Customer web/app client
├── frontend-driver/    # Driver app client
├── frontend-merchant/  # Restaurant/Merchant dashboard
├── db/
│   └── schema.sql      # PostgreSQL schema
└── README.md
```

---

## 3. Clone the Repository

```bash
git clone https://github.com/your-org/zater.git
cd zater
```

---

## 4. Install npm Packages

Install dependencies for each part of the stack.

### 4.1 Backend

```bash
cd backend
npm install
```

Backend packages installed:

```bash
npm install express pg redis socket.io jsonwebtoken bcryptjs dotenv cors helmet morgan express-validator
```

Backend dev dependencies:

```bash
npm install --save-dev nodemon
```

### 4.2 Frontend (run for each client)

```bash
cd ../frontend-customer
npm install

cd ../frontend-driver
npm install

cd ../frontend-merchant
npm install
```

Common frontend packages per client:

```bash
npm install react react-dom react-router-dom axios socket.io-client @tanstack/react-query mapbox-gl
```

Frontend dev dependencies:

```bash
npm install --save-dev vite @vitejs/plugin-react
```

---

## 5. Configure Environment Variables

Create a `.env` file in **each** directory using the templates below.

### 5.1 `backend/.env`

```env
# Server
PORT=5000
NODE_ENV=development

# PostgreSQL
DATABASE_URL=postgresql://zater_user:your_password@localhost:5432/zater_db
PGHOST=localhost
PGPORT=5432
PGUSER=zater_user
PGPASSWORD=your_password
PGDATABASE=zater_db

# Redis (real-time geolocation cache & pub/sub)
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d

# Third-party services
MAPBOX_API_KEY=your_mapbox_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key

# AI services (route optimization & recommendations)
AI_SERVICE_URL=http://localhost:8000
OPENAI_API_KEY=your_openai_api_key
```

### 5.2 `frontend-customer/.env`, `frontend-driver/.env`, `frontend-merchant/.env`

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_MAPBOX_API_KEY=your_mapbox_api_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

> ⚠️ Never commit `.env` files. Ensure they are listed in `.gitignore`.

---

## 6. Run the SQL Schema

### 6.1 Create the Database and User

Open the PostgreSQL shell:

```bash
psql -U postgres
```

Then run:

```sql
CREATE DATABASE zater_db;
CREATE USER zater_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE zater_db TO zater_user;
\q
```

### 6.2 Load the Schema

From the project root, run the schema file against the database:

```bash
psql -U zater_user -d zater_db -f db/schema.sql
```

The schema creates the core tables: `users`, `restaurants`, `menu_items`, `orders`, and `driver_logistics`.

### 6.3 Verify the Tables

```bash
psql -U zater_user -d zater_db -c "\dt"
```

You should see all five tables listed.

---

## 7. Start the Backend Server

Make sure **PostgreSQL** and **Redis** are running first:

```bash
# Start Redis (in a separate terminal)
redis-server
```

Then start the API server:

```bash
cd backend
npm run dev      # development mode with nodemon
# or
npm start        # production mode
```

The backend runs at: **http://localhost:5000**

Health check:

```bash
curl http://localhost:5000/api/health
```

---

## 8. Start the Frontend Servers

Open a separate terminal for each client you want to run.

### 8.1 Customer App

```bash
cd frontend-customer
npm run dev
```
Runs at **http://localhost:5173**

### 8.2 Driver App

```bash
cd frontend-driver
npm run dev
```
Runs at **http://localhost:5174**

### 8.3 Merchant Dashboard

```bash
cd frontend-merchant
npm run dev
```
Runs at **http://localhost:5175**

> Ports are defined in each client's `vite.config.js`. Adjust if they conflict.

---

## 9. Open the App in Your Browser

Once the servers are running, open the following URLs:

| Interface           | URL                       |
|---------------------|---------------------------|
| Customer App        | http://localhost:5173     |
| Driver App          | http://localhost:5174     |
| Merchant Dashboard  | http://localhost:5175     |
| Backend API         | http://localhost:5000/api |

Log in or register through each interface to begin testing.

---

## 10. Troubleshooting

1. **Database connection refused** — Confirm PostgreSQL is running and `DATABASE_URL` credentials in `backend/.env` are correct.
2. **Redis connection error** — Ensure `redis-server` is running and `REDIS_URL` is correct. Real-time tracking will fail without it.
3. **CORS errors** — Verify `VITE_API_BASE_URL` matches the backend port and that the backend `cors` origin allows your frontend URLs.
4. **Port already in use** — Change the `PORT` in `backend/.env` or the port in the relevant `vite.config.js`.
5. **Map not rendering** — Confirm your `MAPBOX_API_KEY` / `VITE_MAPBOX_API_KEY` is valid and not rate-limited.
6. **Schema errors on load** — Drop and recreate the database, then re-run `db/schema.sql`.

---

**You're all set!** With the database seeded, Redis and the backend running, and all three frontends started, Zater is ready for local development.