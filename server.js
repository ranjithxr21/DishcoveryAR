
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import { createRequire } from 'module';
import sharp from 'sharp';
import session from 'express-session';
import sessionFileStore from 'session-file-store';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { v4 as uuidv4 } from 'uuid';
import helmet from 'helmet';

const require = createRequire(import.meta.url);
const gltfPipeline = require('gltf-pipeline');
const { processGlb } = gltfPipeline;

// --- CONFIGURATION ---
const PORT = 8080;
const UPLOAD_DIR = 'uploads';
const DB_FILE = 'data.db.json';
const SESSION_SECRET = crypto.randomBytes(32).toString('hex');

// --- SETUP ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

fs.ensureDirSync(UPLOAD_DIR);
fs.ensureDirSync(path.join(__dirname, 'sessions'));

// --- DATABASE SETUP (lowdb) ---
const adapter = new JSONFile(DB_FILE);

const defaultData = {
  users: [],
  menu_items: [],
  library_items: [],
  settings: {
      plans: {
          free: { maxMenuItems: 10, maxUploadSizeMB: 15, canRemoveWatermark: false },
          paid: { maxMenuItems: 1000, maxUploadSizeMB: 100, canRemoveWatermark: true }
      }
  }
};
const db = new Low(adapter, defaultData);
await db.read();

// Ensure settings exist for existing databases
if (!db.data.settings) {
    db.data.settings = defaultData.settings;
    await db.write();
}

// --- CREATE DEFAULT SUPER ADMIN ---
const initSuperAdmin = async () => {
  const superAdminEmail = 'superadmin@example.com';
  const userExists = db.data.users.some(u => u.email === superAdminEmail);

  if (!userExists) {
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const hashedPassword = bcrypt.hashSync(tempPassword, 10);
    const superAdmin = {
      id: 1, // predictable ID
      email: superAdminEmail,
      password: hashedPassword,
      role: 'superadmin',
      plan: 'paid'
    };
    db.data.users.push(superAdmin);
    await db.write();

    console.log('==========================================');
    console.log('Default Super Admin Account Created:');
    console.log(`Email: ${superAdminEmail}`);
    console.log(`Password: ${tempPassword}`);
    console.log('==========================================');
  }
};

const initDemoUser = async () => {
    const demoEmail = 'demo@gastrovision.com';
    const userExists = db.data.users.some(u => u.email === demoEmail);
    if (!userExists) {
        const hashedPassword = bcrypt.hashSync('demo123', 10);
        const demoUser = {
            id: 2,
            email: demoEmail,
            password: hashedPassword,
            role: 'admin',
            plan: 'free',
            profile: {
                name: "Dishcovery ARDemo Bistro",
                address: "123 Innovation Dr, Tech City",
                website: "https://dishcovery.com",
                instagram: "https://instagram.com/dishcovery",
                ambienceUrls: []
            }
        };
        db.data.users.push(demoUser);
        await db.write();
        console.log('Demo User Created: demo@gastrovision.com / demo123');
    }
};

await initSuperAdmin();
await initDemoUser();

const app = express();
const FileStore = sessionFileStore(session);

// --- SECURITY HEADERS ---
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(cors({
  origin: 'http://0.0.0.0:3001',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, UPLOAD_DIR)));

// --- SESSION MIDDLEWARE ---
app.use(session({
    store: new FileStore({ path: './sessions', logFn: () => {} }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
        httpOnly: true,
        sameSite: 'lax',
    },
}));

// --- AUTH MIDDLEWARE ---
const authMiddleware = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};
const superAdminMiddleware = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.session.user?.id || 'public';
    const itemId = req.body.itemId || 'misc';
    const dir = path.join(UPLOAD_DIR, `user_${userId}`, itemId);
    fs.ensureDirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now();
    const ext = path.extname(file.originalname);
    const safeName = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    cb(null, `${req.body.type || 'asset'}-${safeName}-${uniqueSuffix}${ext}`);
  }
});
const upload = multer({ storage });

const optimizeGLB = async (filePath) => {
    try {
        const glb = fs.readFileSync(filePath);
        const options = {
            dracoOptions: {
                compressionLevel: 7,
            },
        };
        const results = await processGlb(glb, options);
        fs.writeFileSync(filePath, results.glb);
        console.log(`Optimized GLB: ${filePath}`);
    } catch (err) {
        console.error("Optimization failed:", err);
    }
};

