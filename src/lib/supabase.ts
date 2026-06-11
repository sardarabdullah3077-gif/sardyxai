/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

if (supabase) {
  console.log("[DATABASE] Supabase initialized successfully.");
} else {
  console.log("[DATABASE] Warning: Supabase is not configured. Falling back to local JSON database.");
}

// --- LOCAL JSON DATABASE FALLBACK SYSTEM ---
const isVercel = process.env.VERCEL === "1" || !!process.env.VERCEL;
const DATA_DIR = isVercel ? "/tmp" : path.join(process.cwd(), "db_data");
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

export const getLocalDB = (): DBStructure => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("[DATABASE] Error reading local database file, resetting defaults:", err);
  }
  saveLocalDB(defaultDB);
  return defaultDB;
};

export const saveLocalDB = (data: DBStructure) => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[DATABASE] Error writing local database file:", err);
  }
};

// --- UNIFIED DATABASE OPERATIONS ---

// User authentication
export async function dbSignUp(email: string, password: string, name: string) {
  const emailLower = email.toLowerCase().trim();

  if (supabase) {
    console.log(`[DATABASE] Registering ${emailLower} in Supabase Auth`);
    
    // Use admin API for auto email confirmation if service role key is available
    const isServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (isServiceRole) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: emailLower,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (error) throw error;
      if (!data.user) throw new Error("Failed to create user via Admin API");
      
      return {
        id: data.user.id,
        email: data.user.email!,
        name: data.user.user_metadata.name || name,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(emailLower)}`,
        createdAt: data.user.created_at,
      };
    } else {
      // Fallback to regular signup
      const { data, error } = await supabase.auth.signUp({
        email: emailLower,
        password,
        options: {
          data: { name },
        },
      });
      if (error) throw error;
      if (!data.user) throw new Error("Failed to create user via Auth API");
      
      return {
        id: data.user.id,
        email: data.user.email!,
        name: data.user.user_metadata.name || name,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(emailLower)}`,
        createdAt: data.user.created_at,
      };
    }
  }

  // Fallback to JSON DB
  console.log(`[DATABASE] Registering ${emailLower} in local JSON database`);
  const db = getLocalDB();
  if (db.users[emailLower]) {
    throw new Error("An account with this email address already exists.");
  }

  const userId = `usr-local-${Date.now()}`;
  const newUser = {
    id: userId,
    email: emailLower,
    name,
    role: "user",
    createdAt: new Date().toISOString(),
    avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(emailLower)}`,
    password, // Store plain in local sandbox
  };

  db.users[emailLower] = newUser;
  saveLocalDB(db);

  return {
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    avatarUrl: newUser.avatarUrl,
    createdAt: newUser.createdAt,
  };
}

export async function dbSignIn(email: string, password: string) {
  const emailLower = email.toLowerCase().trim();

  if (supabase) {
    console.log(`[DATABASE] Authenticating ${emailLower} in Supabase Auth`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailLower,
      password,
    });
    if (error) throw error;
    if (!data.user) throw new Error("Authentication failed");

    return {
      id: data.user.id,
      email: data.user.email!,
      name: data.user.user_metadata.name || emailLower.split("@")[0],
      avatarUrl: data.user.user_metadata.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(emailLower)}`,
      createdAt: data.user.created_at,
    };
  }

  // Fallback to JSON DB
  console.log(`[DATABASE] Authenticating ${emailLower} in local JSON database`);
  const db = getLocalDB();
  const user = db.users[emailLower];
  if (!user || user.password !== password) {
    throw new Error("Invalid email or password.");
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

export async function dbGetUserProfile(email: string) {
  const emailLower = email.toLowerCase().trim();

  if (supabase) {
    // If Supabase is active, user exists if they are present in Supabase.
    // We can verify via admin API (list users) or simply assume profile exists if they are authenticated.
    // To make it robust without listing all users, we can just return standard profile fields
    return {
      id: `usr-sb-${Buffer.from(emailLower).toString("hex").substring(0, 10)}`,
      email: emailLower,
      name: emailLower.split("@")[0],
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(emailLower)}`,
      createdAt: new Date().toISOString(),
    };
  }

  const db = getLocalDB();
  const user = db.users[emailLower];
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

// Chat sessions management
export async function dbGetSessions(email: string) {
  const emailLower = email.toLowerCase().trim();

  if (supabase) {
    console.log(`[DATABASE] Fetching chat sessions for ${emailLower} from Supabase`);
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("user_email", emailLower)
      .order("updated_at", { ascending: false });
    
    if (error) {
      console.error("[DATABASE] Supabase fetch sessions error:", error);
      throw error;
    }
    
    return (data || []).map(s => ({
      id: s.id,
      userEmail: s.user_email,
      title: s.title,
      messages: s.messages || [],
      modelMode: s.model_mode || "auto",
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      isSaved: true
    }));
  }

  const db = getLocalDB();
  return db.sessions.filter(s => s.userEmail === emailLower);
}

export async function dbCreateSession(id: string, email: string, title: string, modelMode: string) {
  const emailLower = email.toLowerCase().trim();

  if (supabase) {
    console.log(`[DATABASE] Creating chat session ${id} for ${emailLower} in Supabase`);
    const newSession = {
      id,
      user_email: emailLower,
      title: title || "New Conversation",
      messages: [],
      model_mode: modelMode || "auto",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("chat_sessions")
      .insert(newSession)
      .select()
      .single();

    if (error) {
      console.error("[DATABASE] Supabase insert session error:", error);
      throw error;
    }

    return {
      id: data.id,
      userEmail: data.user_email,
      title: data.title,
      messages: data.messages || [],
      modelMode: data.model_mode || "auto",
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      isSaved: true
    };
  }

  const db = getLocalDB();
  const newSession = {
    id,
    userEmail: emailLower,
    title: title || "New Conversation",
    messages: [],
    modelMode: modelMode || "auto",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isSaved: true
  };

  db.sessions.unshift(newSession);
  saveLocalDB(db);
  return newSession;
}

export async function dbUpdateSession(id: string, email: string, messages: any[]) {
  const emailLower = email.toLowerCase().trim();

  if (supabase) {
    console.log(`[DATABASE] Updating chat session ${id} for ${emailLower} in Supabase`);
    const { data, error } = await supabase
      .from("chat_sessions")
      .update({
        messages,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("user_email", emailLower)
      .select()
      .single();

    if (error) {
      console.error("[DATABASE] Supabase update session error:", error);
      throw error;
    }

    return {
      id: data.id,
      userEmail: data.user_email,
      title: data.title,
      messages: data.messages || [],
      modelMode: data.model_mode || "auto",
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      isSaved: true
    };
  }

  const db = getLocalDB();
  const session = db.sessions.find(s => s.id === id && s.userEmail === emailLower);
  if (session) {
    session.messages = messages;
    session.updatedAt = new Date().toISOString();
    saveLocalDB(db);
    return session;
  }
  throw new Error("Chat session not found locally.");
}

export async function dbDeleteSession(id: string, email: string) {
  const emailLower = email.toLowerCase().trim();

  if (supabase) {
    console.log(`[DATABASE] Deleting chat session ${id} for ${emailLower} in Supabase`);
    const { error } = await supabase
      .from("chat_sessions")
      .delete()
      .eq("id", id)
      .eq("user_email", emailLower);

    if (error) {
      console.error("[DATABASE] Supabase delete session error:", error);
      throw error;
    }
    return true;
  }

  const db = getLocalDB();
  const index = db.sessions.findIndex(s => s.id === id && s.userEmail === emailLower);
  if (index !== -1) {
    db.sessions.splice(index, 1);
    saveLocalDB(db);
    return true;
  }
  throw new Error("Chat session not found locally.");
}

// Memories management
export async function dbGetMemories(email: string) {
  const emailLower = email.toLowerCase().trim();

  if (supabase) {
    console.log(`[DATABASE] Fetching memories for ${emailLower} from Supabase`);
    const { data, error } = await supabase
      .from("memories")
      .select("*")
      .eq("user_email", emailLower)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[DATABASE] Supabase fetch memories error:", error);
      throw error;
    }

    return (data || []).map(m => ({
      id: m.id,
      userEmail: m.user_email,
      key: m.key,
      content: m.content,
      createdAt: m.created_at
    }));
  }

  const db = getLocalDB();
  return db.memories.filter(m => m.userEmail === emailLower);
}

export async function dbCreateMemory(id: string, email: string, key: string, content: string) {
  const emailLower = email.toLowerCase().trim();

  if (supabase) {
    console.log(`[DATABASE] Creating memory for ${emailLower} in Supabase`);
    const newMemory = {
      id,
      user_email: emailLower,
      key,
      content,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("memories")
      .insert(newMemory)
      .select()
      .single();

    if (error) {
      console.error("[DATABASE] Supabase insert memory error:", error);
      throw error;
    }

    return {
      id: data.id,
      userEmail: data.user_email,
      key: data.key,
      content: data.content,
      createdAt: data.created_at
    };
  }

  const db = getLocalDB();
  const newMemory = {
    id,
    userEmail: emailLower,
    key,
    content,
    createdAt: new Date().toISOString()
  };

  db.memories.push(newMemory);
  saveLocalDB(db);
  return newMemory;
}

export async function dbDeleteMemory(id: string, email: string) {
  const emailLower = email.toLowerCase().trim();

  if (supabase) {
    console.log(`[DATABASE] Deleting memory ${id} for ${emailLower} in Supabase`);
    const { error } = await supabase
      .from("memories")
      .delete()
      .eq("id", id)
      .eq("user_email", emailLower);

    if (error) {
      console.error("[DATABASE] Supabase delete memory error:", error);
      throw error;
    }
    return true;
  }

  const db = getLocalDB();
  const index = db.memories.findIndex(m => m.id === id && m.userEmail === emailLower);
  if (index !== -1) {
    db.memories.splice(index, 1);
    saveLocalDB(db);
    return true;
  }
  throw new Error("Memory not found locally.");
}
