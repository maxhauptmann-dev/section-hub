#!/usr/bin/env node
// start-server.js
// Lightweight wrapper that tries common export shapes from build/server/index.js
// and ensures the app binds explicitly to HOST and PORT (defaults: 0.0.0.0:8080).
const http = require("http");
const path = require("path");

const PORT = parseInt(process.env.PORT || "8080", 10);
const HOST = process.env.HOST || "0.0.0.0";

const serverEntry = path.join(__dirname, "build", "server", "index.js");

let mod;
try {
  mod = require(serverEntry);
} catch (err) {
  console.error("Failed to require build/server/index.js:", err);
  process.exit(1);
}

const exported = mod && (mod.default || mod);

// If export is an express/connect-like app with .listen
if (exported && typeof exported.listen === "function") {
  exported.listen(PORT, HOST, () => {
    console.log(`App listening (app.listen) on http://${HOST}:${PORT}`);
  });
  return;
}

// If export is a request handler function (req, res)
if (typeof exported === "function") {
  const server = http.createServer(exported);
  server.listen(PORT, HOST, () => {
    console.log(`App listening (http.createServer) on http://${HOST}:${PORT}`);
  });
  return;
}

// If module provides a createServer or start function
if (exported && typeof exported.createServer === "function") {
  const srv = exported.createServer();
  if (srv && typeof srv.listen === "function") {
    srv.listen(PORT, HOST, () => {
      console.log(`App listening (createServer) on http://${HOST}:${PORT}`);
    });
    return;
  }
}

if (exported && typeof exported.start === "function") {
  try {
    // try typical start(port, host) signature
    exported.start(PORT, HOST);
    console.log(`Called exported.start(${PORT}, ${HOST})`);
    return;
  } catch (err) {
    console.warn("exported.start exists but threw:", err);
  }
}

console.error("Couldn't determine how to start the server from build/server/index.js");
process.exit(1);
