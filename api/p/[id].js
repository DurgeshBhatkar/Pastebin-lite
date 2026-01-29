const { getPaste } = require("../../db/store");
const { escapeHtml, sendHtml } = require("../../lib/http");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    return res.end("Method not allowed");
  }

  // Vercel passes dynamic route params in req.query when using rewrites
  // For /api/p/[id], the param from rewrite /p/:id -> /api/p/:id is available as req.query.id
  let id = req.query?.id;
  
  // Fallback: parse from URL path if query param not available
  // This handles cases where the parameter might not be in req.query
  if (!id && req.url) {
    const urlPath = req.url.split("?")[0];
    // Remove trailing slash if present
    const cleanPath = urlPath.endsWith("/") ? urlPath.slice(0, -1) : urlPath;
    const parts = cleanPath.split("/").filter(Boolean);
    
    // Path could be /api/p/:id or /p/:id depending on how it's accessed
    // Find the segment after 'p'
    const pIndex = parts.indexOf("p");
    if (pIndex !== -1 && pIndex < parts.length - 1) {
      id = parts[pIndex + 1];
    } else if (parts.length > 0) {
      // Last resort: use the last segment (for direct /api/p/:id access)
      id = parts[parts.length - 1];
    }
  }

  // Trim and validate the ID
  if (id) {
    id = String(id).trim();
  }

  if (!id || id === "") {
    return sendHtml(res, 404, "Paste not found");
  }

  try {
    const paste = await getPaste(id, req);
    if (!paste) {
      return sendHtml(res, 404, "Paste not found");
    }

    const escapedContent = escapeHtml(paste.content);
    return sendHtml(
      res,
      200,
      `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Paste</title>
  </head>
  <body>
    <pre>${escapedContent}</pre>
  </body>
</html>`
    );
  } catch (err) {
    console.error(err);
    return sendHtml(res, 500, "Internal server error");
  }
};
