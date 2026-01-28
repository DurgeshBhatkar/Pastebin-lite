const { getPaste } = require("../../db/store");
const { sendJson } = require("../../lib/http");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const id =
    req.query?.id ||
    String(req.url || "")
      .split("?")[0]
      .split("/")
      .filter(Boolean)
      .pop();

  if (!id) return sendJson(res, 404, { error: "Paste not found" });

  try {
    const paste = await getPaste(id, req);
    if (!paste) {
      return sendJson(res, 404, { error: "Paste not found" });
    }

    return sendJson(res, 200, {
      content: paste.content,
      remaining_views:
        paste.max_views === null ? null : Math.max(0, paste.max_views - paste.views_used),
      expires_at: paste.expires_at ? new Date(paste.expires_at).toISOString() : null,
    });
  } catch (err) {
    console.error(err);
    return sendJson(res, 500, { error: "Internal server error" });
  }
};
