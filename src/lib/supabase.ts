/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Database adapter — supports Supabase (when env vars present) with
 * automatic fallback to local JSON file so local dev needs zero config.
 *
 * IMPORTANT: Supabase client is lazily initialised so that dotenv has
 * already been called before we try to read the env vars.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Lazy Supabase client — created once on first use, AFTER dotenv loads
// ---------------------------------------------------------------------------
export function getSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";

  if (supabaseUrl && supabaseKey) {
    return createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return null;
}

// Keep a named export for legacy callers
export const supabase = {
  get client() {
    return getSupabaseClient();
  },
};

// ---------------------------------------------------------------------------
// Local JSON database fallback
// ---------------------------------------------------------------------------
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
    console.error("[DATABASE] Error reading local DB, resetting:", err);
  }
  saveLocalDB(defaultDB);
  return { ...defaultDB };
};

export const saveLocalDB = (data: DBStructure) => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[DATABASE] Error writing local DB:", err);
  }
};

// ---------------------------------------------------------------------------
// Helper — always use the lazy client
// ---------------------------------------------------------------------------
function sb(): SupabaseClient | null {
  return getSupabaseClient();
}

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------
export async function dbEmailExists(email: string): Promise<boolean> {
  const emailLower = email.toLowerCase().trim();
  const client = sb();

  if (client) {
    try {
      const { data } = await client.auth.admin.listUsers();
      return data?.users?.some((u: any) => u.email === emailLower) || false;
    } catch (_) {
      return false;
    }
  }

  // Local fallback
  const db = getLocalDB();
  return !!db.users[emailLower];
}