const watermarkImage = async (imagePath) => {
    try {
        // High-contrast SVG watermark with background
        const watermarkSvg = `
            <svg width="280" height="50" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="280" height="50" rx="25" ry="25" fill="rgba(0,0,0,0.6)" />
                <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="white" font-weight="bold">
                    Powered by Dishcovery ARAR
                </text>
            </svg>
        `;
        const watermarkBuffer = Buffer.from(watermarkSvg);

        const image = sharp(imagePath);
        const metadata = await image.metadata();
        
        // Only watermark if image is large enough
        if (metadata.width > 300) {
            const buffer = await image
                .composite([{
                    input: watermarkBuffer,
                    gravity: 'southeast',
                    blend: 'over'
                }])
                .toBuffer();
            return buffer;
        }
        return await image.toBuffer();
    } catch (err) {
        console.error("Watermarking failed", err);
        return fs.readFileSync(imagePath); // Return original on error
    }
};

// --- AUTH ROUTES ---
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    await db.read();
    const user = db.data.users.find(u => u.email === email);

    if (user && bcrypt.compareSync(password, user.password)) {
        const { password, ...userData } = user;
        req.session.user = userData;
        res.json(userData);
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    
    await db.read();
    if (db.data.users.some(u => u.email === email)) {
        return res.status(409).json({ error: 'Email already in use' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const newUser = {
        id: db.data.users.length > 0 ? Math.max(...db.data.users.map(u => u.id)) + 1 : 1,
        email,
        password: hashedPassword,
        role: 'admin',
        plan: 'free',
        upgradeRequested: false,
        profile: {}
    };
    db.data.users.push(newUser);
    await db.write();

    const { password: _, ...userData } = newUser;
    req.session.user = userData;
    res.status(201).json(userData);
});


app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ error: 'Logout failed' });
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});
app.get('/api/session', (req, res) => {
    res.json(req.session.user || null);
});

// --- SETTINGS ROUTES ---
app.get('/api/settings', authMiddleware, async (req, res) => {
    await db.read();
    res.json(db.data.settings);
});

// --- PROFILE ROUTES ---
app.put('/api/profile/password', authMiddleware, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' });

    await db.read();
    const userIndex = db.data.users.findIndex(u => u.id === req.session.user.id);
    const user = db.data.users[userIndex];
    
    if (!bcrypt.compareSync(currentPassword, user.password)) {
        return res.status(401).json({ error: 'Current password incorrect' });
    }

    user.password = bcrypt.hashSync(newPassword, 10);
    await db.write();
    res.json({ success: true });
});

app.put('/api/profile', authMiddleware, async (req, res) => {
    const { email, profile } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    await db.read();
    const existing = db.data.users.find(u => u.email === email && u.id !== req.session.user.id);
    if (existing) return res.status(409).json({ error: "Email in use" });

    const userIndex = db.data.users.findIndex(u => u.id === req.session.user.id);
    db.data.users[userIndex].email = email;
    if (profile) {
        db.data.users[userIndex].profile = profile;
    }
    await db.write();
    
    // Update session user data
    const { password, ...updatedUser } = db.data.users[userIndex];
    req.session.user = updatedUser;
    
    res.json({ success: true, user: updatedUser });
});

app.post('/api/profile/upgrade-request', authMiddleware, async (req, res) => {
    await db.read();
    const userIndex = db.data.users.findIndex(u => u.id === req.session.user.id);
    
    if (db.data.users[userIndex].plan === 'paid') {
        return res.status(400).json({ error: 'You are already on a Paid plan' });
    }

    db.data.users[userIndex].upgradeRequested = true;
    await db.write();
    
    // Update session
    req.session.user.upgradeRequested = true;
    
    res.json({ success: true, user: { ...db.data.users[userIndex], password: undefined } });
});


