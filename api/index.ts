/**
 * Vercel API Edge Function Handler
 * Routes all API requests through Express app
 */

import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import * as dotenv from "dotenv";
import chatRouter from "../src/api/chat";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const app = express();

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Setup database
const DATA_DIR = "/tmp";
const DB_FILE = path.join(DATA_DIR, "database.json");

interface DBStructure {
  users: { [key: string]: any };
  sessions: any[];
  memories: any[];
  auditLogs: any[];
  guestTokens: { [key: string]: number };
  systemMetrics: {
    requestsTotal: number;
    apiLatencyMs: number;
    rateLimitHits: number;
    freeLlmCalls: number;
  };
}

const defaultDB: DBStructure = {
  users: {},
  sessions: [],
  memories: [],
  auditLogs: [],
  guestTokens: {},
  systemMetrics: {
    requestsTotal: 0,
    apiLatencyMs: 140,
    rateLimitHits: 0,
    freeLlmCalls: 0,
  },
};

const getDB = (): DBStructure => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error reading database file:", err);
  }
  saveDB(defaultDB);
  return defaultDB;
};

const saveDB = (data: DBStructure) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing database file:", err);
  }
};

const getClientIp = (req: Request) => {
  return (req.headers["x-forwarded-for"] as string) || req.socket?.remoteAddress || "127.0.0.1";
};

// Auth endpoints
app.post(["/api/auth/signup", "/auth/signup"], (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Email, password, and name are required." });
    }
    
    const emailLower = email.toLowerCase().trim();
    const db = getDB();
    
    if (db.users[emailLower]) {
      return res.status(400).json({ error: "Account already exists. Please sign in instead." });
    }

    const userId = `usr-${Date.now()}`;
    const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(emailLower)}`;

    const newUser = {
      id: userId,
      email: emailLower,
      name,
      role: "user",
      createdAt: new Date().toISOString(),
      avatarUrl,
      password,
    };

    db.users[emailLower] = newUser;
    saveDB(db);

    res.json({
      user: {
        id: userId,
        email: emailLower,
        name,
        role: "user",
        createdAt: newUser.createdAt,
        avatarUrl,
      },
      token: emailLower,
    });
  } catch (err: any) {
    console.error("[AUTH] Signup error:", err);
    res.status(500).json({ error: "Signup failed", message: err.message || "Failed to create account" });
  }
});

app.post(["/api/auth/signin", "/auth/signin"], (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const emailLower = email.toLowerCase().trim();
    const db = getDB();
    const user = db.users[emailLower];

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        avatarUrl: user.avatarUrl,
      },
      token: emailLower,
    });
  } catch (err: any) {
    console.error("[AUTH] Signin error:", err);
    res.status(500).json({ error: "Signin failed", message: err.message || "Failed to authenticate" });
  }
});

// Chat endpoints
app.get(["/api/chats", "/chats"], (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.json([]);
    }
    const email = authHeader.replace("Bearer ", "").trim();
    const db = getDB();
    const userChats = db.sessions.filter((s: any) => s.userEmail === email);
    res.json(userChats);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch chats" });
  }
});

app.post(["/api/chats/:id/messages", "/chats/:id/messages"], (req: Request, res: Response) => {
  try {
    const { message, guestToken } = req.body;
    const authHeader = req.headers.authorization;

    if (!message || typeof message.content !== "string") {
      return res.status(400).json({ error: "Message content is required" });
    }

    const userEmail = authHeader ? authHeader.replace("Bearer ", "").trim() : null;
    const db = getDB();

    const botMessage = {
      id: `msg-${Date.now()}-bot`,
      role: "assistant",
      content: `Hello! This is a test response to: "${message.content.substring(0, 50)}..."`,
      timestamp: new Date().toISOString(),
      modelUsed: "local-sandbox",
      durationMs: 150,
      thoughts: ["Processed user input", "Generated response"],
    };

    res.json({
      message: botMessage,
      session: null,
    });
  } catch (err: any) {
    console.error("[CHAT] Error:", err);
    res.status(500).json({ error: "Chat processing failed", message: err.message });
  }
});

app.get(["/api/models", "/models"], (req: Request, res: Response) => {
  res.json([
    {
      id: "local-chat",
      name: "Local Chat Model",
      category: "Chat Models",
      isAvailable: true,
      provider: "Local",
      description: "Local sandbox model",
      iconName: "message-square",
    },
  ]);
});

// Health check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Export for Vercel
export default app;
