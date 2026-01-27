require("dotenv").config();

const express = require("express");
const healthzRoute = require("./api/healthz");
const pastesRoute = require("./api/pastes");
const { getPaste } = require("./db/store");

const app = express();
// So req.protocol reflects x-forwarded-proto on platforms like Vercel.
app.set("trust proxy", 1);
app.use(express.json());

// API routes
app.use("/api/healthz", healthzRoute);
app.use("/api/pastes", pastesRoute);

// HTML view route
app.get("/p/:id", async (req, res) => {
  try {
    const paste = await getPaste(req.params.id, req);

    if (!paste) {
      return res.status(404).send("Paste not found");
    }

    const escapedContent = paste.content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Paste</title>
        </head>
        <body>
          <pre>${escapedContent}</pre>
        </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

// Root
app.get("/", (req, res) => {
  res.type("html").send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Pastebin‑Lite</title>
        <style>
          body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 24px; max-width: 900px; }
          textarea { width: 100%; min-height: 220px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
          label { display: block; margin-top: 12px; }
          input { padding: 6px 8px; }
          button { margin-top: 12px; padding: 8px 12px; cursor: pointer; }
          .row { display: flex; gap: 12px; flex-wrap: wrap; }
          .row > div { flex: 1; min-width: 180px; }
          pre { background: #f6f8fa; padding: 12px; overflow: auto; }
        </style>
      </head>
      <body>
        <h2>Pastebin‑Lite</h2>
        <p>Create a paste, get a shareable URL.</p>

        <label>Content</label>
        <textarea id="content" placeholder="Paste text here..."></textarea>

        <div class="row">
          <div>
            <label>ttl_seconds (optional)</label>
            <input id="ttl" type="number" min="1" step="1" placeholder="e.g. 60" />
          </div>
          <div>
            <label>max_views (optional)</label>
            <input id="views" type="number" min="1" step="1" placeholder="e.g. 3" />
          </div>
        </div>

        <button id="create">Create paste</button>
        <pre id="out"></pre>

        <script>
          const out = document.getElementById('out');
          document.getElementById('create').addEventListener('click', async () => {
            out.textContent = '';
            const content = document.getElementById('content').value;
            const ttl = document.getElementById('ttl').value;
            const views = document.getElementById('views').value;
            const body = { content };
            if (ttl) body.ttl_seconds = Number(ttl);
            if (views) body.max_views = Number(views);

            const r = await fetch('/api/pastes', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(body),
            });
            const data = await r.json().catch(() => ({ error: 'Invalid JSON response' }));
            if (!r.ok) {
              out.textContent = JSON.stringify(data, null, 2);
              return;
            }
            out.textContent = JSON.stringify(data, null, 2);
          });
        </script>
      </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
