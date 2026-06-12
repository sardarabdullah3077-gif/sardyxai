import React, { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { FileText, X, AlertTriangle, Lock, ArrowRight, FileUp, MicOff, Mic, Send, RotateCw } from 'lucide-react';

export interface ChatInputRef {
  setValue: (val: string) => void;
  getValue: () => string;
  focus: () => void;
}

interface ChatInputProps {
  loading: boolean;
  isRecording: boolean;
  speechError: string | null;
  onClearSpeechError: () => void;
  isLimitBlocked: boolean;
  onOpenAuth: () => void;
  onSubmit: (text: string) => void;
  fileAttachment: { name: string; type: string; base64: string } | null;
  onClearAttachment: () => void;
  onMicClick: () => void;
  onFileUploadClick: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRegenerate?: () => void;
  showRegenerate?: boolean;
}

export const ChatInput = React.memo(forwardRef<ChatInputRef, ChatInputProps>(function ChatInput(
  {
    loading,
    isRecording,
    speechError,
    onClearSpeechError,
    isLimitBlocked,
    onOpenAuth,
    onSubmit,
    fileAttachment,
    onClearAttachment,
    onMicClick,
    onFileUploadClick,
    fileInputRef,
    onFileChange,
    onRegenerate,
    showRegenerate = false,
  },
  ref
) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    setValue: (val: string) => {
      setValue(val);
    },
    getValue: () => {
      return value;
    },
    focus: () => {
      inputRef.current?.focus();
    },
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const trimmed = value.trim();
    if (!trimmed && !fileAttachment) return;
    onSubmit(trimmed);
    setValue('');
  };

  return (
    <section id="chat-input-layout" className="p-3 sm:p-6 border-t border-white/5 bg-[#050505] shrink-0">
      <div className="max-w-3xl mx-auto space-y-3 relative">
        
        {/* Displaying attachment preview state if selected */}
        {fileAttachment && (
          <div className="absolute top-[-58px] left-0 right-0 p-2.5 bg-[#0a0a0a] border border-white/10 rounded-xl flex items-center justify-between shadow-xl max-w-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span className="text-xs text-zinc-300 truncate max-w-[200px]">{fileAttachment.name}</span>
            </div>
            <button 
              type="button"
              onClick={onClearAttachment}
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
              type="button"
              onClick={onClearSpeechError}
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
          <div className="p-6 bg-red-955/10 border border-red-500/20 rounded-2xl text-center space-y-4 max-w-md mx-auto animate-fade-in w-full">
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-400">
              <Lock className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-white">Free Guest Limit Reached</h3>
              <p className="text-xs text-zinc-400">
                You have sent 5/5 free messages. Please Sign Up or Log In to continue using the SARDYX AI playground and access unlimited messages.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white font-semibold rounded-xl text-xs transition-all shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 flex items-center justify-center gap-2 mx-auto cursor-pointer"
            >
              <span>Sign Up / Log In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="relative z-10 w-full flex flex-col gap-2.5 md:gap-0">
            <input 
              type="file"
              ref={fileInputRef}
              onChange={onFileChange}
              accept=".png,.jpg,.jpeg,.webp,.pdf,.docx,.txt,.csv,.xlsx"
              className="hidden"
            />
            
            {/* Top row: File upload, Text input, and Mic (all on one line) */}
            <div className="flex items-center gap-2 sm:gap-2.5 w-full border border-white/5 bg-zinc-900/40 hover:border-white/10 p-2 sm:p-2.5 rounded-2xl focus-within:border-indigo-500 transition-all">
              <button
                type="button"
                onClick={onFileUploadClick}
                className="p-2 sm:p-2.5 bg-black border border-white/5 hover:border-white/10 text-zinc-400 hover:text-white rounded-lg cursor-pointer transition-colors shrink-0 hover:bg-zinc-900"
                title="Upload diagram scan or raw text (doc, txt, csv, spreadsheet, pdf)"
              >
                <FileUp className="w-4 h-4" />
              </button>

              <input
                type="text"
                ref={inputRef}
                placeholder={isRecording ? "🎙️ Listening..." : "Message SARDYX AI..."}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={loading}
                className="flex-1 bg-transparent px-2.5 py-2.5 sm:py-3 text-sm text-zinc-100 placeholder-zinc-550 outline-none min-w-0"
              />

              <button
                type="button"
                onClick={onMicClick}
                className={`p-2 sm:p-2.5 border rounded-lg cursor-pointer transition-all shrink-0 hover:bg-zinc-900 ${
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

              {/* Send button on same line as input on desktop */}
              <button
                type="submit"
                disabled={loading || (!value.trim() && !fileAttachment)}
                className="hidden md:flex p-2 md:p-2.5 bg-indigo-600 hover:bg-indigo-550 disabled:bg-zinc-950 disabled:text-zinc-650 text-white font-medium rounded-lg cursor-pointer shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all items-center justify-center gap-2 shrink-0"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Send button (full width on mobile only) */}
            <button
              type="submit"
              disabled={loading || (!value.trim() && !fileAttachment)}
              className="md:hidden w-full px-6 py-2.5 bg-indigo-600 hover:bg-indigo-550 disabled:bg-zinc-950 disabled:text-zinc-650 text-white font-medium rounded-xl cursor-pointer shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </form>
        )}

        {/* Regenerate Action */}
        {showRegenerate && onRegenerate && (
          <div className="flex justify-center pt-2 pb-1">
            <button 
              type="button"
              onClick={onRegenerate}
              disabled={loading}
              className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <RotateCw className="w-3.5 h-3.5 text-zinc-550 animate-[spin_10s_linear_infinite]" />
              Regenerate response
            </button>
          </div>
        )}
      </div>
    </section>
  );
}));

export default ChatInput;
