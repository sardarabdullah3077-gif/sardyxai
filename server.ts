/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import app from "./src/serverApp";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const PORT = 3000;

async function startServer() {
  // Add request logging middleware
  app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.path}`);
    next();
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    // Use Vite only for non-API requests
    // API routes are already handled by Express app from serverApp.ts
    app.use((req, res, next) => {
      // Skip Vite middleware for API/auth/health routes
      if (req.path.startsWith('/api/') || 
          req.path.startsWith('/auth/') ||
          req.path.startsWith('/health')) {
        console.log(`[API ROUTE] Allowing ${req.method} ${req.path} to pass through to route handlers`);
        // Let Express handlers deal with these
        return next();
      }
      // For everything else (HTML, CSS, JS, assets), use Vite
      console.log(`[VITE ROUTE] Routing ${req.path} through Vite`);
      vite.middlewares(req, res, next);
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Final 404 handler
  app.use((req, res) => {
    console.log(`[404] No route found for ${req.method} ${req.path}`);
    res.status(404).json({ error: "Not Found", path: req.path, method: req.method });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SARDYX Central Server] Running on http://localhost:${PORT}`);
    console.log(`[SARDYX Central Server] Health check: http://localhost:${PORT}/health`);
    console.log(`[SARDYX Central Server] Chat test: POST http://localhost:${PORT}/api/chats/test/messages`);
  });
}

startServer();
