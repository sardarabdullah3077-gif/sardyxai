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
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    // Skip Vite middleware for API routes - handle them before Vite
    app.use((req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
        // Skip Vite for API routes
        return next();
      }
      // Use Vite for other requests
      vite.middlewares(req, res, next);
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SARDYX Central Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
