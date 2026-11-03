const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const envFile = path.join(root, ".env");
if (fs.existsSync(envFile)) {
  if (typeof process.loadEnvFile !== "function") {
    throw new Error("Loading .env requires Node.js 20.12 or later. Upgrade Node.js or set the variables in your environment.");
  }
  process.loadEnvFile(envFile);
}

const port = Number(process.env.PORT) || 8000;
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function send(response, status, contentType, body) {
  response.writeHead(status, {
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store"
  });
  response.end(body);
}

const server = http.createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    send(response, 405, "text/plain; charset=utf-8", "Method not allowed");
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    send(response, 400, "text/plain; charset=utf-8", "Bad request");
    return;
  }

  if (pathname === "/supabase-config.js") {
    const projectUrl = process.env.SUPABASE_URL?.trim();
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
    if (!projectUrl || !publishableKey) {
      send(response, 500, "text/plain; charset=utf-8", "Supabase configuration is missing. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in .env or in the hosting environment.");
      return;
    }
    let parsedUrl;
    try { parsedUrl = new URL(projectUrl); } catch {
      send(response, 500, "text/plain; charset=utf-8", "SUPABASE_URL must be a valid HTTPS URL");
      return;
    }
    if (parsedUrl.protocol !== "https:" || !parsedUrl.hostname.endsWith(".supabase.co")) {
      send(response, 500, "text/plain; charset=utf-8", "SUPABASE_URL must be an HTTPS URL ending in .supabase.co");
      return;
    }
    const config = `window.SKILLUP_SUPABASE_CONFIG = ${JSON.stringify({ url: parsedUrl.origin, publishableKey })};`;
    send(response, 200, "text/javascript; charset=utf-8", config);
    return;
  }

  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const segments = relativePath.split(/[\\/]/);
  if (segments.some((segment) => segment.startsWith(".")) || relativePath === "server.js" || relativePath === "SUPABASE_SETUP.md" || relativePath.startsWith("supabase/")) {
    send(response, 404, "text/plain; charset=utf-8", "Not found");
    return;
  }

  const filename = path.resolve(root, relativePath);
  if (!filename.startsWith(root + path.sep)) {
    send(response, 403, "text/plain; charset=utf-8", "Forbidden");
    return;
  }
  fs.readFile(filename, (error, content) => {
    if (error) {
      send(response, 404, "text/plain; charset=utf-8", "Not found");
      return;
    }
    send(response, 200, mimeTypes[path.extname(filename).toLowerCase()] || "application/octet-stream", request.method === "HEAD" ? "" : content);
  });
});

server.listen(port, () => console.log(`SKILL-UP running at http://localhost:${port}`));
