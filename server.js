const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const SITE_CONTENT_FILE = path.join(DATA_DIR, "site-content.json");
const NOTIFICATIONS_FILE = path.join(DATA_DIR, "notifications.json");
const INQUIRIES_FILE = path.join(DATA_DIR, "inquiries.json");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-me";
const sessions = new Map();

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

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = requestUrl.pathname;

  try {
    if (req.method === "GET" && pathname === "/api/health") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET" && pathname === "/api/site-content") {
      const siteContent = await readJson(SITE_CONTENT_FILE, DEFAULT_SITE_CONTENT);
      sendJson(res, 200, siteContent);
      return;
    }

    if (req.method === "GET" && pathname === "/api/notifications") {
      const notifications = await readJson(NOTIFICATIONS_FILE, DEFAULT_NOTIFICATIONS);
      sendJson(res, 200, notifications.filter((item) => item.active));
      return;
    }

    if (req.method === "POST" && pathname === "/api/inquiries") {
      const body = sanitizeInquiry(await readBody(req));
      if (!body.name || !body.email || !body.product || !body.details) {
        sendJson(res, 400, { error: "Missing required inquiry fields" });
        return;
      }

      const inquiries = await readJson(INQUIRIES_FILE, []);
      inquiries.unshift(body);
      await writeJson(INQUIRIES_FILE, inquiries);
      sendJson(res, 201, { ok: true, inquiry: body });
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

      const [siteContent, notifications, inquiries] = await Promise.all([
        readJson(SITE_CONTENT_FILE, DEFAULT_SITE_CONTENT),
        readJson(NOTIFICATIONS_FILE, DEFAULT_NOTIFICATIONS),
        readJson(INQUIRIES_FILE, [])
      ]);

      sendJson(res, 200, { siteContent, notifications, inquiries });
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
      await writeJson(NOTIFICATIONS_FILE, notifications);
      sendJson(res, 200, { ok: true, notifications });
      return;
    }

    if (req.method === "PATCH" && pathname.startsWith("/api/admin/inquiries/")) {
      if (!requireAuth(req, res)) {
        return;
      }

      const inquiryId = pathname.split("/").pop();
      const body = await readBody(req);
      const inquiries = await readJson(INQUIRIES_FILE, []);
      const inquiry = inquiries.find((item) => item.id === inquiryId);
      if (!inquiry) {
        sendJson(res, 404, { error: "Inquiry not found" });
        return;
      }

      inquiry.status = String(body.status || inquiry.status);
      await writeJson(INQUIRIES_FILE, inquiries);
      sendJson(res, 200, { ok: true, inquiry });
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

server.listen(PORT, () => {
  console.log(`Twin Soul Studio server running on http://localhost:${PORT}`);
});
