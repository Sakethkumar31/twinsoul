const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

// Database configuration
const { Pool } = require("pg");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const SITE_CONTENT_FILE = path.join(DATA_DIR, "site-content.json");
const NOTIFICATIONS_FILE = path.join(DATA_DIR, "notifications.json");
const INQUIRIES_FILE = path.join(DATA_DIR, "inquiries.json");
const GALLERY_FILE = path.join(DATA_DIR, "gallery.json");
const BESTSELLERS_FILE = path.join(DATA_DIR, "bestsellers.json");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-me";

// Instagram API Configuration
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN || "";
const INSTAGRAM_API_URL = "https://graph.instagram.com";
const sessions = new Map();

// Database connection pool
let pool = null;
let isUsingDatabase = false;

async function initDatabase() {
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.log("DATABASE_URL not set. Using local JSON files for data storage.");
    return false;
  }
  
  try {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    // Test connection
    const client = await pool.connect();
    console.log("Connected to PostgreSQL database!");
    client.release();
    
    isUsingDatabase = true;
    return true;
  } catch (error) {
    console.log("Failed to connect to PostgreSQL:", error.message);
    console.log("Falling back to local JSON files.");
    pool = null;
    return false;
  }
}

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

const DEFAULT_SITE_CONTENT = JSON.parse(fs.readFileSync(SITE_CONTENT_FILE, "utf8"));
const DEFAULT_NOTIFICATIONS = JSON.parse(fs.readFileSync(NOTIFICATIONS_FILE, "utf8"));
const DEFAULT_GALLERY = JSON.parse(fs.readFileSync(GALLERY_FILE, "utf8"));
const DEFAULT_BESTSELLERS = JSON.parse(fs.readFileSync(BESTSELLERS_FILE, "utf8"));

function ensureFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
  }
}

function parseCookies(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const index = pair.indexOf("=");
      if (index === -1) {
        return acc;
      }

      const key = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
}

// Database operations (PostgreSQL)
async function dbQuery(text, params) {
  if (!pool) throw new Error("Database not connected");
  const result = await pool.query(text, params);
  return result.rows;
}

async function dbGetInquiries() {
  return dbQuery("SELECT * FROM inquiries ORDER BY created_at DESC");
}

async function dbAddInquiry(inquiry) {
  return dbQuery(
    "INSERT INTO inquiries (name, email, product, details, status) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [inquiry.name, inquiry.email, inquiry.product, inquiry.details, inquiry.status]
  );
}

async function dbUpdateInquiryStatus(id, status) {
  return dbQuery("UPDATE inquiries SET status = $1 WHERE id = $2 RETURNING *", [status, id]);
}

async function dbGetGallery() {
  return dbQuery("SELECT id, image, title, description, type, likes, comments, link, created_at as \"createdAt\" FROM gallery ORDER BY created_at DESC");
}

async function dbAddGallery(item) {
  return dbQuery(
    "INSERT INTO gallery (image, title, description, type, likes, comments, link) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
    [item.image, item.title, item.description, item.type, item.likes, item.comments, item.link]
  );
}

async function dbUpdateGallery(id, item) {
  return dbQuery(
    "UPDATE gallery SET image = $1, title = $2, description = $3, type = $4, likes = $5, comments = $6, link = $7 WHERE id = $8 RETURNING *",
    [item.image, item.title, item.description, item.type, item.likes, item.comments, item.link, id]
  );
}

async function dbDeleteGallery(id) {
  return dbQuery("DELETE FROM gallery WHERE id = $1", [id]);
}

async function dbGetBestsellers() {
  return dbQuery("SELECT id, title, description, price, image, category, badge, link, order_count as \"orderCount\", rating, created_at as \"createdAt\" FROM bestsellers ORDER BY created_at DESC");
}

async function dbAddBestseller(item) {
  return dbQuery(
    "INSERT INTO bestsellers (title, description, price, image, category, badge, link, order_count, rating) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
    [item.title, item.description, item.price, item.image, item.category, item.badge, item.link, item.orderCount, item.rating]
  );
}

async function dbUpdateBestseller(id, item) {
  return dbQuery(
    "UPDATE bestsellers SET title = $1, description = $2, price = $3, image = $4, category = $5, badge = $6, link = $7, order_count = $8, rating = $9 WHERE id = $10 RETURNING *",
    [item.title, item.description, item.price, item.image, item.category, item.badge, item.link, item.orderCount, item.rating, id]
  );
}

