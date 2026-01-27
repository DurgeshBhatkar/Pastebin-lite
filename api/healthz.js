const express = require("express");
const router = express.Router();
const { pingDb } = require("../db/store");

router.get("/", async (req, res) => {
  const ok = await pingDb();
  // Per spec: always 200 + JSON; "ok" should reflect persistence access.
  res.status(200).json({ ok });
});

module.exports = router;
