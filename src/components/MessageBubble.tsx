import React, { lazy, Suspense } from 'react';
import { MoreVertical, Volume2, Square, Check, Copy, Trash2, FileText, Globe } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, UserProfile } from '../types';
import sardyxLogo from '../assets/images/sx_logo.jpg';

const CodeBlockRenderer = lazy(() => import('./CodeBlockRenderer'));

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
  const isUser = msg.role === 'user';

  return (
    <div
      className={`flex gap-2 sm:gap-3 items-end animate-fade-in w-full ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {!isUser && (
        <img
          src={sardyxLogo}
          alt="Sardyx AI"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain shrink-0 shadow-md border border-white/5 p-0.5 bg-black mt-5"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      )}

      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[88%] sm:max-w-[80%] min-w-0`}>
        {/* Message bubble */}
        <div
          className={`p-3 sm:p-4 rounded-2xl border text-[13px] sm:text-sm leading-relaxed w-full relative group select-text break-words ${
            isUser
              ? 'bg-indigo-600/15 border-indigo-500/20 text-zinc-100 rounded-br-md'
              : 'bg-[#0d0d0d] border-white/5 text-zinc-200 rounded-bl-md'
          }`}
        >
          {/* Reading indicator */}
          {isReading && (
            <div className="absolute inset-0 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 pointer-events-none animate-pulse" />
          )}

          {/* Attachment */}
          {msg.attachments && msg.attachments.length > 0 && (
            <div className="mb-3 flex items-center gap-2.5 p-2.5 bg-black/60 rounded-xl border border-white/5 max-w-sm">
              <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
              <div className="truncate text-xs font-mono max-w-[80%]">
                <span className="text-zinc-300 truncate block font-semibold">{msg.attachments[0].name}</span>
                <span className="text-[10px] text-zinc-500 uppercase">{msg.attachments[0].type.split("/")[1] || "DOCUMENT"}</span>
              </div>
            </div>
          )}

          {/* Markdown content */}
          <div className="prose-premium text-zinc-200 select-text">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code(props) {
                  const { children, className, node, ...rest } = props;
                  const inline = !String(children).includes('\n') && !className?.includes('language-');
                  return (
                    <Suspense fallback={
                      <pre className="my-3 p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-zinc-400 font-mono overflow-x-auto">
                        <code>{children}</code>
                      </pre>
                    }>
                      <CodeBlockRenderer inline={inline} className={className} node={node}>
                        {children}
                      </CodeBlockRenderer>
                    </Suspense>
                  );
                }
              }}
            >
              {msg.content}
            </ReactMarkdown>
          </div>

          {/* Media artifacts */}
          {msg.artifacts && msg.artifacts.map((art, artIdx) => (
            <div key={artIdx} className="mt-3 p-1.5 bg-black border border-white/5 rounded-xl max-w-md">
              {art.type === 'image' && (
                <div className="overflow-hidden rounded-lg border border-white/5">
                  <img
                    src={art.url}
                    alt={art.title || "Generated content"}
                    className="w-full h-auto object-cover max-h-[280px]"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                </div>
              )}
              {art.type === 'video' && (
                <div className="overflow-hidden rounded-lg border border-white/5">
                  <video
                    src={art.url}
                    controls
                    className="w-full h-auto max-h-[220px]"
                  />
                </div>
              )}
            </div>
          ))}

          {/* Search citations */}
          {msg.citations && msg.citations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <span className="text-[10px] font-mono tracking-wide text-cyan-400 uppercase font-semibold flex items-center gap-1 mb-2">
                <Globe className="w-3.5 h-3.5" />
                Sources
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {msg.citations.map((cite, citeIdx) => (
                  <a
                    key={citeIdx}
                    href={cite.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 border border-white/5 bg-black/40 rounded-lg hover:border-cyan-900/30 transition-all text-xs flex flex-col gap-0.5"
                  >
                    <span className="font-medium text-zinc-100 truncate">{cite.title}</span>
                    <span className="text-[10px] text-zinc-500 truncate">{cite.url}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions row — below the bubble, not overlapping */}
        <div className={`flex items-center gap-1 mt-1.5 px-1 ${isUser ? 'flex-row-reverse' : ''}`}>
          {/* Timestamp */}
          <span className="text-[9px] font-mono text-zinc-600 select-none">
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {msg.durationMs && !isUser && (
            <span className="text-[9px] font-mono text-zinc-600 select-none">
              {msg.durationMs}ms
            </span>
          )}

          {!isUser && (
            <div className="flex items-center gap-0.5 ml-1">
              {/* Copy button */}
              <button
                onClick={() => onCopyText(msg.id, msg.content)}
                className="p-1 text-zinc-600 hover:text-white hover:bg-white/10 rounded-md transition-all cursor-pointer"
                title="Copy message"
              >
                {isCopying ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>

              {/* More options */}
              <div className="relative">
                <button
                  onClick={() => onToggleMenu(isMenuOpen ? null : msg.id)}
                  className="p-1 text-zinc-600 hover:text-white hover:bg-white/10 rounded-md transition-all cursor-pointer"
                  title="Message options"
                  aria-expanded={isMenuOpen}
                  aria-haspopup="true"
                >
                  <MoreVertical className="w-3 h-3" />
                </button>

                {isMenuOpen && (
                  <div
                    className="absolute bottom-full mb-1 left-0 bg-zinc-900 border border-white/10 rounded-xl shadow-xl z-50 min-w-[150px] overflow-hidden"
                    data-menu-container
                  >
                    <button
                      type="button"
                      onClick={() => onStartReadAloud(msg.id, msg.content)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-all ${
                        isReading ? 'bg-indigo-600/20 text-indigo-300' : 'text-zinc-300 hover:bg-white/5'
                      }`}
                    >
                      <Volume2 className="w-3 h-3" />
                      Read Aloud
                    </button>
                    {isReading && (
                      <button
                        type="button"
                        onClick={() => onStopReading()}
                        className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <Square className="w-3 h-3" />
                        Stop
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Delete */}
              {idx > 0 && (
                <button
                  onClick={() => onDeleteMessage(msg.id)}
                  className="p-1 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all cursor-pointer"
                  title="Delete message"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {isUser && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => onCopyText(msg.id, msg.content)}
                className="p-1 text-zinc-600 hover:text-white hover:bg-white/10 rounded-md transition-all cursor-pointer"
                title="Copy message"
              >
                {isCopying ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {isUser && (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center font-bold text-[10px] shrink-0 select-none text-indigo-300 mt-5">
          {user ? user.name.substring(0, 1).toUpperCase() : 'U'}
        </div>
      )}
    </div>
  );
});

export default MessageBubble;