async function dbDeleteBestseller(id) {
  return dbQuery("DELETE FROM bestsellers WHERE id = $1", [id]);
}

async function dbGetNotifications() {
  return dbQuery("SELECT id, message, tone, active, created_at as \"createdAt\" FROM notifications ORDER BY created_at DESC");
}

async function dbUpdateNotifications(items) {
  // Delete all and re-insert
  await dbQuery("DELETE FROM notifications");
  for (const item of items) {
    await dbQuery(
      "INSERT INTO notifications (message, tone, active) VALUES ($1, $2, $3)",
      [item.message, item.tone, item.active]
    );
  }
  return dbGetNotifications();
}

// Fallback file operations
async function readJson(filePath, fallback) {
  ensureFile(filePath, fallback);
  const raw = await fsp.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function writeJson(filePath, payload) {
  await fsp.writeFile(filePath, JSON.stringify(payload, null, 2));
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, body) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8"
  });
  res.end(body);
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function getSession(req) {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies.twinsoul_session;
  if (!sessionId) {
    return null;
  }

  const session = sessions.get(sessionId);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(sessionId);
    return null;
  }

  return { sessionId, ...session };
}

function requireAuth(req, res) {
  const session = getSession(req);
  if (!session) {
    sendJson(res, 401, { error: "Unauthorized" });
    return null;
  }
  return session;
}

function mergeSiteContent(payload = {}) {
  const content = {
    ...DEFAULT_SITE_CONTENT,
    ...payload,
    hero: {
      ...DEFAULT_SITE_CONTENT.hero,
      ...(payload.hero || {})
    },
    heroCard: {
      ...DEFAULT_SITE_CONTENT.heroCard,
      ...(payload.heroCard || {})
    },
    commissions: {
      ...DEFAULT_SITE_CONTENT.commissions,
      ...(payload.commissions || {})
    },
    about: {
      ...DEFAULT_SITE_CONTENT.about,
      ...(payload.about || {})
    },
    references: {
      ...DEFAULT_SITE_CONTENT.references,
      ...(payload.references || {})
    },
    contact: {
      ...DEFAULT_SITE_CONTENT.contact,
      ...(payload.contact || {})
    }
  };

  content.heroCard.bullets = Array.isArray(content.heroCard.bullets) ? content.heroCard.bullets.filter(Boolean) : [];
  content.commissions.tags = Array.isArray(content.commissions.tags) ? content.commissions.tags.filter(Boolean) : [];
  content.about.paragraphs = Array.isArray(content.about.paragraphs) ? content.about.paragraphs.filter(Boolean) : [];
  content.about.stats = Array.isArray(content.about.stats) ? content.about.stats.filter((item) => item && (item.value || item.label)) : [];
  content.references.items = Array.isArray(content.references.items) ? content.references.items.filter((item) => item && item.title) : [];
  return content;
}

function normalizeNotifications(items = []) {
  return items
    .filter((item) => item && item.message)
    .map((item) => ({
      id: item.id || crypto.randomUUID(),
      message: String(item.message).trim(),
      tone: ["info", "success", "warning"].includes(item.tone) ? item.tone : "info",
      active: Boolean(item.active),
      createdAt: item.createdAt || new Date().toISOString()
    }));
}

function sanitizeInquiry(payload = {}) {
  return {
    id: crypto.randomUUID(),
    name: String(payload.name || "").trim(),
    email: String(payload.email || "").trim(),
    product: String(payload.product || "").trim(),
    details: String(payload.details || "").trim(),
    status: "new",
    createdAt: new Date().toISOString()
  };
}

