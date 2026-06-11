/**
 * Vercel Serverless Function Handler
 * Express app for API routes
 */

import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const app = express();

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Setup database
const DATA_DIR = process.env.NODE_ENV === "production" ? "/tmp" : path.join(process.cwd(), "db_data");
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
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing database file:", err);
  }
};

// Auth endpoints
app.post("/api/auth/local-signup", (req: Request, res: Response) => {
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

app.post("/api/auth/local-login", (req: Request, res: Response) => {
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
    console.error("[AUTH] Login error:", err);
    res.status(500).json({ error: "Login failed", message: err.message || "Failed to authenticate" });
  }
});

app.get("/api/auth/session", (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No authorization header" });
    }

    const email = authHeader.replace("Bearer ", "").trim();
    const db = getDB();
    const user = db.users[email];

    if (!user) {
      return res.status(401).json({ error: "User not found" });
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
      token: email,
    });
  } catch (err: any) {
    console.error("[AUTH] Session error:", err);
    res.status(500).json({ error: "Session check failed", message: err.message });
  }
});

app.post("/api/auth/logout", (req: Request, res: Response) => {
  res.json({ message: "Logged out successfully" });
});

// Models endpoint
app.get("/api/models", (req: Request, res: Response) => {
  try {
    res.json([
      {
        id: "gpt-4-turbo",
        name: "GPT-4 Turbo",
        category: "Premium",
        isAvailable: true,
        provider: "OpenAI",
        description: "Most capable model, best for complex tasks",
        iconName: "brain",
      },
      {
        id: "gpt-4",
        name: "GPT-4",
        category: "Premium",
        isAvailable: true,
        provider: "OpenAI",
        description: "Powerful model with extended context",
        iconName: "brain",
      },
      {
        id: "gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        category: "Fast",
        isAvailable: true,
        provider: "OpenAI",
        description: "Fast and efficient for most tasks",
        iconName: "zap",
      },
      {
        id: "claude-3-opus",
        name: "Claude 3 Opus",
        category: "Premium",
        isAvailable: true,
        provider: "Anthropic",
        description: "Most capable Claude model",
        iconName: "brain",
      },
      {
        id: "claude-3-sonnet",
        name: "Claude 3 Sonnet",
        category: "Balanced",
        isAvailable: true,
        provider: "Anthropic",
        description: "Balanced performance and speed",
        iconName: "zap",
      },
      {
        id: "gemini-pro",
        name: "Gemini Pro",
        category: "Balanced",
        isAvailable: true,
        provider: "Google",
        description: "Fast and cost-effective",
        iconName: "zap",
      },
    ]);
  } catch (err: any) {
    console.error("[MODELS] Error:", err);
    res.status(500).json({ error: "Failed to fetch models" });
  }
});

// Security endpoint - check guest limit
app.post("/api/security/check-guest-limit", (req: Request, res: Response) => {
  try {
    const clientIp = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";
    const db = getDB();
    
    const now = Date.now();
    const WINDOW = 60000; // 1 minute
    const LIMIT = 5; // 5 messages per minute
    
    if (!db.guestTokens) {
      db.guestTokens = {};
    }
    
    const clientKey = String(clientIp);
    const lastRequest = db.guestTokens[clientKey] || 0;
    
    if (now - lastRequest < WINDOW) {
      return res.status(429).json({ 
        error: "Rate limit exceeded", 
        retryAfter: Math.ceil((WINDOW - (now - lastRequest)) / 1000) 
      });
    }
    
    db.guestTokens[clientKey] = now;
    saveDB(db);
    
    res.json({ allowed: true });
  } catch (err: any) {
    console.error("[SECURITY] Rate limit check error:", err);
    res.status(500).json({ error: "Security check failed", message: err.message });
  }
});

// Chat endpoints
app.post("/api/chats/:id/messages", (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message.content !== "string") {
      return res.status(400).json({ error: "Message content is required" });
    }

    const botMessage = {
      id: `msg-${Date.now()}-bot`,
      role: "assistant",
      content: `I received your message: "${message.content.substring(0, 50)}..."`,
      timestamp: new Date().toISOString(),
      modelUsed: "gpt-3.5-turbo",
    };

    res.json({
      message: botMessage,
    });
  } catch (err: any) {
    console.error("[CHAT] Error:", err);
    res.status(500).json({ error: "Chat processing failed", message: err.message });
  }
});

// Health check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "unknown",
  });
});

export default app;
