const { createPaste } = require("../../db/store");
const { getBaseUrl, readJson, sendJson } = require("../../lib/http");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readJson(req);
    const { content, ttl_seconds, max_views } = body || {};

    if (typeof content !== "string" || content.trim() === "") {
      return sendJson(res, 400, { error: "Invalid content" });
    }

    if (ttl_seconds !== undefined && (!Number.isInteger(ttl_seconds) || ttl_seconds < 1)) {
      return sendJson(res, 400, { error: "Invalid ttl_seconds" });
    }

    if (max_views !== undefined && (!Number.isInteger(max_views) || max_views < 1)) {
      return sendJson(res, 400, { error: "Invalid max_views" });
    }

    const paste = await createPaste({ content, ttl_seconds, max_views }, req);
    const base = getBaseUrl(req);

    return sendJson(res, 201, {
      id: paste.id,
      url: `${base}/p/${paste.id}`,
    });
  } catch (err) {
    if (err?.code === "INVALID_JSON") {
      return sendJson(res, 400, { error: "Invalid JSON" });
    }
    if (String(err?.message || "").includes("Body too large")) {
      return sendJson(res, 413, { error: "Payload too large" });
    }
    console.error(err);
    return sendJson(res, 500, { error: "Internal server error" });
  }
};