async function serveStatic(req, res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(ROOT, safePath.replace(/^\/+/, ""));

  if (!filePath.startsWith(ROOT)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  try {
    const stat = await fsp.stat(filePath);
    if (stat.isDirectory()) {
      sendText(res, 404, "Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const stream = fs.createReadStream(filePath);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream"
    });
    stream.pipe(res);
  } catch (error) {
    sendText(res, 404, "Not found");
  }
}

async function getGalleryData() {
  if (isUsingDatabase) {
    return dbGetGallery();
  }
  return readJson(GALLERY_FILE, DEFAULT_GALLERY);
}

async function getBestsellersData() {
  if (isUsingDatabase) {
    return dbGetBestsellers();
  }
  return readJson(BESTSELLERS_FILE, DEFAULT_BESTSELLERS);
}

async function getInquiriesData() {
  if (isUsingDatabase) {
    return dbGetInquiries();
  }
  return readJson(INQUIRIES_FILE, []);
}

async function getNotificationsData() {
  if (isUsingDatabase) {
    return dbGetNotifications();
  }
  return readJson(NOTIFICATIONS_FILE, DEFAULT_NOTIFICATIONS);
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = requestUrl.pathname;

  try {
    if (req.method === "GET" && pathname === "/api/health") {
      sendJson(res, 200, { ok: true, database: isUsingDatabase });
      return;
    }

    if (req.method === "GET" && pathname === "/api/site-content") {
      const siteContent = await readJson(SITE_CONTENT_FILE, DEFAULT_SITE_CONTENT);
      sendJson(res, 200, siteContent);
      return;
    }

    if (req.method === "GET" && pathname === "/api/notifications") {
      const notifications = await getNotificationsData();
      const filtered = isUsingDatabase ? notifications : notifications.filter((item) => item.active);
      sendJson(res, 200, filtered);
      return;
    }

    if (req.method === "POST" && pathname === "/api/inquiries") {
      const body = sanitizeInquiry(await readBody(req));
      if (!body.name || !body.email || !body.product || !body.details) {
        sendJson(res, 400, { error: "Missing required inquiry fields" });
        return;
      }

      if (isUsingDatabase) {
        const result = await dbAddInquiry(body);
        sendJson(res, 201, { ok: true, inquiry: result[0] });
      } else {
        const inquiries = await readJson(INQUIRIES_FILE, []);
        inquiries.unshift(body);
        await writeJson(INQUIRIES_FILE, inquiries);
        sendJson(res, 201, { ok: true, inquiry: body });
      }
      return;
    }

    if (req.method === "POST" && pathname === "/api/admin/login") {
      const body = await readBody(req);
      if (body.password !== ADMIN_PASSWORD) {
        sendJson(res, 401, { error: "Invalid password" });
        return;
      }

      const sessionId = crypto.randomUUID();
      sessions.set(sessionId, {
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000 * 60 * 60 * 12
      });

      sendJson(
        res,
        200,
        {
          ok: true,
          mustChangePassword: ADMIN_PASSWORD === "change-me"
        },
        {
          "Set-Cookie": `twinsoul_session=${encodeURIComponent(sessionId)}; HttpOnly; Path=/; Max-Age=43200; SameSite=Lax`
        }
      );
      return;
    }

    if (req.method === "POST" && pathname === "/api/admin/logout") {
      const session = getSession(req);
      if (session) {
        sessions.delete(session.sessionId);
      }

      sendJson(
        res,
        200,
        { ok: true },
        {
          "Set-Cookie": "twinsoul_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax"
        }
      );
      return;
    }

    if (req.method === "GET" && pathname === "/api/admin/session") {
      const session = getSession(req);
      sendJson(res, 200, { authenticated: Boolean(session), mustChangePassword: ADMIN_PASSWORD === "change-me" });
      return;
    }

    if (req.method === "GET" && pathname === "/api/admin/dashboard") {
      if (!requireAuth(req, res)) {
        return;
      }

      const siteContent = await readJson(SITE_CONTENT_FILE, DEFAULT_SITE_CONTENT);
      const notifications = await getNotificationsData();
      const inquiries = await getInquiriesData();
      const gallery = await getGalleryData();
      const bestsellers = await getBestsellersData();

      sendJson(res, 200, { siteContent, notifications, inquiries, gallery, bestsellers });
      return;
    }

    if (req.method === "PUT" && pathname === "/api/admin/site-content") {
      if (!requireAuth(req, res)) {
        return;
      }

      const body = await readBody(req);
      const siteContent = mergeSiteContent(body);
      await writeJson(SITE_CONTENT_FILE, siteContent);
      sendJson(res, 200, { ok: true, siteContent });
      return;
    }

    if (req.method === "PUT" && pathname === "/api/admin/notifications") {
      if (!requireAuth(req, res)) {
        return;
      }

      const body = await readBody(req);
      const notifications = normalizeNotifications(Array.isArray(body.notifications) ? body.notifications : []);
      
      if (isUsingDatabase) {
        const result = await dbUpdateNotifications(notifications);
        sendJson(res, 200, { ok: true, notifications: result });
      } else {
        await writeJson(NOTIFICATIONS_FILE, notifications);
        sendJson(res, 200, { ok: true, notifications });
      }
      return;
    }

    if (req.method === "PATCH" && pathname.startsWith("/api/admin/inquiries/")) {
      if (!requireAuth(req, res)) {
        return;
      }

      const inquiryId = pathname.split("/").pop();
      const body = await readBody(req);
      
      if (isUsingDatabase) {
        const result = await dbUpdateInquiryStatus(inquiryId, body.status);
        sendJson(res, 200, { ok: true, inquiry: result[0] });
      } else {
        const inquiries = await readJson(INQUIRIES_FILE, []);
        const inquiry = inquiries.find((item) => item.id === inquiryId);
        if (!inquiry) {
          sendJson(res, 404, { error: "Inquiry not found" });
          return;
        }
        inquiry.status = String(body.status || inquiry.status);
        await writeJson(INQUIRIES_FILE, inquiries);
        sendJson(res, 200, { ok: true, inquiry });
      }
      return;
    }

    // DELETE inquiry endpoint
    if (req.method === "DELETE" && pathname.startsWith("/api/admin/inquiries/")) {
      if (!requireAuth(req, res)) {
        return;
      }

      const inquiryId = pathname.split("/").pop();
      
      if (isUsingDatabase) {
        await pool.query("DELETE FROM inquiries WHERE id = $1", [inquiryId]);
        sendJson(res, 200, { ok: true });
      } else {
        const inquiries = await readJson(INQUIRIES_FILE, []);
        const itemIndex = inquiries.findIndex((item) => item.id === inquiryId);
        
        if (itemIndex === -1) {
          sendJson(res, 404, { error: "Inquiry not found" });
          return;
        }
        
        inquiries.splice(itemIndex, 1);
        await writeJson(INQUIRIES_FILE, inquiries);
        sendJson(res, 200, { ok: true });
      }
      return;
    }

    // Gallery API endpoints
    if (req.method === "GET" && pathname === "/api/gallery") {
      const gallery = await getGalleryData();
      sendJson(res, 200, gallery);
      return;
    }

    if (req.method === "GET" && pathname === "/api/admin/gallery") {
      if (!requireAuth(req, res)) {
        return;
      }
      const gallery = await getGalleryData();
      sendJson(res, 200, gallery);
      return;
    }

    if (req.method === "POST" && pathname === "/api/admin/gallery") {
      if (!requireAuth(req, res)) {
        return;
      }
      const body = await readBody(req);
      
      const newItem = {
        id: crypto.randomUUID(),
        image: String(body.image || "").trim(),
        title: String(body.title || "").trim(),
        description: String(body.description || "").trim(),
        type: ["photo", "reel"].includes(body.type) ? body.type : "photo",
        likes: Number(body.likes) || 0,
        comments: Number(body.comments) || 0,
        link: String(body.link || "").trim(),
        createdAt: new Date().toISOString()
      };
      
      if (isUsingDatabase) {
        const result = await dbAddGallery(newItem);
        sendJson(res, 201, { ok: true, item: result[0] });
      } else {
        const gallery = await readJson(GALLERY_FILE, DEFAULT_GALLERY);
        gallery.unshift(newItem);
        await writeJson(GALLERY_FILE, gallery);
        sendJson(res, 201, { ok: true, item: newItem });
      }
      return;
    }

    if (req.method === "PUT" && pathname.startsWith("/api/admin/gallery/")) {
      if (!requireAuth(req, res)) {
        return;
      }
      const itemId = pathname.split("/").pop();
      const body = await readBody(req);
      
      const updatedItem = {
        image: String(body.image || "").trim(),
        title: String(body.title || "").trim(),
        description: String(body.description || "").trim(),
        type: ["photo", "reel"].includes(body.type) ? body.type : "photo",
        likes: Number(body.likes) || 0,
        comments: Number(body.comments) || 0,
        link: String(body.link || "").trim()
      };
      
      if (isUsingDatabase) {
        const result = await dbUpdateGallery(itemId, updatedItem);
        if (result.length === 0) {
          sendJson(res, 404, { error: "Gallery item not found" });
          return;
        }
        sendJson(res, 200, { ok: true, item: result[0] });
      } else {
        const gallery = await readJson(GALLERY_FILE, DEFAULT_GALLERY);
        const itemIndex = gallery.findIndex((item) => item.id === itemId);
        
        if (itemIndex === -1) {
          sendJson(res, 404, { error: "Gallery item not found" });
          return;
        }
        
        gallery[itemIndex] = { ...gallery[itemIndex], ...updatedItem };
        await writeJson(GALLERY_FILE, gallery);
        sendJson(res, 200, { ok: true, item: gallery[itemIndex] });
      }
      return;
    }

    if (req.method === "DELETE" && pathname.startsWith("/api/admin/gallery/")) {
      if (!requireAuth(req, res)) {
        return;
      }
      const itemId = pathname.split("/").pop();
      
      if (isUsingDatabase) {
        await dbDeleteGallery(itemId);
        sendJson(res, 200, { ok: true });
      } else {
        const gallery = await readJson(GALLERY_FILE, DEFAULT_GALLERY);
        const itemIndex = gallery.findIndex((item) => item.id === itemId);
        
        if (itemIndex === -1) {
          sendJson(res, 404, { error: "Gallery item not found" });
          return;
        }
        
        gallery.splice(itemIndex, 1);
        await writeJson(GALLERY_FILE, gallery);
        sendJson(res, 200, { ok: true });
      }
      return;
    }

    // Instagram Sync endpoint
    if (req.method === "POST" && pathname === "/api/admin/sync-instagram") {
      if (!requireAuth(req, res)) {
        return;
      }
      
      if (!INSTAGRAM_ACCESS_TOKEN) {
        sendJson(res, 400, { error: "Instagram access token not configured. Set INSTAGRAM_ACCESS_TOKEN environment variable." });
        return;
      }
      
      try {
        const mediaUrl = `${INSTAGRAM_API_URL}/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&access_token=${INSTAGRAM_ACCESS_TOKEN}&limit=25`;
        
        const response = await fetch(mediaUrl);
        if (!response.ok) {
          throw new Error(`Instagram API error: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.data || !Array.isArray(data.data)) {
          throw new Error("Invalid response from Instagram API");
        }
        
        const gallery = await getGalleryData();
        const existingLinks = new Set(gallery.map(item => item.link));
        
        let newItemsCount = 0;
        
        for (const media of data.data) {
          if (existingLinks.has(media.permalink)) {
            continue;
          }
          
          const newItem = {
            id: crypto.randomUUID(),
            image: media.media_type === "VIDEO" ? (media.thumbnail_url || media.media_url) : media.media_url,
            title: media.caption ? media.caption.substring(0, 50) : `Instagram ${media.media_type}`,
            description: media.caption || "",
            type: media.media_type === "VIDEO" ? "reel" : "photo",
            likes: media.like_count || 0,
            comments: media.comments_count || 0,
            link: media.permalink,
            createdAt: media.timestamp
          };
          
          if (isUsingDatabase) {
            await dbAddGallery(newItem);
          } else {
            gallery.unshift(newItem);
          }
          newItemsCount++;
        }
        
        if (!isUsingDatabase) {
          await writeJson(GALLERY_FILE, gallery);
        }
        
        sendJson(res, 200, { ok: true, message: `Added ${newItemsCount} new items from Instagram`, count: newItemsCount });
      } catch (error) {
        sendJson(res, 500, { error: error.message || "Failed to sync from Instagram" });
      }
      return;
    }

    // Best Sellers API endpoints
    if (req.method === "GET" && pathname === "/api/bestsellers") {
      const bestsellers = await getBestsellersData();
      sendJson(res, 200, bestsellers);
      return;
    }

    if (req.method === "GET" && pathname === "/api/admin/bestsellers") {
      if (!requireAuth(req, res)) {
        return;
      }
      const bestsellers = await getBestsellersData();
      sendJson(res, 200, bestsellers);
      return;
    }

    if (req.method === "POST" && pathname === "/api/admin/bestsellers") {
      if (!requireAuth(req, res)) {
        return;
      }
      const body = await readBody(req);
      
      const newItem = {
        id: "bs-" + crypto.randomUUID().substring(0, 8),
        title: String(body.title || "").trim(),
        description: String(body.description || "").trim(),
        price: Number(body.price) || 0,
        image: String(body.image || "").trim(),
        category: String(body.category || "").trim(),
        badge: String(body.badge || "Best Seller").trim(),
        link: String(body.link || "").trim(),
        orderCount: Number(body.orderCount) || 0,
        rating: Number(body.rating) || 0,
        createdAt: new Date().toISOString()
      };
      
      if (isUsingDatabase) {
        const result = await dbAddBestseller(newItem);
        sendJson(res, 201, { ok: true, item: result[0] });
      } else {
        const bestsellers = await readJson(BESTSELLERS_FILE, DEFAULT_BESTSELLERS);
        bestsellers.unshift(newItem);
        await writeJson(BESTSELLERS_FILE, bestsellers);
        sendJson(res, 201, { ok: true, item: newItem });
      }
      return;
    }

    if (req.method === "PUT" && pathname.startsWith("/api/admin/bestsellers/")) {
      if (!requireAuth(req, res)) {
        return;
      }
      const itemId = pathname.split("/").pop();
      const body = await readBody(req);
      
      const updatedItem = {
        title: String(body.title || "").trim(),
        description: String(body.description || "").trim(),
        price: Number(body.price) || 0,
        image: String(body.image || "").trim(),
        category: String(body.category || "").trim(),
        badge: String(body.badge || "Best Seller").trim(),
        link: String(body.link || "").trim(),
        orderCount: Number(body.orderCount) || 0,
        rating: Number(body.rating) || 0
      };
      
      if (isUsingDatabase) {
        const result = await dbUpdateBestseller(itemId, updatedItem);
        if (result.length === 0) {
          sendJson(res, 404, { error: "Best seller item not found" });
          return;
        }
        sendJson(res, 200, { ok: true, item: result[0] });
      } else {
        const bestsellers = await readJson(BESTSELLERS_FILE, DEFAULT_BESTSELLERS);
        const itemIndex = bestsellers.findIndex((item) => item.id === itemId);
        
        if (itemIndex === -1) {
          sendJson(res, 404, { error: "Best seller item not found" });
          return;
        }
        
        bestsellers[itemIndex] = { ...bestsellers[itemIndex], ...updatedItem };
        await writeJson(BESTSELLERS_FILE, bestsellers);
        sendJson(res, 200, { ok: true, item: bestsellers[itemIndex] });
      }
      return;
    }

    if (req.method === "DELETE" && pathname.startsWith("/api/admin/bestsellers/")) {
      if (!requireAuth(req, res)) {
        return;
      }
      const itemId = pathname.split("/").pop();
      
      if (isUsingDatabase) {
        await dbDeleteBestseller(itemId);
        sendJson(res, 200, { ok: true });
      } else {
        const bestsellers = await readJson(BESTSELLERS_FILE, DEFAULT_BESTSELLERS);
        const itemIndex = bestsellers.findIndex((item) => item.id === itemId);
        
        if (itemIndex === -1) {
          sendJson(res, 404, { error: "Best seller item not found" });
          return;
        }
        
        bestsellers.splice(itemIndex, 1);
        await writeJson(BESTSELLERS_FILE, bestsellers);
        sendJson(res, 200, { ok: true });
      }
      return;
    }

    // Add to Best Sellers from Gallery
    if (req.method === "POST" && pathname === "/api/admin/gallery-to-bestseller") {
      if (!requireAuth(req, res)) {
        return;
      }
      const body = await readBody(req);
      const galleryItemId = body.galleryItemId;
      
      if (!galleryItemId) {
        sendJson(res, 400, { error: "Gallery item ID required" });
        return;
      }
      
      const gallery = await getGalleryData();
      const galleryItem = gallery.find((item) => item.id === galleryItemId);
      
      if (!galleryItem) {
        sendJson(res, 404, { error: "Gallery item not found" });
        return;
      }
      
      const bestsellers = await getBestsellersData();
      
      if (bestsellers.some(item => item.link === galleryItem.link)) {
        sendJson(res, 400, { error: "Item already in best sellers" });
        return;
      }
      
      const newItem = {
        id: "bs-" + crypto.randomUUID().substring(0, 8),
        title: galleryItem.title,
        description: galleryItem.description,
        price: Number(body.price) || 0,
        image: galleryItem.image,
        category: String(body.category || "Custom").trim(),
        badge: "Best Seller",
        link: galleryItem.link,
        orderCount: galleryItem.likes || 0,
        rating: 4.5,
        createdAt: new Date().toISOString()
      };
      
      if (isUsingDatabase) {
        const result = await dbAddBestseller(newItem);
        sendJson(res, 201, { ok: true, item: result[0] });
      } else {
        bestsellers.unshift(newItem);
        await writeJson(BESTSELLERS_FILE, bestsellers);
        sendJson(res, 201, { ok: true, item: newItem });
      }
      return;
    }

    if (req.method === "GET" && pathname === "/admin") {
      await serveStatic(req, res, "/admin.html");
      return;
    }

    await serveStatic(req, res, pathname);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Unexpected server error" });
  }
});

// Initialize database and start server
async function start() {
  await initDatabase();
  
  server.listen(PORT, () => {
    console.log(`Twin Soul Studio server running on http://localhost:${PORT}`);
    if (isUsingDatabase) {
      console.log("Using PostgreSQL database for data storage");
    } else {
      console.log("Using local JSON files for data storage");
    }
  });
}

start();

