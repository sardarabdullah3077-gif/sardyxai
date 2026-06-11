/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'user' | 'assistant' | 'system';

export interface Citation {
  title: string;
  url: string;
  snippet: string;
}

export interface Artifact {
  type: 'image' | 'video' | 'code' | 'file' | 'search-results';
  url?: string;
  data?: string; // base64, markdown, or code string
  title?: string;
  mimeType?: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: string;
  modelUsed?: string;
  durationMs?: number;
  thoughts?: string[]; // Agent multi-step planning and thoughts
  citations?: Citation[]; // Web search citations
  artifacts?: Artifact[];
  attachments?: { type: string; name: string; base64: string }[];
  isSearchingWeb?: boolean;
  isGeneratingMedia?: boolean;
}

export type ModelCategory = 
  | 'Chat Models'
  | 'Reasoning Models'
  | 'Coding Models'
  | 'Vision Models'
  | 'Image Models'
  | 'Video Models'
  | 'Embedding Models';

export interface DynamicModel {
  id: string;
  name: string;
  category: ModelCategory;
  isAvailable: boolean;
  provider: string;
  description: string;
  iconName: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  modelMode: string;
  createdAt: string;
  updatedAt: string;
  isSaved: boolean;
}

export interface UserMemory {
  id: string;
  key: string;
  content: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'user';
  createdAt: string;
  avatarUrl?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  type: 'auth' | 'chat' | 'info' | 'error' | 'security';
  message: string;
  userEmail?: string;
  ipAddress?: string;
  details?: string;
}

export interface SystemHealthMetrics {
  freeLlmStatus: 'healthy' | 'unhealthy' | 'unknown';
  geminiStatus: 'healthy' | 'unhealthy' | 'unknown';
  apiLatencyMs: number;
  requestsTotal: number;
  rateLimitHits: number;
}
