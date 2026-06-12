-- =============================================================
-- SARDYX AI — Supabase Database Setup
-- Run this in Supabase → SQL Editor → New Query
-- =============================================================

-- ── chat_sessions table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id           TEXT        PRIMARY KEY,
  user_email   TEXT        NOT NULL,
  title        TEXT        NOT NULL DEFAULT 'New Conversation',
  messages     JSONB       NOT NULL DEFAULT '[]'::jsonb,
  model_mode   TEXT        NOT NULL DEFAULT 'auto',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_email ON public.chat_sessions (user_email);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON public.chat_sessions (updated_at DESC);

-- ── memories table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.memories (
  id           TEXT        PRIMARY KEY,
  user_email   TEXT        NOT NULL,
  key          TEXT        NOT NULL,
  content      TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memories_user_email ON public.memories (user_email);

-- ── RLS — Enable Row Level Security ─────────────────────────
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories      ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies for chat_sessions ─────────────────────────
-- Service role bypasses RLS automatically — these allow backend access
DROP POLICY IF EXISTS "service_role_all_chat_sessions" ON public.chat_sessions;
CREATE POLICY "service_role_all_chat_sessions"
  ON public.chat_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── RLS Policies for memories ────────────────────────────────
DROP POLICY IF EXISTS "service_role_all_memories" ON public.memories;
CREATE POLICY "service_role_all_memories"
  ON public.memories
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Confirm ──────────────────────────────────────────────────
SELECT 
  schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('chat_sessions', 'memories');

-- ── guest_limits table for tracking guest user message counts ──
CREATE TABLE IF NOT EXISTS public.guest_limits (
  identifier   TEXT        PRIMARY KEY,
  message_count INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.guest_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_guest_limits" ON public.guest_limits;
CREATE POLICY "service_role_all_guest_limits"
  ON public.guest_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

