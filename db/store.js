const crypto = require("crypto");

// Uses Upstash Redis (REST) when configured; otherwise falls back to in-memory
// (fine for local dev, NOT recommended for Vercel grading).
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const memoryStore = new Map();

let redisClient = null;
function getRedis() {
  if (redisClient) return redisClient;
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) return null;

  // Lazy import so local dev works without Redis configured.
  // eslint-disable-next-line global-require
  const { Redis } = require("@upstash/redis");
  redisClient = new Redis({
    url: UPSTASH_REDIS_REST_URL,
    token: UPSTASH_REDIS_REST_TOKEN,
  });
  return redisClient;
}

function getNow(req) {
  // Deterministic time for TTL tests (per assignment PDF).
  if (process.env.TEST_MODE === "1") {
    const t = req?.headers?.["x-test-now-ms"];
    if (t !== undefined) {
      const n = Number(t);
      if (!Number.isNaN(n)) return n;
    }
  }
  return Date.now();
}

function generateId() {
  return crypto.randomBytes(6).toString("hex");
}

function normalizePaste(id, content, createdAtMs, expiresAtMs, maxViews, viewsUsed) {
  return {
    id,
    content,
    created_at: createdAtMs,
    expires_at: expiresAtMs === -1 ? null : expiresAtMs,
    max_views: maxViews === -1 ? null : maxViews,
    views_used: viewsUsed,
  };
}

async function createPaste({ content, ttl_seconds, max_views }, req) {
  const id = generateId();
  const now = getNow(req);

  const expiresAt = ttl_seconds ? now + ttl_seconds * 1000 : -1;
  const maxViews = max_views ?? -1;

  const redis = getRedis();
  if (!redis) {
    memoryStore.set(id, {
      id,
      content,
      created_at: now,
      expires_at: expiresAt,
      max_views: maxViews,
      views_used: 0,
    });
    return normalizePaste(id, content, now, expiresAt, maxViews, 0);
  }

  const key = `paste:${id}`;
  await redis.hset(key, {
    content,
    created_at: String(now),
    expires_at: String(expiresAt),
    max_views: String(maxViews),
    views_used: "0",
  });

  return normalizePaste(id, content, now, expiresAt, maxViews, 0);
}

const GET_PASTE_LUA = `
local k = KEYS[1]
if redis.call("EXISTS", k) == 0 then
  return nil
end

local now = tonumber(ARGV[1])
local expires_at = tonumber(redis.call("HGET", k, "expires_at") or "-1")
local max_views = tonumber(redis.call("HGET", k, "max_views") or "-1")
local views_used = tonumber(redis.call("HGET", k, "views_used") or "0")

if expires_at ~= -1 and now > expires_at then
  redis.call("DEL", k)
  return nil
end

if max_views ~= -1 and views_used >= max_views then
  redis.call("DEL", k)
  return nil
end

local new_views = redis.call("HINCRBY", k, "views_used", 1)
local content = redis.call("HGET", k, "content") or ""
local created_at = redis.call("HGET", k, "created_at") or "0"
return { content, created_at, tostring(expires_at), tostring(max_views), tostring(new_views) }
`;

async function getPaste(id, req) {
  const now = getNow(req);

  const redis = getRedis();
  if (!redis) {
    const paste = memoryStore.get(id);
    if (!paste) return null;

    if (paste.expires_at !== -1 && now > paste.expires_at) {
      memoryStore.delete(id);
      return null;
    }

    if (paste.max_views !== -1 && paste.views_used >= paste.max_views) {
      memoryStore.delete(id);
      return null;
    }

    paste.views_used += 1;
    return normalizePaste(
      paste.id,
      paste.content,
      paste.created_at,
      paste.expires_at,
      paste.max_views,
      paste.views_used
    );
  }

  const key = `paste:${id}`;
  const result = await redis.eval(GET_PASTE_LUA, [key], [String(now)]);
  if (!result) return null;

  const content = String(result[0] ?? "");
  const createdAt = Number(result[1] ?? 0);
  const expiresAt = Number(result[2] ?? -1);
  const maxViews = Number(result[3] ?? -1);
  const viewsUsed = Number(result[4] ?? 0);

  return normalizePaste(id, content, createdAt, expiresAt, maxViews, viewsUsed);
}

async function pingDb() {
  const redis = getRedis();
  if (!redis) return false;
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

module.exports = { createPaste, getPaste, pingDb };
