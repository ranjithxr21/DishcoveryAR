# Dishcovery AR- Technical Documentation

## 1. System Overview

Dishcovery ARis a full-stack web application designed to bridge the physical and digital dining experience. It uses **Marker-based Augmented Reality (WebAR)** to overlay 3D models of food onto physical menu items without requiring a mobile app download.

### Architecture Diagram

```mermaid
graph TD
    User[User Mobile Browser]
    Admin[Admin Dashboard]
    Server[Node.js Express Server]
    DB[(SQLite Database)]
    FS[File System /uploads]
    MindAR[MindAR Engine (Client-side)]
    
    User -- HTTPS (Video Stream) --> MindAR
    MindAR -- Image Processing --> User
    
    Admin -- Upload Assets --> Server
    Server -- Save Meta --> DB
    Server -- Save Files --> FS
    
    User -- Fetch Menu Data --> Server
    Server -- Serve Assets --> User
    
    Admin -- Trigger Export --> Server
    Server -- Bundle ZIP --> Admin
```

---

## 2. Technology Stack

### Frontend (Client)
- **Framework**: React 18 (Vite)
- **Styling**: Tailwind CSS
- **AR Engine**: MindAR (Image Tracking)
- **3D Rendering**: Three.js (WebGL)
- **Icons**: Lucide React
- **HTTP Client**: Native Fetch API

### Backend (Server)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Better-SQLite3 (Serverless, local file-based SQL)
- **File Handling**: Multer (Multipart form-data)
- **Compression**: Archiver (Zip generation)

---

## 3. Data Flow & Core Logic

### 3.1. The Asset Pipeline (Admin Side)
1.  **Upload**: Admin uploads a target image (JPG/PNG) and a 3D model (GLB/GLTF).
2.  **Compilation**:
    -   *Browser Mode*: The MindAR Compiler runs in a Web Worker in the browser to convert the image into a `.mind` feature file.
    -   *Storage*: The compiled `.mind` file (binary) is converted to Base64 and sent to the server.
3.  **Storage**:
    -   Images/Models are saved to disk (`/uploads/{itemId}/`).
    -   Metadata and Base64 marker data are saved to SQLite (`menu_items` table).

### 3.2. The AR Runtime (Customer Side)
1.  **Initialization**: The app loads `MindARThree`.
2.  **Tracking Setup**:
    -   The app fetches the Base64 `.mind` data from the API.
    -   It converts it back to a `Blob` and creates an Object URL.
    -   MindAR initializes the camera feed and starts searching for features matching the blob.
3.  **Rendering**:
    -   Once the image is detected (`onTargetFound`), the Three.js scene becomes visible.
    -   The GLB model is anchored to the detected image's coordinates.
4.  **Coordinate System Transformation**:
    -   **MindAR/Three.js** uses a Y-Up world system.
    -   **Image Targets** are treated as lying flat on the Z-plane.
    -   **Correction**: A wrapper Group is rotated `X = 90 deg` to ensure the "Up" of the food model points perpendicular to the menu surface.

---

## 4. Database Schema

The application uses a simple SQLite schema managed via `better-sqlite3`.

### Table: `menu_items`

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT (PK) | Unique timestamp-based ID or custom string. |
| `name` | TEXT | Dish name. |
| `description` | TEXT | Short description. |
| `price` | REAL | Cost of the item. |
| `calories` | INTEGER | Caloric content. |
| `tags` | TEXT | JSON string array of tags (e.g., `["Spicy", "Vegan"]`). |
| `targetImageUrl` | TEXT | Relative URL to the uploaded marker image. |
| `modelUrl` | TEXT | Relative URL to the uploaded GLB model. |
| `compiledTarget` | TEXT | Base64 encoded binary data of the `.mind` file. |
| `modelConfig` | TEXT | JSON string containing transform data (`scale`, `position`, `rotation`). |

---

## 5. API Reference

### Base URL: `/api`

#### **GET** `/menu`
Retrieves all menu items.
- **Response**: JSON Array of `MenuItem` objects.
- **Notes**: Parses JSON strings (`tags`, `modelConfig`) back into objects before responding.

#### **PUT** `/menu/:id`
Creates or updates a menu item.
- **Body**: JSON `MenuItem` object.
- **Behavior**: Uses `INSERT OR REPLACE` logic.

#### **DELETE** `/menu/:id`
Deletes an item from the database.
- **Note**: Does not currently delete the physical files from the `uploads` folder (garbage collection is manual).

#### **POST** `/upload`
Uploads a binary file.
- **Body**: `FormData` containing `file` and `itemId`.
- **Response**: `{ "url": "http://domain.com/uploads/..." }`

#### **GET** `/export`
Generates a standalone website package.
- **Query Params**:
    - `title`, `color`, `theme`, `font`: Branding settings.
    - `paid`: Boolean string (`true`/`false`). Controls watermark injection.
- **Response**: Binary `.zip` file stream.

---

## 6. The Export Engine

The "Export Website" feature is a unique aspect of Dishcovery. It allows admins to generate a completely static, server-less version of the menu.

### How it works:
1.  **Asset Gathering**: The server iterates through all items in the DB.
2.  **Path Rewriting**: It copies local files from `/uploads` into a temporary structure inside the ZIP (`assets/`). It rewrites the URLs in the JSON data to point to these relative paths.
3.  **Marker Conversion**: It takes the Base64 `compiledTarget` from the DB, decodes it to a Buffer, and saves it as a physical `.mind` file in the ZIP. This drastically reduces the HTML size and improves load time for the exported site.
4.  **HTML Injection**: It reads a template string (`server.js -> generateStaticHTML`) and injects the JSON data, branding CSS variables, and the Vanilla JS logic required to run MindAR without React.
5.  **Protection**: If the user is on the "Free" plan (`paid=false`), a MutationObserver script is injected to prevent removing the watermark via DevTools.

---

## 7. AR Security & Protocols

Modern browsers enforce strict security policies regarding Camera access (`navigator.mediaDevices.getUserMedia`).

1.  **HTTPS Requirement**: The camera API **only** works on Secure Contexts (HTTPS) or `localhost`.
2.  **File Protocol Restriction**: You cannot open an HTML file directly from the disk (`file://path/to/index.html`) and expect AR to work. The browser will block the camera.
    -   *Solution*: The exported HTML includes a script checking `window.location.protocol`. If it detects `file:`, it shows a sticky red warning banner instructing the user to use a local server.
