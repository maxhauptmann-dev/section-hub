import express from "express";
import compression from "compression";
import { createRequestHandler } from "@react-router/express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "8080", 10);
const HOST = process.env.HOST || "0.0.0.0";

const app = express();

// ── 1. Gzip/Brotli compression for all responses ──
// Reduces HTML/JS/CSS transfer size by ~60-70%
app.use(compression({
  level: 6,
  threshold: 256,
  filter: (req, res) => {
    if (req.headers["x-no-compression"]) return false;
    return compression.filter(req, res);
  },
}));

// ── 2. Static assets with aggressive caching ──
// Vite adds content hashes to filenames, so immutable caching is safe.
app.use(
  "/assets",
  express.static(path.join(__dirname, "build", "client", "assets"), {
    immutable: true,
    maxAge: "1y",
    etag: false,
    lastModified: false,
  })
);

// ── 3. Preview images with moderate caching ──
app.use(
  "/previews",
  express.static(path.join(__dirname, "public", "previews"), {
    maxAge: "7d",
    etag: true,
  })
);

// ── 4. Other public files (favicon etc.) ──
app.use(
  express.static(path.join(__dirname, "build", "client"), {
    maxAge: "1h",
    etag: true,
  })
);

// ── 5. React Router SSR handler ──
const build = await import("./build/server/index.js");

app.use(
  createRequestHandler({
    build,
    mode: process.env.NODE_ENV || "production",
  })
);

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server ready at http://${HOST}:${PORT}`);
  console.log(`   ✓ Gzip compression enabled`);
  console.log(`   ✓ Static assets: 1 year immutable cache`);
  console.log(`   ✓ Preview images: 7 day cache`);
});
