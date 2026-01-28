require("dotenv").config();

const express = require("express");
const healthzRoute = require("./routes/healthz");
const pastesRoute = require("./routes/pastes");
const { getPaste } = require("./db/store");

const app = express();
// So req.protocol reflects x-forwarded-proto on platforms like Vercel.
app.set("trust proxy", 1);
app.use(express.json());
app.use(express.static("public"));

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
  // Served from public/index.html when present.
  res.sendFile("index.html", { root: "public" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
