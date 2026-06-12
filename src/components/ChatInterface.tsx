/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import sardyxLogo from '../assets/images/sx_logo.jpg';
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
  X,
  FileText,
  AlertTriangle,
  RotateCw,
  Copy,
  Mic,
  MicOff,
  MoreVertical,
  Volume2,
  Square,
  Lock,
  ArrowRight
} from 'lucide-react';
import { ChatSession, Message, DynamicModel, UserProfile, Artifact } from '../types';
import MessageBubble from './MessageBubble';
import ChatInput, { ChatInputRef } from './ChatInput';

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
  const [loading, setLoading] = useState(false);
  const chatInputRef = useRef<ChatInputRef>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(typeof window !== "undefined" && window.innerWidth >= 768);
  const [guestCount, setGuestCount] = useState(0);
  const [isLimitBlocked, setIsLimitBlocked] = useState(false);
  const [copyingMessageId, setCopyingMessageId] = useState<string | null>(null);

  // Speech recognition states
  const [isRecording, setIsRecording] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [showMicPermissionModal, setShowMicPermissionModal] = useState(false);
  const [permissionModalError, setPermissionModalError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Text-to-speech states
  const [readingMessageId, setReadingMessageId] = useState<string | null>(null);
  const [openMenuMessageId, setOpenMenuMessageId] = useState<string | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

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

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (readingMessageId) {
        window.speechSynthesis.cancel();
      }
    };
  }, [readingMessageId]);

  // Close menu when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (openMenuMessageId && !target.closest('[data-menu-container]') && !target.closest('button[title="Message options"]')) {
        setOpenMenuMessageId(null);
      }
    };

    if (openMenuMessageId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuMessageId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Detect text language - Urdu, Hindi, or English
  const detectLanguage = (text: string): string => {
    // Check for Urdu script (Arabic/Persian characters)
    const urduPattern = /[\u0600-\u06FF]/g;
    const urduMatches = text.match(urduPattern) || [];
    
    // Check for Hindi script (Devanagari characters)
    const hindiPattern = /[\u0900-\u097F]/g;
    const hindiMatches = text.match(hindiPattern) || [];
    
    const totalChars = text.length;
    const urduRatio = urduMatches.length / totalChars;
    const hindiRatio = hindiMatches.length / totalChars;
    
    // If more than 20% of text is in Urdu script
    if (urduRatio > 0.2) {
      return 'ur-PK'; // Urdu (Pakistan)
    }
    
    // If more than 20% of text is in Hindi script
    if (hindiRatio > 0.2) {
      return 'hi-IN'; // Hindi (India)
    }
    
    // Default to English
    return 'en-US';
  };

  // Strip markdown syntax for clean text-to-speech
  const cleanMarkdownForSpeech = (text: string): string => {
    let cleaned = text;
    
    // Remove heading markers (# ## ### etc)
    cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
    
    // Remove bold and italic markers (**text** or __text__)
    cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1');
    cleaned = cleaned.replace(/__(.+?)__/g, '$1');
    
    // Remove italic markers (*text* or _text_)
    cleaned = cleaned.replace(/\*(.+?)\*/g, '$1');
    cleaned = cleaned.replace(/_(.+?)_/g, '$1');
    
    // Remove strikethrough (~~text~~)
    cleaned = cleaned.replace(/~~(.+?)~~/g, '$1');
    
    // Remove inline code backticks (`code`)
    cleaned = cleaned.replace(/`(.+?)`/g, '$1');
    
    // Convert markdown links [text](url) to just text
    cleaned = cleaned.replace(/\[(.+?)\]\(.+?\)/g, '$1');
    
    // Remove blockquote markers (>)
    cleaned = cleaned.replace(/^>\s+/gm, '');
    
    // Remove list markers (-, *, +) at line start
    cleaned = cleaned.replace(/^[-*+]\s+/gm, '');
    
    // Remove code block markers (```)
    cleaned = cleaned.replace(/```[\s\S]*?```/g, 'code block');
    
    // Remove multiple spaces and clean up whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  };

  // Text-to-Speech Functions
  const stopReading = useCallback(() => {
    window.speechSynthesis.cancel();
    setReadingMessageId(null);
  }, []);

  const startReadAloud = useCallback((messageId: string, text: string) => {
    // Stop any currently playing speech
    if (readingMessageId) {
      stopReading();
    }

    // Detect language from USER'S QUERY, not the response
    // Find the user's message that came before this response
    let userMessageText = '';
    if (activeSession?.messages) {
      const messageIndex = activeSession.messages.findIndex(m => m.id === messageId);
      if (messageIndex > 0) {
        // Look for the previous user message
        for (let i = messageIndex - 1; i >= 0; i--) {
          if (activeSession.messages[i].role === 'user') {
            userMessageText = activeSession.messages[i].content;
            break;
          }
        }
      }
    }

    // Detect language from user's query (or response if no user message found)
    const textToDetect = userMessageText || text;
    const detectedLanguage = detectLanguage(textToDetect);

    // Clean markdown syntax from text before speaking
    const cleanText = cleanMarkdownForSpeech(text);

    // Create and speak with clean text but detected language from original
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = detectedLanguage;
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setReadingMessageId(messageId);
    };

    utterance.onend = () => {
      setReadingMessageId(null);
    };

    utterance.onerror = () => {
      setReadingMessageId(null);
    };

    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setOpenMenuMessageId(null);
  }, [activeSession?.messages, readingMessageId]);

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
        if (!user && data.currentCount >= 5) {
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
      title: 'New Conversation',
      messages: [
        {
          id: 'welcome-0',
          role: 'assistant',
          content: `Welcome to **Sardyx AI** — your unified multi-model AI workspace.

I can help you with:

- **Chat & Reasoning** — Ask anything, get clear answers
- **Code** — Write, debug, and explain code in any language
- **Web Search** — Real-time information with sources
- **Documents** — Analyze PDFs, CSVs, and text files
- **Images** — Generate visuals and artwork

Just type your message to get started.`,
          timestamp: new Date().toISOString(),
          modelUsed: 'Sardyx Auto-Router',
          thoughts: ['Session initialized', 'Displaying welcome']
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
    if (id.startsWith('sess-temp-') || !user) {
      // Local clean-up if guest or temporary session
      const filtered = sessions.filter(s => s.id !== id);
      setSessions(filtered);
      if (activeSession?.id === id) {
        if (filtered.length > 0) {
          setActiveSession(filtered[0]);
        } else {
          initFreshSession();
        }
      }
      return;
    }
    try {
      const response = await fetch(`/api/chats/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.email}`
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
          if (transcript && chatInputRef.current) {
            const prev = chatInputRef.current.getValue();
            const trimmed = prev.trim();
            const newValue = trimmed ? `${trimmed} ${transcript}` : transcript;
            chatInputRef.current.setValue(newValue);
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

  const handleSendMessage = async (promptText: string) => {
    if (!promptText.trim() && !fileAttachment) return;

    if (!user && guestCount >= 1) {
      setIsLimitBlocked(true);
      onOpenAuth();
      return;
    }

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

      const customInstructions = localStorage.getItem(`sardyx_inst_${user?.email || 'guest'}`) || undefined;
      const response = await fetch(`/api/chats/${activeSession?.id || 'sandbox'}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: userMsg,
          guestToken,
          modelMode: selectedModelMode,
          customInstructions
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        if (user && result.session) {
          // Sync sessions lists
          const sessionExists = sessions.some(s => s.id === result.session.id);
          if (sessionExists) {
            setSessions(sessions.map(s => s.id === result.session.id ? result.session : s));
          } else {
            setSessions([result.session, ...sessions]);
          }
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
        try {
          const errorData = await response.json();
          if (errorData.error === 'GUEST_LIMIT_REACHED') {
            setIsLimitBlocked(true);
            onOpenAuth();
          }
          alert(errorData.message || 'Cognitive pipeline ran into structural error state.');
        } catch (parseErr) {
          alert(`Server error (${response.status}): ${response.statusText}`);
        }
        // Revert prompt text so user doesn't lose it
        chatInputRef.current?.setValue(promptText);
      }
    } catch (err) {
      console.error(err);
      chatInputRef.current?.setValue(promptText);
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

      const customInstructions = localStorage.getItem(`sardyx_inst_${user?.email || 'guest'}`) || undefined;
      const response = await fetch(`/api/chats/${activeSession.id}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: lastUserMsg,
          guestToken,
          modelMode: selectedModelMode,
          customInstructions
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
      } else {
        const errData = await response.json().catch(() => ({}));
        if (errData.error === 'GUEST_LIMIT_REACHED' || response.status === 403) {
          setIsLimitBlocked(true);
          onOpenAuth();
        } else {
          const sysErrorMsg: Message = {
            id: `msg-${Date.now()}-error`,
            role: 'assistant',
            content: `⚠️ **SARDYX AI System Alert:** ${errData.message || 'The backend was unable to complete the execution request. Check keys or verify server balance.'}`,
            timestamp: new Date().toISOString()
          };
          setActiveSession({
            ...activeSession,
            messages: [...cleanedMsgs, sysErrorMsg]
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteIndividualMessage = useCallback((msgId: string) => {
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
  }, [activeSession, user]);

  const copyMessageText = useCallback((msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopyingMessageId(msgId);
    setTimeout(() => setCopyingMessageId(null), 1500);
  }, []);

  const handleToggleMenu = useCallback((msgId: string | null) => {
    setOpenMenuMessageId(msgId);
  }, []);

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
      
      {/* MOBILE BACKDROP OVERLAY */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-25 md:hidden transition-all duration-300 animate-fade-in"
        />
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside 
        className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } transition-transform duration-300 fixed md:relative inset-y-0 left-0 w-80 flex flex-col shrink-0 bg-[#0a0a0a] border-r border-white/5 overflow-hidden z-30`}
      >
        <div className="flex flex-col h-full bg-[#0a0a0a] p-4 justify-between">
          <div className="space-y-6">
            {/* Header Identity */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2.5">
                <img
                  src={sardyxLogo}
                  alt="Sardyx AI"
                  className="w-9 h-9 rounded-xl object-contain shrink-0 shadow-lg border border-white/10 p-0.5 bg-black"
                  referrerPolicy="no-referrer"
                />
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
            <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1 scrollbar-premium">
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
            <div className="flex justify-between items-center text-[9px] font-mono text-zinc-600 pt-1.5 border-t border-white/[0.02] pl-1">
              <span>SARDYX v1.1</span>
              <span className="flex items-center gap-1 text-emerald-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                ONLINE
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* CORE WORKSPACE SECTION */}
      <main className="flex-1 flex flex-col justify-between overflow-hidden relative z-20 bg-[#050505]">

        {/* INTERFACE TOP HEADER BAR — Sticky on all devices */}
        <header id="chat-header-bar" className="sticky top-0 z-30 h-14 border-b border-white/5 flex items-center justify-between px-4 sm:px-6 bg-[#050505]/80 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 border border-white/5 hover:border-white/10 rounded-lg text-zinc-400 hover:text-white md:hidden cursor-pointer shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-zinc-200">
                {activeSession ? activeSession.title : 'Playground Sandbox'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Dynamic model mode toggle selector */}
            <select
              value={selectedModelMode}
              onChange={(e: any) => setSelectedModelMode(e.target.value)}
              className="bg-[#0a0a0a] hover:bg-zinc-900 border border-white/10 focus:border-indigo-500 px-2 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-medium text-zinc-200 outline-none transition-all cursor-pointer w-28 sm:w-36 md:w-auto max-w-[180px] truncate"
            >
              <option value="auto">🤖 Auto Router</option>
              {models.map((m) => {
                const icon = m.iconName === 'brain' ? '🧠' : m.iconName === 'code' ? '💻' : m.iconName === 'eye' ? '👁️' : m.iconName === 'palette' ? '🎨' : m.iconName === 'video' ? '📹' : '💬';
                return (
                  <option key={m.id} value={m.id}>
                    {icon} {m.name}
                  </option>
                );
              })}
            </select>
          </div>
        </header>

        {/* MESSAGES LOG CONSOLE */}
        <section id="chat-messages-scroll" className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6 relative z-0 scrollbar-premium scroll-smooth">
          
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

          <div className="max-w-3xl mx-auto w-full space-y-4 sm:space-y-6">
            {activeSession?.messages.map((msg, idx) => (
              <MessageBubble
                key={msg.id || idx}
                msg={msg}
                idx={idx}
                user={user}
                isReading={readingMessageId === msg.id}
                isMenuOpen={openMenuMessageId === msg.id}
                isCopying={copyingMessageId === msg.id}
                onToggleMenu={handleToggleMenu}
                onStartReadAloud={startReadAloud}
                onStopReading={stopReading}
                onCopyText={copyMessageText}
                onDeleteMessage={deleteIndividualMessage}
              />
            ))}

            {/* Waiting loader feedback details */}
            {loading && (
              <div className="flex gap-3 items-start animate-fade-in">
                <img
                  src={sardyxLogo}
                  alt="Sardyx AI"
                  className="w-7 h-7 rounded-lg object-contain shrink-0 border border-white/5 p-0.5 bg-black mt-0.5"
                  referrerPolicy="no-referrer"
                />
                <div className="px-4 py-3 rounded-2xl rounded-bl-md border bg-[#0d0d0d] border-white/5 text-zinc-300">
                  <div className="flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </section>

        <ChatInput
          ref={chatInputRef}
          loading={loading}
          isRecording={isRecording}
          speechError={speechError}
          onClearSpeechError={() => setSpeechError(null)}
          isLimitBlocked={isLimitBlocked}
          onOpenAuth={onOpenAuth}
          onSubmit={handleSendMessage}
          fileAttachment={fileAttachment}
          onClearAttachment={() => setFileAttachment(null)}
          onMicClick={handleMicClick}
          onFileUploadClick={handleFileUploadClick}
          fileInputRef={fileInputRef}
          onFileChange={handleFileChange}
          onRegenerate={regenerateLastResponse}
          showRegenerate={!!(activeSession && activeSession.messages.length > 2)}
        />
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
