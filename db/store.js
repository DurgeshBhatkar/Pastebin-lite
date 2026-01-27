const crypto = require("crypto");

const STORAGE_MODE = process.env.STORAGE_MODE || "sqlite";

// =======================
// IN-MEMORY STORE (Vercel)
// =======================
const memoryStore = new Map();

// =======================
// SQLITE STORE (Local)
// =======================
let sqlite = null;
let db = null;

if (STORAGE_MODE === "sqlite") {
  sqlite = require("sqlite3").verbose();
  const path = require("path");

  const dbPath = path.join(__dirname, "pastes.db");
  db = new sqlite.Database(dbPath);

  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS pastes (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        created_at INTEGER,
        expires_at INTEGER,
        max_views INTEGER,
        views_used INTEGER
      )
    `);
  });
}

// =======================
// COMMON HELPERS
// =======================
function generateId() {
  return crypto.randomBytes(6).toString("hex");
}

function getNow(req) {
  return Date.now();
}

// =======================
// CREATE PASTE
// =======================
async function createPaste({ content, ttl_seconds, max_views }) {
  const id = generateId();
  const now = Date.now();
  const expires_at = ttl_seconds ? now + ttl_seconds * 1000 : null;

  const paste = {
    id,
    content,
    created_at: now,
    expires_at,
    max_views: max_views ?? null,
    views_used: 0,
  };

  // 🔹 In-memory
  if (STORAGE_MODE === "memory") {
    memoryStore.set(id, paste);
    return paste;
  }

  // 🔹 SQLite
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO pastes VALUES (?, ?, ?, ?, ?, ?)`,
      [id, content, now, expires_at, paste.max_views, 0],
      err => {
        if (err) return reject(err);
        resolve(paste);
      }
    );
  });
}

// =======================
// GET PASTE
// =======================
async function getPaste(id, req) {
  const now = getNow(req);

  // 🔹 In-memory
  if (STORAGE_MODE === "memory") {
    const paste = memoryStore.get(id);
    if (!paste) return null;

    if (paste.expires_at && now > paste.expires_at) {
      memoryStore.delete(id);
      return null;
    }

    if (paste.max_views !== null && paste.views_used >= paste.max_views) {
      memoryStore.delete(id);
      return null;
    }

    paste.views_used += 1;
    return paste;
  }

  // 🔹 SQLite
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM pastes WHERE id = ?`, [id], (err, paste) => {
      if (err || !paste) return resolve(null);

      if (paste.expires_at && now > paste.expires_at) {
        db.run(`DELETE FROM pastes WHERE id = ?`, [id]);
        return resolve(null);
      }

      if (paste.max_views !== null && paste.views_used >= paste.max_views) {
        db.run(`DELETE FROM pastes WHERE id = ?`, [id]);
        return resolve(null);
      }

      db.run(
        `UPDATE pastes SET views_used = views_used + 1 WHERE id = ?`,
        [id],
        err => {
          if (err) return reject(err);
          paste.views_used += 1;
          resolve(paste);
        }
      );
    });
  });
}

module.exports = { createPaste, getPaste };
