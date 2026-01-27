const express = require("express");
const router = express.Router();
const { createPaste, getPaste } = require("../../db/store");

// Create paste
router.post("/", async (req, res) => {
  try {
    const { content, ttl_seconds, max_views } = req.body || {};

    if (typeof content !== "string" || content.trim() === "") {
      return res.status(400).json({ error: "Invalid content" });
    }

    if (ttl_seconds !== undefined && (!Number.isInteger(ttl_seconds) || ttl_seconds < 1)) {
      return res.status(400).json({ error: "Invalid ttl_seconds" });
    }

    if (max_views !== undefined && (!Number.isInteger(max_views) || max_views < 1)) {
      return res.status(400).json({ error: "Invalid max_views" });
    }

    const paste = await createPaste({ content, ttl_seconds, max_views }, req);

    res.status(201).json({
      id: paste.id,
      url: `${req.protocol}://${req.get("host")}/p/${paste.id}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Fetch paste
router.get("/:id", async (req, res) => {
  try {
    const paste = await getPaste(req.params.id, req);

    if (!paste) {
      return res.status(404).json({ error: "Paste not found" });
    }

    res.json({
      content: paste.content,
      remaining_views:
        paste.max_views === null
          ? null
          : Math.max(0, paste.max_views - paste.views_used),
      expires_at: paste.expires_at
        ? new Date(paste.expires_at).toISOString()
        : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
