const { pingDb } = require("../db/store");
const { sendJson } = require("../lib/http");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const ok = await pingDb();
  // Per spec: always 200 + JSON; "ok" should reflect persistence access.
  return sendJson(res, 200, { ok });
};