// --- SECURED ROUTES ---
app.post('/api/upload', authMiddleware, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    // Plan Enforcement: Max File Size
    await db.read();
    const plan = req.session.user.plan;
    const settings = db.data.settings.plans[plan];
    const fileSizeMB = req.file.size / (1024 * 1024);

    if (fileSizeMB > settings.maxUploadSizeMB) {
        fs.removeSync(req.file.path); // Delete the large file
        return res.status(400).json({ error: `File too large. Your ${plan} plan limit is ${settings.maxUploadSizeMB}MB.` });
    }

    const userId = req.session.user.id;
    const itemId = req.body.itemId || 'misc';
    
    if (req.file.originalname.toLowerCase().endsWith('.glb')) {
        await optimizeGLB(req.file.path);
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/user_${userId}/${itemId}/${req.file.filename}`;
    res.json({ url: fileUrl });
});

app.get('/api/menu', authMiddleware, async (req, res) => {
    await db.read();
    const items = db.data.menu_items.filter(item => item.userId === req.session.user.id);
    res.json(items);
});

app.post('/api/menu/duplicate', authMiddleware, async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: "Invalid IDs" });

    await db.read();
    const userId = req.session.user.id;
    const plan = req.session.user.plan;
    const settings = db.data.settings.plans[plan];
    
    const userItems = db.data.menu_items.filter(i => i.userId === userId);
    if (userItems.length + ids.length > settings.maxMenuItems) {
        return res.status(403).json({ error: `Cannot duplicate. Plan limit of ${settings.maxMenuItems} items reached.` });
    }

    const newItems = [];

    for (const id of ids) {
        const originalItem = db.data.menu_items.find(i => i.id === id && i.userId === userId);
        if (!originalItem) continue;

        const newId = uuidv4();
        const newItem = { ...originalItem, id: newId, name: `${originalItem.name} (Copy)` };

        // Physically copy the folder
        const oldDir = path.join(UPLOAD_DIR, `user_${userId}`, id);
        const newDir = path.join(UPLOAD_DIR, `user_${userId}`, newId);

        try {
            if (fs.existsSync(oldDir)) {
                fs.copySync(oldDir, newDir);
                
                // Update URLs to point to new ID
                if (newItem.targetImageUrl) {
                    newItem.targetImageUrl = newItem.targetImageUrl.replace(id, newId);
                }
                if (newItem.modelUrl) {
                    newItem.modelUrl = newItem.modelUrl.replace(id, newId);
                }
            }
        } catch(e) {
            console.error(`Failed to copy assets for ${id}`, e);
        }
        
        db.data.menu_items.unshift(newItem); // Add to top
        newItems.push(newItem);
    }
    
    await db.write();
    res.json({ success: true, items: newItems });
});

app.post('/api/menu/delete-batch', authMiddleware, async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: "Invalid IDs" });

    const userId = req.session.user.id;
    await db.read();

    const initialLength = db.data.menu_items.length;
    // Filter out items that match both ID and UserID
    db.data.menu_items = db.data.menu_items.filter(item => {
        if (item.userId === userId && ids.includes(item.id)) {
            // It's a match, we are deleting it. Clean up files.
            const itemDir = path.join(UPLOAD_DIR, `user_${userId}`, item.id);
            try {
                if (fs.existsSync(itemDir)) {
                    fs.removeSync(itemDir);
                }
            } catch (e) {
                console.error(`Failed to delete dir ${itemDir}`, e);
            }
            return false; // Remove from array
        }
        return true; // Keep in array
    });

    await db.write();
    res.json({ success: true, deletedCount: initialLength - db.data.menu_items.length });
});

app.put('/api/menu/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const itemData = req.body;

    await db.read();
    const plan = req.session.user.plan;
    const settings = db.data.settings.plans[plan];
    const userItems = db.data.menu_items.filter(i => i.userId === req.session.user.id);
    
    const isNew = !userItems.find(i => i.id === id);

    // Plan Enforcement: Max Menu Items
    if (isNew && userItems.length >= settings.maxMenuItems) {
        return res.status(403).json({ error: `You have reached the limit of ${settings.maxMenuItems} items on the ${plan} plan.` });
    }

    const index = db.data.menu_items.findIndex(item => item.id === id && item.userId === req.session.user.id);

    if (index !== -1) {
        db.data.menu_items[index] = { ...itemData, id, userId: req.session.user.id };
    } else {
        db.data.menu_items.push({ ...itemData, id, userId: req.session.user.id });
    }
    await db.write();
    res.json({ success: true, id });
});

app.delete('/api/menu/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const userId = req.session.user.id;

    await db.read();
    const initialLength = db.data.menu_items.length;
    db.data.menu_items = db.data.menu_items.filter(item => !(item.id === id && item.userId === userId));
    
    if (db.data.menu_items.length < initialLength) {
        const itemDir = path.join(UPLOAD_DIR, `user_${userId}`, id);
        try {
            if (fs.existsSync(itemDir)) {
                fs.removeSync(itemDir);
            }
        } catch (e) {
            console.error(e);
        }
    }

    await db.write();
    res.json({ success: true });
});

app.get('/api/library', authMiddleware, async (req, res) => {
    await db.read();
    const items = db.data.library_items.filter(item => item.userId === req.session.user.id);
    res.json(items);
});

app.post('/api/library', authMiddleware, async (req, res) => {
    const itemData = { ...req.body, userId: req.session.user.id, id: uuidv4() };
    await db.read();
    db.data.library_items.push(itemData);
    await db.write();
    res.status(201).json(itemData);
});

// --- SUPER ADMIN ROUTES ---
app.get('/api/super/users', authMiddleware, superAdminMiddleware, async (req, res) => {
    await db.read();
    const users = db.data.users.map(({ password, ...user }) => user); 
    res.json(users);
});
app.put('/api/super/users/:id/plan', authMiddleware, superAdminMiddleware, async (req, res) => {
    const { id } = req.params;
    const { plan } = req.body;
    await db.read();
    const userIndex = db.data.users.findIndex(u => u.id === parseInt(id));
    if (userIndex !== -1) {
        db.data.users[userIndex].plan = plan;
        if (plan === 'paid') {
            db.data.users[userIndex].upgradeRequested = false; // Auto-clear request on approve
        }
        await db.write();
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});
app.post('/api/super/users/:id/reject-upgrade', authMiddleware, superAdminMiddleware, async (req, res) => {
    const { id } = req.params;
    await db.read();
    const userIndex = db.data.users.findIndex(u => u.id === parseInt(id));
    if (userIndex !== -1) {
        db.data.users[userIndex].upgradeRequested = false;
        await db.write();
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

app.put('/api/super/settings', authMiddleware, superAdminMiddleware, async (req, res) => {
    const newSettings = req.body;
    await db.read();
    db.data.settings = newSettings;
    await db.write();
    res.json({ success: true });
});

// --- EXPORT LOGIC ---
app.get('/api/export', authMiddleware, async (req, res) => {
    const { title, color, theme, font, borderRadius, phone, address, instagram, isPaid } = req.query;
    
    await db.read();
    const plan = req.session.user.plan;
    const settings = db.data.settings.plans[plan];
    
    // Only allow removing watermark if plan permits it
    const canRemove = settings.canRemoveWatermark;
    const isPaidUser = canRemove && isPaid === 'true';

    try {
        const items = db.data.menu_items.filter(item => item.userId === req.session.user.id);
        const archive = archiver('zip', { zlib: { level: 9 } });
        res.attachment(`${title || 'menu'}.zip`);
        archive.pipe(res);

        const config = { title, color, theme, font, borderRadius, phone, address, instagram };
        
        const itemsWithRelativePaths = await Promise.all(items.map(async (item) => {
            const newItem = { ...item };
            if (item.targetImageUrl && item.targetImageUrl.startsWith('http')) {
                const urlParts = new URL(item.targetImageUrl).pathname.split('/');
                const filename = urlParts[urlParts.length - 1];
                const localPath = path.join(UPLOAD_DIR, `user_${req.session.user.id}`, item.id, filename);
                if (fs.existsSync(localPath)) {
                    const zipPath = `assets/${item.id}/${filename}`;
                    const buffer = isPaidUser ? fs.readFileSync(localPath) : await watermarkImage(localPath);
                    archive.append(buffer, { name: zipPath });
                    newItem.targetImageUrl = zipPath;
                }
            }
            if (item.modelUrl && item.modelUrl.startsWith('http')) {
                const urlParts = new URL(item.modelUrl).pathname.split('/');
                const filename = urlParts[urlParts.length - 1];
                const localPath = path.join(UPLOAD_DIR, `user_${req.session.user.id}`, item.id, filename);
                if (fs.existsSync(localPath)) {
                    const zipPath = `assets/${item.id}/${filename}`;
                    archive.file(localPath, { name: zipPath });
                    newItem.modelUrl = zipPath;
                }
            }
            if (item.compiledTarget) {
                const buffer = Buffer.from(item.compiledTarget, 'base64');
                const zipPath = `assets/${item.id}/targets.mind`;
                archive.append(buffer, { name: zipPath });
                newItem.compiledTargetUrl = zipPath; 
                delete newItem.compiledTarget;
            }
            return newItem;
        }));

        let logoPathRelative = 'assets/site/logo.png';
        let heroPathRelative = 'assets/site/hero.jpg';

        if (req.query.logoUrl) {
             const urlParts = new URL(req.query.logoUrl).pathname.split('/');
             const filename = urlParts[urlParts.length - 1];
             const localPath = path.join(UPLOAD_DIR, `user_${req.session.user.id}`, 'site_assets', filename);
             if(fs.existsSync(localPath)) {
                 const buffer = isPaidUser ? fs.readFileSync(localPath) : await watermarkImage(localPath);
                 archive.append(buffer, { name: logoPathRelative });
             }
        }
        
        if (req.query.heroUrl) {
             const urlParts = new URL(req.query.heroUrl).pathname.split('/');
             const filename = urlParts[urlParts.length - 1];
             const localPath = path.join(UPLOAD_DIR, `user_${req.session.user.id}`, 'site_assets', filename);
             if(fs.existsSync(localPath)) {
                 const buffer = isPaidUser ? fs.readFileSync(localPath) : await watermarkImage(localPath);
                 archive.append(buffer, { name: heroPathRelative });
             }
        }

        const html = generateStaticHTML(itemsWithRelativePaths, config, logoPathRelative, heroPathRelative, !isPaidUser);
        archive.append(html, { name: 'index.html' });
        archive.finalize();

    } catch (err) {
        console.error("Export Error:", err);
        res.status(500).json({ error: "Failed to generate export" });
    }
});

function generateStaticHTML(items, config, logoPath, heroPath, showWatermark) {
    const jsonStr = JSON.stringify(items);
    const themes = {
        midnight: { bg: '#121212', card: '#1e1e1e', text: '#ffffff', muted: '#9ca3af', border: 'rgba(255,255,255,0.1)' },
        paper: { bg: '#f8fafc', card: '#ffffff', text: '#0f172a', muted: '#64748b', border: '#e2e8f0' },
        luxury: { bg: '#0f0f0f', card: '#1a1a1a', text: '#e5e5e5', muted: '#a1a1aa', border: '#d4af37' }
    };
    const t = themes[config.theme || 'midnight'];
    
    const fonts = {
        sans: "'Inter', sans-serif",
        serif: "'Playfair Display', serif",
        mono: "'Space Mono', monospace"
    };
    const fontUrl = {
        sans: "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap",
        serif: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap",
        mono: "https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap"
    }[config.font || 'sans'];

    const watermarkCSS = showWatermark ? `padding-bottom: 60px;` : '';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${config.title || 'Menu'}</title>
    <link href="${fontUrl}" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="importmap">
    {
      "imports": {
        "three": "https://unpkg.com/three@0.147.0/build/three.module.js",
        "three/addons/": "https://unpkg.com/three@0.147.0/examples/jsm/",
        "mind-ar/": "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/"
      }
    }
    </script>
    <style>
      :root {
          --bg-color: ${t.bg};
          --card-bg: ${t.card};
          --text-main: ${t.text};
          --text-muted: ${t.muted};
          --border-color: ${t.border};
          --accent-color: ${config.color || '#d946ef'};
          --font-family: ${fonts[config.font || 'sans']};
          --radius: ${config.borderRadius || '12px'};
      }
      body { 
          background-color: var(--bg-color); 
          color: var(--text-main); 
          font-family: var(--font-family);
          margin: 0; overflow-x: hidden; 
          ${watermarkCSS}
      }
      .card { background-color: var(--card-bg); border: 1px solid var(--border-color); border-radius: var(--radius); }
      .btn { border-radius: var(--radius); }
      .text-accent { color: var(--accent-color); }
      .bg-accent { background-color: var(--accent-color); color: white; }
      .text-muted { color: var(--text-muted); }
      #ar-view { display: none; position: fixed; inset: 0; z-index: 50; background: black; }
      .mindar-ui-overlay { display: none !important; }
    </style>
</head>
<body>
    <div id="protocol-warning" class="hidden fixed top-0 left-0 right-0 bg-red-600 text-white p-4 z-[100] text-center shadow-xl">
        <p class="font-bold">⚠️ AR Security Warning</p>
        <p class="text-sm">Browsers block Camera and AR features when opening files directly (file://).</p>
        <p class="text-sm mt-1">Please use a local web server (e.g., VS Code Live Server, or "python -m http.server").</p>
        <button onclick="document.getElementById('protocol-warning').remove()" class="mt-2 text-xs underline">Dismiss</button>
    </div>
    <script>if (window.location.protocol === 'file:') document.getElementById('protocol-warning').classList.remove('hidden');</script>

    <div id="menu-view">
        <div class="relative h-64 overflow-hidden mb-6">
             <div class="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--bg-color)] z-10"></div>
             <img src="${heroPath || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1000'}" class="w-full h-full object-cover opacity-60">
             <div class="absolute bottom-0 left-0 p-6 z-20 w-full flex items-end justify-between">
                <div>
                    ${logoPath ? `<img src="${logoPath}" class="h-12 mb-3 object-contain"/>` : ''}
                    <h1 class="text-4xl font-bold mb-1">${config.title || 'Dishcovery'}</h1>
                    <p class="text-muted text-sm">Augmented Reality Menu</p>
                </div>
             </div>
        </div>

        <div class="p-6 max-w-5xl mx-auto pb-20">
            <div id="menu-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
        </div>

        <div class="border-t border-[var(--border-color)] p-8 text-center text-muted text-sm">
            <p class="font-bold mb-2">${config.title || 'Restaurant'}</p>
            <div class="flex justify-center gap-4 mb-4">
               ${config.instagram ? `<a href="https://instagram.com/${config.instagram.replace('@','')}" target="_blank" class="hover:text-accent">Instagram</a>` : ''}
               ${config.phone ? `<span>${config.phone}</span>` : ''}
            </div>
            ${config.address ? `<p>${config.address}</p>` : ''}
            <p class="mt-4 text-xs opacity-50">Powered by Dishcovery</p>
        </div>
    </div>

    <div id="ar-view">
        <div id="ar-container" class="absolute inset-0 w-full h-full"></div>
        <div class="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
            <button onclick="closeAR()" class="bg-white/10 backdrop-blur w-10 h-10 rounded-full flex items-center justify-center border border-white/20 text-white">←</button>
            <h2 id="ar-title" class="font-bold text-white">Dish Name</h2>
            <div class="w-10"></div>
        </div>
        <div class="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
             <div class="inline-block bg-black/60 backdrop-blur px-4 py-2 rounded-xl border border-white/10">
                <p class="text-sm text-accent font-bold">Scanning Active</p>
                <p class="text-xs text-gray-300">Point camera at the menu image</p>
             </div>
        </div>
    </div>

    <script type="module">
        import * as THREE from 'three';
        import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
        import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
        import { MindARThree } from 'mind-ar/mindar-image-three.prod.js';

        const MENU_DATA = ${jsonStr};
        let mindarThree = null;

        const grid = document.getElementById('menu-grid');
        MENU_DATA.forEach(item => {
            const card = document.createElement('div');
            card.className = "card overflow-hidden shadow-xl hover:shadow-2xl transition-shadow";
            card.innerHTML = \`
                <div class="h-48 relative overflow-hidden">
                    <img src="\${item.targetImageUrl || ''}" class="w-full h-full object-cover">
                    <div class="absolute top-3 right-3 bg-black/70 px-2 py-1 rounded text-sm font-bold text-white">$\${item.price.toFixed(2)}</div>
                </div>
                <div class="p-5">
                    <h3 class="font-bold text-lg mb-1">\${item.name}</h3>
                    <p class="text-muted text-sm mb-4 h-10 overflow-hidden line-clamp-2">\${item.description}</p>
                    <button onclick="window.startAR('\${item.id}')" 
                        class="btn w-full bg-accent text-white py-3 font-medium transition-opacity hover:opacity-90" 
                        \${!item.modelUrl || !item.compiledTargetUrl ? 'disabled style="opacity:0.5"' : ''}>
                        \${item.modelUrl ? 'View in AR' : 'AR Unavailable'}
                    </button>
                </div>
            \`;
            grid.appendChild(card);
        });

        window.startAR = async (id) => {
            const item = MENU_DATA.find(i => i.id === id);
            if(!item) return;

            document.getElementById('menu-view').style.display = 'none';
            document.getElementById('ar-view').style.display = 'block';
            document.getElementById('ar-title').innerText = item.name;

            const container = document.getElementById('ar-container');
            
            try {
                mindarThree = new MindARThree({
                    container: container,
                    imageTargetSrc: item.compiledTargetUrl,
                    uiLoading: "no", uiScanning: "no", uiError: "no"
                });
                const { renderer, scene, camera } = mindarThree;
                renderer.shadowMap.enabled = true;
                renderer.shadowMap.type = THREE.PCFSoftShadowMap;

                const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
                scene.add(light);
                const dirLight = new THREE.DirectionalLight(0xffffff, 1);
                dirLight.position.set(2, 4, 2);
                dirLight.castShadow = true;
                dirLight.shadow.mapSize.width = 1024;
                dirLight.shadow.mapSize.height = 1024;
                dirLight.shadow.bias = -0.0001;
                scene.add(dirLight);

                const shadowGeo = new THREE.PlaneGeometry(10, 10);
                const shadowMat = new THREE.ShadowMaterial({ opacity: 0.3 });
                const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
                shadowPlane.rotation.x = -Math.PI / 2;
                shadowPlane.receiveShadow = true;
                
                const wrapper = new THREE.Group();
                wrapper.rotation.x = Math.PI / 2;
                wrapper.add(shadowPlane);

                const loader = new GLTFLoader();
                const dracoLoader = new DRACOLoader();
                dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
                loader.setDRACOLoader(dracoLoader);

                loader.load(item.modelUrl, (gltf) => {
                    const model = gltf.scene;
                    model.traverse(node => { if(node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
                    wrapper.add(model);
                    const box = new THREE.Box3().setFromObject(model);
                    const size = new THREE.Vector3();
                    box.getSize(size);
                    const maxDim = Math.max(size.x, size.y, size.z);
                    const baseScale = 0.5 / maxDim;
                    
                    if (item.modelConfig) {
                        const { scale, position, rotation } = item.modelConfig;
                        const finalScale = baseScale * (scale || 1);
                        model.scale.set(finalScale, finalScale, finalScale);
                        const center = new THREE.Vector3();
                        box.getCenter(center);
                        model.position.sub(center.multiplyScalar(finalScale));
                        model.position.x += (position.x || 0); model.position.y += (position.y || 0); model.position.z += (position.z || 0);
                        model.rotation.x += (rotation.x || 0); model.rotation.y += (rotation.y || 0); model.rotation.z += (rotation.z || 0);
                    } else {
                        model.scale.set(baseScale, baseScale, baseScale);
                        const center = new THREE.Vector3();
                        box.getCenter(center);
                        model.position.sub(center.multiplyScalar(baseScale));
                    }
                    const anchor = mindarThree.addAnchor(0);
                    anchor.group.add(wrapper);
                });

                await mindarThree.start();
                renderer.setAnimationLoop(() => { renderer.render(scene, camera); });
            } catch(e) {
                alert("Could not start AR: " + e.message);
                window.closeAR();
            }
        };

        window.closeAR = () => {
            if(mindarThree) {
                try {
                    mindarThree.stop();
                    mindarThree.renderer.setAnimationLoop(null);
                    mindarThree.renderer.dispose();
                } catch(e) { console.error(e); }
                const video = document.querySelector('video');
                if(video) {
                    if(video.srcObject) {
                        const tracks = video.srcObject.getTracks();
                        tracks.forEach(track => track.stop());
                    }
                    video.remove();
                }
                const container = document.getElementById('ar-container');
                if(container) container.innerHTML = '';
                mindarThree = null;
            }
            document.getElementById('ar-view').style.display = 'none';
            document.getElementById('menu-view').style.display = 'block';
        };
    </script>
</body>
</html>`;
}

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
