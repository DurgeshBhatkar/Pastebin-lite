const { getPaste } = require("../../db/store");
const { escapeHtml, sendHtml } = require("../../lib/http");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    return res.end("Method not allowed");
  }

  const id =
    req.query?.id ||
    String(req.url || "")
      .split("?")[0]
      .split("/")
      .filter(Boolean)
      .pop();

  if (!id) return sendHtml(res, 404, "Paste not found");

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