export async function dbSignUp(
  email: string,
  password: string,
  name: string
) {
  const emailLower = email.toLowerCase().trim();
  const client = sb();

  if (client) {
    console.log(`[AUTH] Registering ${emailLower} via Supabase Auth`);
    const { data, error } = await client.auth.signUp({
      email: emailLower,
      password,
      options: { data: { name } },
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Failed to create user via Auth API");

    return {
      id: data.user.id,
      email: data.user.email!,
      name: (data.user.user_metadata?.name as string) || name,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(emailLower)}`,
      createdAt: data.user.created_at,
      role: "user",
    };
  }

  // Local fallback
  console.log(`[AUTH] Registering ${emailLower} in local JSON DB`);
  const db = getLocalDB();
  if (db.users[emailLower]) {
    throw new Error("An account with this email already exists. Please sign in.");
  }

  const userId = `usr-local-${Date.now()}`;
  const newUser = {
    id: userId,
    email: emailLower,
    name,
    role: "user" as const,
    createdAt: new Date().toISOString(),
    avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(emailLower)}`,
    password,
  };
  db.users[emailLower] = newUser;
  saveLocalDB(db);

  const { password: _p, ...safeUser } = newUser;
  return safeUser;
}

export async function dbSignIn(email: string, password: string) {
  const emailLower = email.toLowerCase().trim();
  const client = sb();

  if (client) {
    console.log(`[AUTH] Signing in ${emailLower} via Supabase Auth`);
    const { data, error } = await client.auth.signInWithPassword({
      email: emailLower,
      password,
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Authentication failed");

    return {
      id: data.user.id,
      email: data.user.email!,
      name:
        (data.user.user_metadata?.name as string) ||
        emailLower.split("@")[0],
      avatarUrl:
        (data.user.user_metadata?.avatarUrl as string) ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(emailLower)}`,
      createdAt: data.user.created_at,
      role: "user",
    };
  }

  // Local fallback
  console.log(`[AUTH] Signing in ${emailLower} via local JSON DB`);
  const db = getLocalDB();
  const user = db.users[emailLower];
  if (!user || user.password !== password) {
    throw new Error("Invalid email or password.");
  }

  const { password: _p, ...safeUser } = user;
  return safeUser;
}

export async function dbGetUserProfile(email: string) {
  const emailLower = email.toLowerCase().trim();
  const client = sb();

  if (client) {
    try {
      const { data, error } = await client.auth.admin.listUsers();
      if (!error && data?.users) {
        const found = data.users.find((u) => u.email === emailLower);
        if (found) {
          return {
            id: found.id,
            email: found.email!,
            name:
              (found.user_metadata?.name as string) ||
              emailLower.split("@")[0],
            avatarUrl:
              (found.user_metadata?.avatarUrl as string) ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(emailLower)}`,
            createdAt: found.created_at,
            role: "user",
          };
        }
      }
    } catch (_) {}

    return {
      id: `usr-sb-${Buffer.from(emailLower).toString("hex").substring(0, 10)}`,
      email: emailLower,
      name: emailLower.split("@")[0],
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(emailLower)}`,
      createdAt: new Date().toISOString(),
      role: "user",
    };
  }

  const db = getLocalDB();
  const user = db.users[emailLower];
  if (!user) return null;
  const { password: _p, ...safeUser } = user;
  return safeUser;
}

export async function dbGetGuestLimit(identifier: string): Promise<number> {
  const client = sb();
  if (client) {
    try {
      const { data, error } = await client
        .from("guest_limits")
        .select("message_count")
        .eq("identifier", identifier)
        .maybeSingle();
      if (!error && data) {
        return data.message_count;
      }
    } catch (err) {
      console.error("[DB] Get guest limit error:", err);
    }
  }

  const db = getLocalDB();
  return db.guestTokens[identifier] || 0;
}

export async function dbIncrementGuestLimit(identifier: string): Promise<number> {
  const client = sb();
  if (client) {
    try {
      const current = await dbGetGuestLimit(identifier);
      const nextCount = current + 1;
      const { data, error } = await client
        .from("guest_limits")
        .upsert({
          identifier,
          message_count: nextCount,
          updated_at: new Date().toISOString()
        })
        .select("message_count")
        .single();
      if (!error && data) {
        return data.message_count;
      }
    } catch (err) {
      console.error("[DB] Increment guest limit error:", err);
    }
  }

  const db = getLocalDB();
  const nextCount = (db.guestTokens[identifier] || 0) + 1;
  db.guestTokens[identifier] = nextCount;
  saveLocalDB(db);
  return nextCount;
}

// ---------------------------------------------------------------------------
// CHAT SESSIONS
// ---------------------------------------------------------------------------
export async function dbGetSessions(email: string) {
  const emailLower = email.toLowerCase().trim();
  const client = sb();

  if (client) {
    const { data, error } = await client
      .from("chat_sessions")
      .select("*")
      .eq("user_email", emailLower)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[DB] Supabase fetch sessions error:", error.message);
      throw new Error(error.message);
    }

    return (data || []).map((s) => ({
      id: s.id,
      userEmail: s.user_email,
      title: s.title,
      messages: s.messages || [],
      modelMode: s.model_mode || "auto",
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      isSaved: true,
    }));
  }

  const db = getLocalDB();
  return db.sessions.filter((s) => s.userEmail === emailLower);
}

export async function dbCreateSession(
  id: string,
  email: string,
  title: string,
  modelMode: string
) {
  const emailLower = email.toLowerCase().trim();
  const client = sb();

  if (client) {
    const row = {
      id,
      user_email: emailLower,
      title: title || "New Conversation",
      messages: [],
      model_mode: modelMode || "auto",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from("chat_sessions")
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error("[DB] Supabase create session error:", error.message);
      throw new Error(error.message);
    }

    return {
      id: data.id,
      userEmail: data.user_email,
      title: data.title,
      messages: data.messages || [],
      modelMode: data.model_mode || "auto",
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      isSaved: true,
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
    isSaved: true,
  };
  db.sessions.unshift(newSession);
  saveLocalDB(db);
  return newSession;
}

export async function dbUpdateSession(
  id: string,
  email: string,
  messages: any[]
) {
  const emailLower = email.toLowerCase().trim();
  const client = sb();

  if (client) {
    const { data, error } = await client
      .from("chat_sessions")
      .update({ messages, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_email", emailLower)
      .select()
      .single();

    if (error) {
      console.error("[DB] Supabase update session error:", error.message);
      throw new Error(error.message);
    }

    return {
      id: data.id,
      userEmail: data.user_email,
      title: data.title,
      messages: data.messages || [],
      modelMode: data.model_mode || "auto",
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      isSaved: true,
    };
  }

  const db = getLocalDB();
  const session = db.sessions.find(
    (s) => s.id === id && s.userEmail === emailLower
  );
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
  const client = sb();

  if (client) {
    const { error } = await client
      .from("chat_sessions")
      .delete()
      .eq("id", id)
      .eq("user_email", emailLower);

    if (error) {
      console.error("[DB] Supabase delete session error:", error.message);
      throw new Error(error.message);
    }
    return true;
  }

  const db = getLocalDB();
  const index = db.sessions.findIndex(
    (s) => s.id === id && s.userEmail === emailLower
  );
  if (index !== -1) {
    db.sessions.splice(index, 1);
    saveLocalDB(db);
    return true;
  }
  throw new Error("Chat session not found locally.");
}

// ---------------------------------------------------------------------------
// MEMORIES
// ---------------------------------------------------------------------------
export async function dbGetMemories(email: string) {
  const emailLower = email.toLowerCase().trim();
  const client = sb();

  if (client) {
    const { data, error } = await client
      .from("memories")
      .select("*")
      .eq("user_email", emailLower)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[DB] Supabase fetch memories error:", error.message);
      throw new Error(error.message);
    }

    return (data || []).map((m) => ({
      id: m.id,
      userEmail: m.user_email,
      key: m.key,
      content: m.content,
      createdAt: m.created_at,
    }));
  }

  const db = getLocalDB();
  return db.memories.filter((m) => m.userEmail === emailLower);
}

export async function dbCreateMemory(
  id: string,
  email: string,
  key: string,
  content: string
) {
  const emailLower = email.toLowerCase().trim();
  const client = sb();

  if (client) {
    const { data, error } = await client
      .from("memories")
      .insert({ id, user_email: emailLower, key, content })
      .select()
      .single();

    if (error) {
      console.error("[DB] Supabase create memory error:", error.message);
      throw new Error(error.message);
    }

    return {
      id: data.id,
      userEmail: data.user_email,
      key: data.key,
      content: data.content,
      createdAt: data.created_at,
    };
  }

  const db = getLocalDB();
  const newMemory = {
    id,
    userEmail: emailLower,
    key,
    content,
    createdAt: new Date().toISOString(),
  };
  db.memories.push(newMemory);
  saveLocalDB(db);
  return newMemory;
}

export async function dbDeleteMemory(id: string, email: string) {
  const emailLower = email.toLowerCase().trim();
  const client = sb();

  if (client) {
    const { error } = await client
      .from("memories")
      .delete()
      .eq("id", id)
      .eq("user_email", emailLower);

    if (error) {
      console.error("[DB] Supabase delete memory error:", error.message);
      throw new Error(error.message);
    }
    return true;
  }

  const db = getLocalDB();
  const index = db.memories.findIndex(
    (m) => m.id === id && m.userEmail === emailLower
  );
  if (index !== -1) {
    db.memories.splice(index, 1);
    saveLocalDB(db);
    return true;
  }
  throw new Error("Memory not found locally.");
}
