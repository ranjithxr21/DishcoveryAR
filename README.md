# Dishcovery

Dishcovery ARis a full-stack, multi-tenant Augmented Reality food menu application. It enables restaurant customers to visualize dishes in 3D and allows administrators to manage their own menus and branding.

## Features

- **Multi-Tenant SaaS**: Secure user accounts with data isolation between restaurants.
- **Super Admin Dashboard**: Manage users and their subscription plans (Free/Paid).
- **WebAR**: Instant marker-based tracking using MindAR.
- **Interactive Menu**: React-based UI for browsing dishes.
- **Admin Dashboard**: Upload 3D models (.glb), target images, and precisely position them in a real-time 3D previewer.
- **Persistent Storage**: Data stored in a local JSON file (`lowdb`) with file uploads organized by user.
- **Site Export**: Generate a standalone, themed static website (ZIP) with server-side watermarking for free-tier users.
- **Asset Optimization**: Automatic Draco compression for uploaded 3D models.

---

## Prerequisites & Installation

- **Node.js**: v18.0.0 or higher.
- **npm**: Comes with Node.js.

```bash
# 1. Clone the repository
git clone <repository-url>
cd dishcovery-ar

# 2. Install all dependencies
npm install
```
This project uses pure JavaScript dependencies and **does not require** any external build tools like Python or Visual Studio.

---

## Running the Application

Use the unified command to start both the **Backend API** and the **Frontend** development server.

```bash
npm start
```

- **Frontend**: `http://0.0.0.0:3001`
- **Backend API**: `http://0.0.0.0:8080`

### First Time Login (Super Admin)

The very first time you run `npm start`, the server will create a default **Super Admin** account and print its temporary password to your terminal.

```
==========================================
Default Super Admin Account Created:
Email: superadmin@example.com
Password: <a-randomly-generated-password>
==========================================
```

Use these credentials to log in. From the Super Admin dashboard, you can manage users.

### Data Storage

All application data (users, menu items, etc.) is stored in a file named `data.db.json` in the project's root directory. Uploaded assets like images and 3D models are stored in the `/uploads` folder.

---

## Deployment Guides

(Deployment guides remain the same, covering Render, AWS EC2, and Azure.)

---

## Important Notes

(Mobile Testing, Exported Website, and Data Storage notes remain relevant.)