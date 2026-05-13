# Assignment 3: LC-PMS - Long Chau Pharmacy Management System

A comprehensive pharmacy management system for Long Chau Pharmacy with full functionality for Customer, Cashier, Pharmacist, and Branch Manager roles.

## Project Structure

```
lc-pms/
├── backend/          # Node.js + Express API
├── frontend/         # React + Vite + Material-UI
└── database/         # MySQL Schema
```

## System Requirements
Please make sure you have Node.js and MySQL installed on your machine.

## Project Setup

### 1. Database Setup

First, create the database and import the schema. Make sure you have MySQL installed and running. The database schema is located in the `database/schema.sql` file.

### 2. Backend Setup
The first thing to do is check the `.env` file in the backend folder. You need to adjust the database connection settings to match with your system. Other parts can (and should) be left unchanged.

After putting the `.env` file in the backend folder, you can run the following commands to install necessary dependencies:
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install
```

### 3. Frontend Setup
To set up the frontend, go to the `frontend` directory and run the following commands:
```bash
# Navigate to frontend directory (open new terminal)
cd frontend

# Install dependencies
npm install
```

## Commands to Run

### Start Backend Server
```bash
cd backend
node server.js
```

### Start Frontend Server
```bash
cd frontend
npm run dev
```

### Access the Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Demo Accounts

All pre-configured accounts use the password: **`password123`**

### Branch Manager
- **Email**: `manager@longchau.com`
- **Password**: `password123`
- **Access**: All system features including staff management, warehouse, sales reports, and promotions

### Sample Staff Accounts

#### Pharmacist
- **Email**: `emily.carter@longchau.com`
- **Password**: `password123`
- **Access**: Home page, prescription validation

#### Cashier
- **Email**: `luke.mitchell@longchau.com`
- **Password**: `password123`
- **Access**: Home page, warehouse management, order management, in-store ordering

#### Customer
- **Email**: `john.smith@email.com`
- **Password**: `password123`
- **Access**: Home page, product browsing, shopping cart, order status tracking
- **Note**: This is a dummy email. For testing email functionality, create new customer accounts with real email addresses.

### Creating Additional Accounts

#### Customer Accounts for Email Testing
- **Registration**: Register directly at the Register page
- **Important**: Use a **real email address** when creating new customer accounts to test email functionality (order confirmations, promotions, etc.)
- **Recommended for testing**: Use your personal email or a test email you have access to

#### Staff Accounts (Cashier/Pharmacist)
- **Creation**: Created by Branch Manager through Staff Management page
- **Process**: Login as Branch Manager → Staff Management → Add New Staff Member

## Role-Based Access Control

### Customer
- Home page
- Product browsing
- Shopping cart
- Order status tracking

### Cashier
- Home page
- Warehouse management
- Order management
- In-store ordering

### Pharmacist
- Home page
- Prescription validation

### Branch Manager
- Home page
- Warehouse management
- Sales reports
- Staff management
- Promotions management

## Key Features

**Completed Features:**
- User authentication and authorization
- Role-based access control
- Responsive navigation with dropdown menus
- Complete database schema
- Product management (CRUD operations)
- Shopping cart functionality
- Order processing
- Prescription validation
- Sales reporting with charts
- Staff management
- Email promotions