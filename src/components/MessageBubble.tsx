import React from 'react';
import { MoreVertical, Volume2, Square, Check, Copy, Trash2, FileText, Globe } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlockRenderer from './CodeBlockRenderer';
import { Message, UserProfile } from '../types';
import sardyxLogo from '../assets/images/sx_logo.jpg';

interface MessageBubbleProps {
  msg: Message;
  idx: number;
  user: UserProfile | null;
  isReading: boolean;
  isMenuOpen: boolean;
  isCopying: boolean;
  onToggleMenu: (msgId: string | null) => void;
  onStartReadAloud: (msgId: string, text: string) => void;
  onStopReading: () => void;
  onCopyText: (msgId: string, text: string) => void;
  onDeleteMessage: (msgId: string) => void;
}

const MessageBubble = React.memo(function MessageBubble({
  msg,
  idx,
  user,
  isReading,
  isMenuOpen,
  isCopying,
  onToggleMenu,
  onStartReadAloud,
  onStopReading,
  onCopyText,
  onDeleteMessage,
}: MessageBubbleProps) {
  return (
    <div 
      className={`flex gap-2 sm:gap-4 items-start animate-fade-in w-full ${
        msg.role === 'user' ? 'justify-end' : 'justify-start'
      }`}
    >
      {msg.role !== 'user' && (
        <img 
          src={sardyxLogo} 
          alt="SARDYX AI" 
          className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg object-contain shrink-0 shadow-md shadow-indigo-500/15 border border-white/5 p-0.5 bg-black animate-[pulse_3s_infinite] mt-1"
          referrerPolicy="no-referrer"
        />
      )}

      <div className={`p-3 sm:p-4 rounded-xl border flex flex-col justify-between gap-1.5 leading-relaxed text-xs sm:text-sm w-full sm:max-w-[85%] max-w-[100%] relative group select-text break-words ${
        msg.role === 'user' 
          ? 'bg-zinc-900/60 border-white/5 text-zinc-100' 
          : 'bg-[#0a0a0a] border-white/5 text-zinc-200'
      }`}>
        
        {/* Message Actions Menu */}
        <div className="absolute right-3.5 top-3.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex gap-1 items-center z-10">
          {/* Read Aloud Menu */}
          <div className="relative">
            <button
              onClick={() => onToggleMenu(isMenuOpen ? null : msg.id)}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer"
              title="Message options"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && msg.role !== 'user' && (
              <div className="absolute right-0 top-full mt-2 bg-zinc-900 border border-white/10 rounded-lg shadow-lg z-50 min-w-[160px] overflow-hidden md:w-max" data-menu-container>
                <button
                  type="button"
                  onClick={() => onStartReadAloud(msg.id, msg.content)}
                  className={`w-full text-left px-4 py-2 text-xs flex items-center gap-2 transition-all ${
                    isReading
                      ? 'bg-indigo-600/20 text-indigo-300'
                      : 'text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  <Volume2 className="w-3 h-3" />
                  Read Aloud
                </button>

                {isReading && (
                  <button
                    type="button"
                    onClick={() => onStopReading()}
                    className="w-full text-left px-4 py-2 text-xs flex items-center gap-2 text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Square className="w-3 h-3" />
                    Stop Reading
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onCopyText(msg.id, msg.content)}
                  className="w-full text-left px-4 py-2 text-xs flex items-center gap-2 text-zinc-300 hover:bg-white/5 transition-all border-t border-white/5"
                >
                  {isCopying ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Delete button for assistant messages */}
          {idx > 0 && msg.role !== 'user' && (
            <button 
              onClick={() => onDeleteMessage(msg.id)}
              className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
              title="Delete message"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Highlight active reading state */}
        {isReading && (
          <div className="absolute inset-0 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 pointer-events-none animate-pulse" />
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

        {/* MAIN Markdowns output renderer with premium styling */}
        <div className="prose-premium text-zinc-200 select-text">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code(props) {
                const { children, className, node, ...rest } = props;
                const inline = !String(children).includes('\n') && !className?.includes('language-');
                return (
                  <CodeBlockRenderer inline={inline} className={className} node={node}>
                    {children}
                  </CodeBlockRenderer>
                );
              }
            }}
          >
            {msg.content}
          </ReactMarkdown>
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
  );
});

export default MessageBubble;
