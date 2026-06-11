/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Plus, 
  Trash2, 
  Share2, 
  User, 
  Brain, 
  Code, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Globe, 
  Workflow, 
  FileUp, 
  LogOut, 
  Menu, 
  Sparkles, 
  Check, 
  Clock, 
  Settings, 
  ShieldCheck, 
  HelpCircle, 
  X,
  FileText,
  AlertTriangle,
  RotateCw,
  Copy,
  Mic,
  MicOff
} from 'lucide-react';
import { ChatSession, Message, DynamicModel, UserProfile, Artifact } from '../types';

interface ChatInterfaceProps {
  user: UserProfile | null;
  onLogout: () => void;
  onOpenDashboard: () => void;
  onOpenAuth: () => void;
  guestToken: string;
}

export default function ChatInterface({ 
  user, 
  onLogout, 
  onOpenDashboard, 
  onOpenAuth,
  guestToken 
}: ChatInterfaceProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [models, setModels] = useState<DynamicModel[]>([]);
  const [selectedModelMode, setSelectedModelMode] = useState<string>('auto');
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [guestCount, setGuestCount] = useState(0);
  const [isLimitBlocked, setIsLimitBlocked] = useState(false);
  const [copyingMessageId, setCopyingMessageId] = useState<string | null>(null);

  // Speech recognition states
  const [isRecording, setIsRecording] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [showMicPermissionModal, setShowMicPermissionModal] = useState(false);
  const [permissionModalError, setPermissionModalError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Attachment states
  const [fileAttachment, setFileAttachment] = useState<{name: string, type: string, base64: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, []);

  useEffect(() => {
    fetchModels();
    fetchSessions();
    checkLimits();
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkLimits = async () => {
    try {
      const response = await fetch('/api/security/check-guest-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestToken }),
      });
      if (response.ok) {
        const data = await response.json();
        setGuestCount(data.currentCount);
        if (!user && data.currentCount >= 1) {
          setIsLimitBlocked(true);
        } else {
          setIsLimitBlocked(false);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/models');
      if (response.ok) {
        const data = await response.json();
        setModels(data);
      }
    } catch (err) {
      console.error("Could not fetch platform models", err);
    }
  };

  const fetchSessions = async () => {
    const headers: HeadersInit = {};
    if (user) {
      headers['Authorization'] = `Bearer ${user.email}`;
    }
    try {
      const response = await fetch('/api/chats', { headers });
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
        if (data.length > 0) {
          setActiveSession(data[0]);
        } else {
          // Initialize fresh temporary local session for Guest
          initFreshSession();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const initFreshSession = () => {
    const newSess: ChatSession = {
      id: `sess-temp-${Date.now()}`,
      title: 'Dynamic Sandbox Topic',
      messages: [
        {
          id: 'welcome-0',
          role: 'assistant',
          content: `### Welcome to SARDYX AI Platform

Unified cognitive assistant router. Built cleanly with a dark glassmorphism layout.

#### Dynamic Handshake Routing Capabilities:
*   🔑 **Unified AI Routing Key**: Type prompts naturally. The backend detects task intent (coding, reasoning, vision OCR, search grounding, art/video vectors) instantly.
*   ⚡ **Self-Hosted Integrations**: Powered through custom APIs with robust local sandbox guarantees.
*   🛡️ **Memory Sync**: Sign in via Google to persistence notes and saved chats across devices.

*Created under directives from **Sardar Abdullah Fazal***`,
          timestamp: new Date().toISOString(),
          modelUsed: 'SardyX Conversational-X',
          thoughts: ['Core identity vectors initialized.', 'Displaying attribution details for Sardar Abdullah Fazal.']
        }
      ],
      modelMode: 'auto',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSaved: false
    };
    setActiveSession(newSess);
  };

  const handleCreateNewChat = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.email}`
        },
        body: JSON.stringify({ title: 'New Conversation', modelMode: selectedModelMode }),
      });
      if (response.ok) {
        const newSess = await response.json();
        setSessions([newSess, ...sessions]);
        setActiveSession(newSess);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (id.startsWith('sess-temp-')) {
      initFreshSession();
      return;
    }
    try {
      const response = await fetch(`/api/chats/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user!.email}`
        }
      });
      if (response.ok) {
        const filtered = sessions.filter(s => s.id !== id);
        setSessions(filtered);
        if (activeSession?.id === id) {
          if (filtered.length > 0) {
            setActiveSession(filtered[0]);
          } else {
            initFreshSession();
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Please upload a file smaller than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFileAttachment({
        name: file.name,
        type: file.type,
        base64: reader.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  const getUserMediaWithRetry = async (retries = 2, delay = 1000): Promise<MediaStream> => {
    for (let i = 0; i <= retries; i++) {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          return await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        // Fallback for legacy webkit / moz prefixes
        const legacyGetUserMedia = (navigator as any).getUserMedia || 
                                    (navigator as any).webkitGetUserMedia || 
                                    (navigator as any).mozGetUserMedia || 
                                    (navigator as any).msGetUserMedia;
        if (legacyGetUserMedia) {
          return await new Promise<MediaStream>((resolve, reject) => {
            legacyGetUserMedia.call(navigator, { audio: true }, resolve, reject);
          });
        }
        throw new Error("No microphone support detected in this browser's security context.");
      } catch (err) {
        if (i === retries) {
          throw err;
        }
        console.warn(`[SILENT RETRY] Microphone access attempt ${i + 1} failed, retrying in ${delay}ms...`, err);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error("Failed to initialize audio input after retries");
  };

  const requestMicrophonePermission = async () => {
    setPermissionModalError(null);
    try {
      // Prompt high-fidelity browser dialog via our silent retry getUserMedia helper
      const stream = await getUserMediaWithRetry(2, 500);
      // Clean up track streams right after permission verify
      stream.getTracks().forEach(track => track.stop());
      
      setShowMicPermissionModal(false);
      toggleSpeechRecognition();
    } catch (err: any) {
      console.error("Microphone browser query error: ", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionModalError("Permission was explicitly denied. Please adjust your browser settings (look for the key/camera icon in the address bar) to allow microphone access, and then reload the page.");
      } else {
        setPermissionModalError(`Interactive device failed: ${err.message || "Microphone hardware was blocked or not detected. Adjust system privacy controls."}`);
      }
    }
  };

  const handleMicClick = async () => {
    if (isRecording) {
      toggleSpeechRecognition();
      return;
    }

    setPermissionModalError(null);

    // query permission status if supported natively
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (result.state === 'granted') {
          toggleSpeechRecognition();
        } else {
          setShowMicPermissionModal(true);
        }
      } catch (e) {
        setShowMicPermissionModal(true);
      }
    } else {
      setShowMicPermissionModal(true);
    }
  };

  const toggleSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError("Speech recognition is not supported in this browser. Try Chrome, Safari, or Edge.");
      setTimeout(() => setSpeechError(null), 4000);
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error("Error stopping recognition", e);
        }
      }
      setIsRecording(false);
    } else {
      setSpeechError(null);
      try {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'en-US';

        rec.onstart = () => {
          setIsRecording(true);
        };

        rec.onerror = (event: any) => {
          console.error("Speech recognition error:", event);
          setIsRecording(false);
          const errMessage = event.error === 'not-allowed' 
            ? 'Permission denied. Please allow microphone access.' 
            : `Error: ${event.error}`;
          setSpeechError(errMessage);
          setTimeout(() => setSpeechError(null), 5000);
        };

        rec.onend = () => {
          setIsRecording(false);
        };

        rec.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setInputPrompt((prev) => {
              const trimmed = prev.trim();
              return trimmed ? `${trimmed} ${transcript}` : transcript;
            });
          }
        };

        recognitionRef.current = rec;
        rec.start();
      } catch (err: any) {
        console.error("Failed to start speech recognition:", err);
        setSpeechError(`Failed to initialize: ${err.message || err}`);
        setTimeout(() => setSpeechError(null), 4000);
        setIsRecording(false);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim() && !fileAttachment) return;

    if (!user && guestCount >= 1) {
      setIsLimitBlocked(true);
      onOpenAuth();
      return;
    }

    const promptText = inputPrompt;
    setInputPrompt('');
    setLoading(true);

    const userMsgId = `msg-user-${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: promptText,
      timestamp: new Date().toISOString(),
      attachments: fileAttachment ? [{
        type: fileAttachment.type,
        name: fileAttachment.name,
        base64: fileAttachment.base64
      }] : []
    };

    // Store in active output state instantly
    const updatedMessages = [...(activeSession?.messages || []), userMsg];
    const prevSession = activeSession;
    
    if (activeSession) {
      setActiveSession({
        ...activeSession,
        messages: updatedMessages
      });
    }

    setFileAttachment(null);

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (user) {
        headers['Authorization'] = `Bearer ${user.email}`;
      }

      const response = await fetch(`/api/chats/${activeSession?.id || 'sandbox'}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: userMsg,
          guestToken,
          modelMode: selectedModelMode
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        if (user && result.session) {
          // Sync sessions lists
          setSessions(sessions.map(s => s.id === result.session.id ? result.session : s));
          setActiveSession(result.session);
        } else {
          // Sync sandbox
          if (activeSession) {
            setActiveSession({
              ...activeSession,
              messages: [...updatedMessages, result.message]
            });
          }
        }
        
        // Refresh limits
        checkLimits();
      } else {
        const errorData = await response.json();
        if (errorData.error === 'GUEST_LIMIT_REACHED') {
          setIsLimitBlocked(true);
          onOpenAuth();
        }
        alert(errorData.message || 'Cognitive pipeline ran into structural error state.');
        // Revert prompt text so user doesn't lose it
        setInputPrompt(promptText);
      }
    } catch (err) {
      console.error(err);
      setInputPrompt(promptText);
    } finally {
      setLoading(false);
    }
  };

  const regenerateLastResponse = async () => {
    if (!activeSession || activeSession.messages.length < 2) return;
    
    // Find last user message
    const msgs = [...activeSession.messages];
    let lastUserIndex = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }

    if (lastUserIndex === -1) return;

    // Slice history up to user message, removing the bad/old bot answer
    const cleanedMsgs = msgs.slice(0, lastUserIndex + 1);
    const lastUserMsg = msgs[lastUserIndex];

    setActiveSession({
      ...activeSession,
      messages: cleanedMsgs
    });

    setLoading(true);

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (user) {
        headers['Authorization'] = `Bearer ${user.email}`;
      }

      const response = await fetch(`/api/chats/${activeSession.id}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: lastUserMsg,
          guestToken,
          modelMode: selectedModelMode
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (user && result.session) {
          setSessions(sessions.map(s => s.id === result.session.id ? result.session : s));
          setActiveSession(result.session);
        } else {
          setActiveSession({
            ...activeSession,
            messages: [...cleanedMsgs, result.message]
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteIndividualMessage = (msgId: string) => {
    if (!activeSession) return;
    const filteredMsgs = activeSession.messages.filter(m => m.id !== msgId);
    setActiveSession({
      ...activeSession,
      messages: filteredMsgs
    });
    // In background, let user save if synced
    if (user && !activeSession.id.startsWith('sess-temp-')) {
      fetch(`/api/chats/${activeSession.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.email}`
        },
        body: JSON.stringify({ messages: filteredMsgs })
      }).catch(err => console.error(err));
    }
  };

  const copyMessageText = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopyingMessageId(msgId);
    setTimeout(() => setCopyingMessageId(null), 1500);
  };

  const exportConversationLog = () => {
    if (!activeSession) return;
    const plainText = activeSession.messages.map(m => `[${m.role.toUpperCase()} - ${new Date(m.timestamp).toLocaleTimeString()}] ${m.content}`).join('\n\n');
    const blob = new Blob([plainText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sardyx_session_${activeSession.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="playground-interface-root" className="h-screen bg-[#050505] text-zinc-250 font-sans flex overflow-hidden">
      
      {/* SIDEBAR NAVIGATION */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-80' : 'w-0'
        } transition-all duration-300 md:flex flex-col shrink-0 bg-[#0a0a0a] border-r border-white/5 overflow-hidden relative z-30`}
      >
        <div className="flex flex-col h-full bg-[#0a0a0a] p-4 justify-between">
          <div className="space-y-6">
            {/* Header Identity */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/15 shrink-0">
                  <span className="text-black font-extrabold text-xs">S</span>
                </div>
                <span className="text-sm font-bold tracking-tight text-white">SARDYX <span className="text-indigo-400">AI</span></span>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 rounded-lg border border-white/5 hover:border-white/10 text-zinc-400 hover:text-white md:hidden cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Action Trigger */}
            <button
              onClick={handleCreateNewChat}
              className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border border-white/10 hover:border-white/20 font-medium text-xs rounded-xl flex items-center justify-center gap-2 group transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
              Start New Flow
            </button>

            {/* Sessions Scroll List */}
            <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest pl-1">Chats Inventory</span>
              
              {sessions.length === 0 && (
                <div className="p-3 text-[11px] font-mono text-zinc-650 italic border border-dashed border-white/5 rounded-xl">
                  Sandbox active. Sign up to cache history.
                </div>
              )}

              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  onClick={() => {
                    setActiveSession(sess);
                    setSelectedModelMode(sess.modelMode);
                  }}
                  className={`group p-3 rounded-xl border flex items-center justify-between gap-2.5 text-xs transition-all cursor-pointer ${
                    activeSession?.id === sess.id 
                      ? 'bg-white/[0.02] border-white/10 text-indigo-400 shadow-sm' 
                      : 'bg-transparent border-transparent hover:border-white/5 hover:bg-white/[0.01] text-zinc-400 hover:text-zinc-250'
                  }`}
                >
                  <div className="flex items-center gap-2 max-w-[80%]">
                    <Clock className="w-3.5 h-3.5 text-zinc-600 shrink-0 group-hover:text-zinc-450" />
                    <span className="truncate font-light text-zinc-300 group-hover:text-white">
                      {sess.title}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(sess.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-550 hover:text-red-450 transition-opacity cursor-pointer duration-200"
                    title="Delete Conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* User Profile Footer section */}
          <div className="border-t border-white/5 pt-4 mt-auto space-y-3.5">
            {user ? (
              <div className="flex items-center justify-between gap-2 bg-white/[0.01] border border-white/5 p-2.5 rounded-2xl">
                <div className="flex items-center gap-2.5 truncate max-w-[70%]">
                  <img 
                    src={user.avatarUrl || "https://api.dicebear.com/7.x/bottts/svg"} 
                    alt={user.name} 
                    className="w-7 h-7 rounded-lg border border-indigo-500/20 bg-black shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="truncate">
                    <span className="block text-xs font-semibold text-zinc-200 truncate">{user.name}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={onOpenDashboard}
                    className="p-1 px-1.5 hover:bg-zinc-850 border border-white/5 text-zinc-450 hover:text-white rounded-lg cursor-pointer transition-colors"
                    title="Open settings dashboard details"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={onLogout}
                    className="p-1 px-1.5 hover:bg-red-950/10 border border-white/5 hover:border-red-900/20 text-zinc-500 hover:text-red-400 rounded-lg cursor-pointer transition-colors"
                    title="Disengage session"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-indigo-950/20 border border-indigo-900/20 rounded-2xl text-center space-y-2.5">
                <span className="text-[10px] font-mono text-indigo-300 uppercase block tracking-wider font-semibold">Limited Guest Sandbox</span>
                <p className="text-[10px] text-zinc-400 leading-normal font-light">
                  Query limits are tracked. Sync custom instructions dynamically.
                </p>
                <button
                  onClick={onOpenAuth}
                  className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  Verify Single Sign-In
                </button>
              </div>
            )}

            {/* System Status Indicators */}
            <div className="flex justify-between items-center text-[9px] font-mono text-zinc-650 pt-1.5 border-t border-white/[0.02] pl-1">
              <span>SARDYX COGNITIVE V1.1</span>
              <span className="flex items-center gap-1 text-emerald-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                ONLINE
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* CORE WORKSPACE SECTION */}
      <main className="flex-1 flex flex-col justify-between overflow-hidden relative z-20 bg-[#050505]">
        
        {/* INTERFACE TOP HEADER BAR */}
        <header id="chat-header-bar" className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#050505]/60 backdrop-blur-md relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 border border-white/5 hover:border-white/10 rounded-lg text-zinc-400 hover:text-white md:hidden cursor-pointer shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-zinc-200">
                {activeSession ? activeSession.title : 'Playground Sandbox'}
              </span>
              <span className="text-[9px] font-mono text-zinc-550 block mt-0.5">
                ACTIVE PIPELINE: AUTO DYNAMIC ROUTER
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Dynamic model mode toggle selector */}
            <select
              value={selectedModelMode}
              onChange={(e: any) => setSelectedModelMode(e.target.value)}
              className="bg-zinc-900 border border-white/10 focus:border-indigo-500 px-3 py-1.5 rounded-xl text-[10px] font-mono text-zinc-100 outline-none transition-all cursor-pointer"
            >
              <option value="auto">🤖 Auto router</option>
              {models.map((m) => {
                const icon = m.iconName === 'brain' ? '🧠' : m.iconName === 'code' ? '💻' : m.iconName === 'eye' ? '👁️' : m.iconName === 'palette' ? '🎨' : m.iconName === 'video' ? '📹' : '💬';
                return (
                  <option key={m.id} value={m.id}>
                    {icon} {m.name}
                  </option>
                );
              })}
            </select>

            <button
              onClick={exportConversationLog}
              className="p-1 px-[7px] border border-white/5 hover:border-white/10 text-zinc-400 hover:text-white rounded-lg cursor-pointer transition-all"
              title="Export Conversation Log"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* MESSAGES LOG CONSOLE */}
        <section id="chat-messages-scroll" className="flex-1 overflow-y-auto px-6 py-8 space-y-6 relative z-0">
          
          {/* Guest message limits notification banner */}
          {!user && guestCount >= 1 && (
            <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-900/40 max-w-2xl mx-auto text-xs text-indigo-300 space-y-2 text-center animate-fade-in">
              <AlertTriangle className="w-5 h-5 text-indigo-400 mx-auto animate-bounce" />
              <p className="font-semibold block text-zinc-150">Sandbox Guest Query Limit Met</p>
              <p className="font-light">
                To keep server allocations healthy, we allow unregistered browsers exactly 1 sandbox message. Further inputs are locked until you authorize single sign-in.
              </p>
              <button
                onClick={onOpenAuth}
                className="mt-2.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 hover:text-white text-xs font-medium rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/15"
              >
                Sign In instantly with Google
              </button>
            </div>
          )}

          <div className="max-w-3xl mx-auto space-y-6">
            {activeSession?.messages.map((msg, idx) => (
              <div 
                key={msg.id || idx} 
                className={`flex gap-4 items-start animate-fade-in ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role !== 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-black font-extrabold shrink-0 shadow-lg shadow-indigo-500/10">
                    S
                  </div>
                )}

                <div className={`p-5 rounded-2xl border flex flex-col justify-between gap-1.5 leading-relaxed text-xs sm:text-sm max-w-[85%] relative group ${
                  msg.role === 'user' 
                    ? 'bg-zinc-900/60 border-white/5 text-zinc-100' 
                    : 'bg-[#0a0a0a] border-white/5 text-zinc-200'
                }`}>
                  
                  {/* Action overlays internally in bubbles */}
                  <div className="absolute right-3.5 top-3.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-black border border-[#1a1a1a] p-1.5 rounded-lg">
                    <button 
                      onClick={() => copyMessageText(msg.id, msg.content)}
                      className="p-1 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
                      title="Copy message contents"
                    >
                      {copyingMessageId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    {idx > 0 && (
                      <button 
                        onClick={() => deleteIndividualMessage(msg.id)}
                        className="p-1 text-zinc-400 hover:text-red-400 rounded transition-colors cursor-pointer"
                        title="Delete individual log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Multi-step Agent Thought blocks */}
                  {msg.thoughts && msg.thoughts.length > 0 && (
                    <details className="mb-4 bg-black border border-white/5 p-3.5 rounded-xl cursor-pointer">
                      <summary className="text-[10px] font-mono text-indigo-400 tracking-wide uppercase font-semibold flex items-center gap-1">
                        <Workflow className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                        <span>Autonomous Routing Steps ({msg.thoughts.length})</span>
                      </summary>
                      <div className="mt-2.5 space-y-1.5 pl-4 border-l border-indigo-900/40 text-[11px] font-mono text-zinc-550 leading-normal">
                        {msg.thoughts.map((th, thIdx) => (
                          <div key={thIdx} className="flex gap-1">
                            <span className="text-indigo-600 font-bold">&gt;</span>
                            <p>{th}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Attachment indicator block inside message */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mb-3 flex items-center gap-2.5 p-2 bg-black rounded-xl border border-white/5 max-w-sm">
                      <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div className="truncate text-xs font-mono max-w-[80%]">
                        <span className="text-zinc-300 truncate block font-semibold">{msg.attachments[0].name}</span>
                        <span className="text-[10px] text-zinc-500 uppercase">{msg.attachments[0].type.split("/")[1] || "DOCUMENT"}</span>
                      </div>
                    </div>
                  )}

                  {/* MAIN Markdowns output renderer with manual styling */}
                  <div className="whitespace-pre-wrap font-light text-zinc-200 leading-relaxed text-xs sm:text-sm">
                    {msg.content}
                  </div>

                  {/* RENDER MEDIA ARTIFACTS IF COMPLETED FROM BACKEND */}
                  {msg.artifacts && msg.artifacts.map((art, artIdx) => (
                    <div key={artIdx} className="mt-4 p-1.5 bg-black border border-white/5 rounded-2xl max-w-md">
                      {art.type === 'image' && (
                        <div className="overflow-hidden rounded-xl border border-white/5">
                          <img 
                            src={art.url} 
                            alt={art.title || "Calculated Render"} 
                            className="w-full h-auto object-cover max-h-[300px]"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                      {art.type === 'video' && (
                        <div className="overflow-hidden rounded-xl border border-white/5 relative">
                          <video 
                            src={art.url} 
                            controls 
                            className="w-full h-auto max-h-[240px]"
                            poster="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&h=300"
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* SEARCH CITATIONS BLOCK */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <span className="text-[10px] font-mono tracking-wide text-cyan-400 uppercase font-semibold flex items-center gap-1 mb-2">
                        <Globe className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Referenced Web Citations</span>
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {msg.citations.map((cite, citeIdx) => (
                          <a 
                            key={citeIdx} 
                            href={cite.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="p-2 border border-white/5 bg-black rounded-xl hover:border-cyan-900/30 transition-all text-xs flex flex-col justify-between"
                          >
                            <span className="font-semibold text-zinc-100 truncate pr-4">{cite.title}</span>
                            <span className="text-[10px] text-zinc-500 truncate block mt-0.5">{cite.url}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Metadata display at footer of bubbles */}
                  <div className="flex items-center gap-3.5 text-[9px] font-mono text-zinc-500 mt-3 pt-2.5 border-t border-white/5 select-none">
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {msg.modelUsed && (
                      <span className="px-1.5 rounded bg-zinc-900 text-indigo-400 font-semibold border border-white/5">
                        {msg.modelUsed}
                      </span>
                    )}
                    {msg.durationMs && (
                      <span className="text-zinc-650 block sm:inline">Inference: {msg.durationMs}ms</span>
                    )}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs shrink-0 select-none text-white">
                    {user ? user.name.substring(0, 1).toUpperCase() : 'U'}
                  </div>
                )}
              </div>
            ))}

            {/* Waiting loader feedback details */}
            {loading && (
              <div className="flex gap-4 items-start animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-black font-extrabold shrink-0">
                  S
                </div>
                <div className="p-5 rounded-2xl border bg-[#0a0a0a] border-white/5 text-zinc-300 max-w-[85%] space-y-2 w-full">
                  <div className="flex items-center gap-2 font-mono text-[10px] text-indigo-400">
                    <Workflow className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                    <span>Analyzing intents. Orchestrating neural parameters...</span>
                  </div>
                  <div className="h-4 bg-zinc-900 rounded-md w-[80%] my-3"></div>
                  <div className="h-4 bg-zinc-900 rounded-md w-[50%]"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </section>

        {/* INPUT LAYOUT CONTROLLER */}
        <section id="chat-input-layout" className="p-6 border-t border-white/5 bg-[#050505] shrink-0">
          <div className="max-w-3xl mx-auto space-y-3 relative">
            
            {/* Displaying attachment preview state if selected */}
            {fileAttachment && (
              <div className="absolute top-[-58px] left-0 right-0 p-2.5 bg-[#0a0a0a] border border-white/10 rounded-xl flex items-center justify-between shadow-xl max-w-sm animate-fade-in">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs text-zinc-300 truncate max-w-[200px]">{fileAttachment.name}</span>
                </div>
                <button 
                  onClick={() => setFileAttachment(null)}
                  className="p-1 hover:text-white text-zinc-400 hover:bg-zinc-800 rounded-lg cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Displaying speech recognition error or notice if set */}
            {speechError && (
              <div 
                style={{ top: fileAttachment ? '-110px' : '-58px' }}
                className="absolute left-0 right-0 p-2.5 bg-red-950/40 border border-red-900/30 rounded-xl flex items-center justify-between shadow-xl max-w-sm animate-fade-in z-20"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-xs text-red-200">{speechError}</span>
                </div>
                <button 
                  onClick={() => setSpeechError(null)}
                  className="p-1 hover:text-white text-zinc-455 hover:bg-zinc-850 rounded-lg cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Real-time speech status indicator */}
            {isRecording && (
              <div className="absolute top-[-44px] left-1/2 -translate-x-1/2 bg-red-950/90 border border-red-500/30 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-3 shadow-xl z-20 animate-fade-in">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-550"></span>
                </span>
                <span className="text-[10px] font-mono font-bold tracking-wider text-red-200">SARDYX ACTIVE SPEECH</span>
                <div className="flex gap-0.5 items-end justify-center h-3 w-8">
                  <div className="w-0.5 bg-red-400 rounded-full animate-bounce h-2" style={{ animationDelay: '0.1s', animationDuration: '0.7s' }}></div>
                  <div className="w-0.5 bg-red-400 rounded-full animate-bounce h-3" style={{ animationDelay: '0.2s', animationDuration: '0.5s' }}></div>
                  <div className="w-0.5 bg-red-450 rounded-full animate-bounce h-1.5" style={{ animationDelay: '0.3s', animationDuration: '0.8s' }}></div>
                  <div className="w-0.5 bg-red-400 rounded-full animate-bounce h-3.5" style={{ animationDelay: '0s', animationDuration: '0.6s' }}></div>
                  <div className="w-0.5 bg-red-400 rounded-full animate-bounce h-2" style={{ animationDelay: '0.4s', animationDuration: '0.7s' }}></div>
                </div>
              </div>
            )}

            {/* Injected model fallback warning if limits met */}
            {isLimitBlocked ? (
              <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-2xl flex items-center justify-between text-xs text-red-300 animate-fade-in">
                <span>Free Sandbox Limit Exceeded. Open account to proceed.</span>
                <button
                  onClick={onOpenAuth}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all cursor-pointer text-[11px]"
                >
                  Verify Google Token
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="relative z-10 flex items-center gap-2 border border-white/5 bg-zinc-900/40 hover:border-white/10 p-2 rounded-2xl focus-within:border-indigo-500 transition-all">
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".png,.jpg,.jpeg,.webp,.pdf,.docx,.txt,.csv,.xlsx"
                  className="hidden"
                />
                
                <button
                  type="button"
                  onClick={handleFileUploadClick}
                  className="p-2.5 bg-black border border-white/5 hover:border-white/10 text-zinc-400 hover:text-white rounded-xl cursor-pointer transition-colors"
                  title="Upload diagram scan or raw text (doc, txt, csv, spreadsheet, pdf)"
                >
                  <FileUp className="w-4 h-4 text-zinc-400" />
                </button>

                <input
                  type="text"
                  placeholder={isRecording ? "🎙️ Listening... speak clearly to SARDYX AI" : "Ask SARDYX AI or prompt to generate code, art or videos..."}
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  disabled={loading}
                  className="w-full bg-transparent px-2.5 py-3 text-sm text-zinc-100 placeholder-zinc-550 outline-none w-full"
                />

                <button
                  type="button"
                  onClick={handleMicClick}
                  className={`p-2.5 border rounded-xl cursor-pointer transition-all shrink-0 ${
                    isRecording 
                      ? "bg-red-650 border-red-500 text-white animate-pulse" 
                      : "bg-black border-white/5 hover:border-white/10 text-zinc-400 hover:text-white"
                  }`}
                  title={isRecording ? "Stop listening" : "Voice to text (Microphone)"}
                  disabled={loading}
                >
                  {isRecording ? (
                    <MicOff className="w-4 h-4 text-white" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>

                <button
                  type="submit"
                  disabled={loading || (!inputPrompt.trim() && !fileAttachment)}
                  className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-950 disabled:border-white/5 disabled:text-zinc-650 text-white rounded-xl shrink-0 cursor-pointer shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Footer diagnostic logs */}
            <div className="flex flex-wrap justify-between items-center text-[10px] text-zinc-650 font-mono tracking-wider pt-1 p-1">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                🛡️ Creator: Sardar Abdullah Fazal
              </span>
              <div className="flex gap-4">
                {activeSession && activeSession.messages.length > 2 && (
                  <button 
                    onClick={regenerateLastResponse}
                    disabled={loading}
                    className="hover:text-zinc-400 flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <RotateCw className="w-3 h-3" />
                    Regenerate response
                  </button>
                )}
                <span>Unified API Proxy active</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Custom Voice & Microphone Permission Explainer Modal */}
      {showMicPermissionModal && (
        <div 
          id="mic-permission-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050505]/90 backdrop-blur-md animate-fade-in"
          onClick={() => setShowMicPermissionModal(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="relative w-full max-w-md p-8 rounded-3xl bg-[#0a0a0a] border border-white/10 shadow-2xl overflow-hidden"
          >
            {/* Decorative glowing gradient backdrop matching other modals */}
            <div className="absolute top-[-20%] left-[-20%] w-[150px] h-[150px] bg-red-650/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-[-10%] right-[-1%] w-[150px] h-[150px] bg-indigo-550/10 rounded-full blur-2xl"></div>

            {/* Close button */}
            <button 
              onClick={() => setShowMicPermissionModal(false)}
              className="absolute top-4 right-4 p-1.5 hover:text-white text-zinc-400 hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header icon and title */}
            <div className="text-center relative z-10 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-indigo-550 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20 mx-auto mb-4 animate-pulse">
                <Mic className="text-black w-5 h-5 font-bold" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white mb-2">
                Enable Voice Typing Input
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm">
                SARDYX AI utilizes your microphone to transcribe real-time voice messages locally in the browser.
              </p>
            </div>

            {/* Permission Benefits & Offline Security assurances */}
            <div className="space-y-4 mb-6 relative z-10">
              <div className="p-3.5 rounded-xl bg-zinc-900/30 border border-white/5 space-y-3">
                <div className="flex gap-3 items-start text-xs text-zinc-300">
                  <span className="w-2 px-1 text-indigo-500 font-bold">•</span>
                  <div>
                    <span className="font-semibold text-white block">Offline Transcription Security</span>
                    All voice data is transcribed instantly inside your browser and is never stored, catalogued, or processed on external servers.
                  </div>
                </div>
                <div className="flex gap-3 items-start text-xs text-zinc-300">
                  <span className="w-2 px-1 text-indigo-500 font-bold">•</span>
                  <div>
                    <span className="font-semibold text-white block">Speed Prompt & Code Generation</span>
                    Compose complex code workflows, instructions, document summaries or art parameters naturally matching conversational speeds.
                  </div>
                </div>
                <div className="flex gap-3 items-start text-xs text-zinc-300">
                  <span className="w-2 px-1 text-indigo-500 font-bold">•</span>
                  <div>
                    <span className="font-semibold text-white block">Unified UI Status HUD</span>
                    A real-time active status waveform notifier appears inside your input bar to track exact sensing and recording feedback.
                  </div>
                </div>
              </div>

              {/* Dynamic Interactive Errors (if blocked previously) */}
              {permissionModalError && (
                <div className="p-3.5 rounded-xl bg-red-955/40 border border-red-900/40 text-[11px] text-red-300 animate-fade-in flex flex-col gap-2">
                  <span className="font-semibold text-red-200 block">System Access Restrained</span>
                  <p className="leading-relaxed">{permissionModalError}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 relative z-10">
              <button
                onClick={() => setShowMicPermissionModal(false)}
                className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-300 hover:text-white font-semibold text-xs rounded-xl transition-all cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                onClick={requestMicrophonePermission}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all cursor-pointer text-center"
              >
                Allow Access
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
