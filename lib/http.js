function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function sendHtml(res, statusCode, html) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end(html);
}

function getBaseUrl(req) {
  const proto = (req.headers["x-forwarded-proto"] || "http").split(",")[0].trim();
  const host =
    (req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  return `${proto}://${host}`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => {
      data += chunk;
      // Basic safety guard
      if (data.length > 2_000_000) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function readJson(req) {
  const raw = await readBody(req);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const err = new Error("Invalid JSON");
    err.code = "INVALID_JSON";
    throw err;
  }
}

module.exports = { sendJson, sendHtml, getBaseUrl, escapeHtml, readJson };
