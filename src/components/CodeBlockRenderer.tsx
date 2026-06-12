import React, { useState, useEffect } from 'react';
import { Check, Copy, Code, Eye, Terminal, Maximize2, X } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
}

export default function CodeBlockRenderer({ inline, className, children }: CodeBlockProps) {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1].toLowerCase() : '';
  const isPreviewable = ['html', 'css', 'js', 'javascript'].includes(language);
  
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [copied, setCopied] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const codeString = String(children).replace(/\n$/, '');

  // Handle full-screen modal interactions
  useEffect(() => {
    if (!isFullScreen) return;

    // Prevent background scrolling
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Handle ESC key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullScreen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isFullScreen]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (inline) {
    return (
      <code className="bg-zinc-800 text-indigo-300 px-1.5 py-0.5 rounded text-[11px] font-mono">
        {children}
      </code>
    );
  }

  // Create preview srcDoc if requested
  const getSrcDoc = () => {
    if (language === 'html') return codeString;
    if (language === 'css') return `<style>${codeString}</style><div style="padding: 20px; font-family: sans-serif; color: black; background: #f8f9fa; border-radius: 8px;">CSS loaded. This is a preview placeholder. Edit HTML block to see layout.</div>`;
    if (language === 'js' || language === 'javascript') return `<script>${codeString}</script><div style="padding: 20px; font-family: sans-serif; color: black; background: #f8f9fa; border-radius: 8px;">JavaScript executed. Check your browser console for output.</div>`;
    return codeString;
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-white/10 bg-[#0a0a0a] shadow-lg">
      {/* Header bar */}
      <div className="flex flex-wrap items-center gap-1.5 px-2.5 py-1.5 sm:px-4 sm:py-2 bg-[#111] border-b border-white/5">
        {/* Left: dots */}
        <div className="flex gap-1 shrink-0">
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500/80"></div>
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-yellow-500/80"></div>
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-green-500/80"></div>
        </div>
        
        {/* Middle: tabs or language */}
        {isPreviewable && (
          <div className="flex items-center gap-0.5 bg-black/50 p-0.5 rounded-lg border border-white/5">
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1 rounded-md text-[10px] font-medium transition-all ${
                activeTab === 'code' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Code className="w-3 h-3" />
              Code
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1 rounded-md text-[10px] font-medium transition-all ${
                activeTab === 'preview' ? 'bg-indigo-600/20 text-indigo-400 shadow-sm border border-indigo-500/20' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Eye className="w-3 h-3" />
              Preview
            </button>
          </div>
        )}

        {!isPreviewable && (
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
            <Terminal className="w-3 h-3" />
            {language || 'text'}
          </span>
        )}

        {/* Right: copy + maximize — always visible */}
        <div className="flex items-center gap-0.5 sm:gap-1 ml-auto shrink-0">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
            title="Copy code"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={() => setIsFullScreen(true)}
            className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors rounded"
            title="Full screen"
            aria-label="Full screen preview"
          >
            <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Body content */}
      <div className="relative overflow-auto scrollbar-premium">
        {activeTab === 'code' ? (
          <SyntaxHighlighter
            language={language || 'text'}
            style={vscDarkPlus as any}
            customStyle={{
              margin: 0,
              padding: '16px',
              background: 'transparent',
              fontSize: '12px',
              fontFamily: '"JetBrains Mono", "Fira Code", monospace'
            }}
            PreTag="div"
          >
            {codeString}
          </SyntaxHighlighter>
        ) : (
          <div className="bg-white h-[400px] w-full overflow-hidden">
            <iframe
              title="Preview Sandbox"
              srcDoc={getSrcDoc()}
              sandbox="allow-scripts allow-forms allow-popups"
              className="w-full h-full border-none"
            />
          </div>
        )}
      </div>

      {/* Full-screen Modal */}
      {isFullScreen && (
        <div 
          className="fixed inset-0 z-[100] bg-black flex flex-col"
          style={{ height: '100dvh', width: '100vw' }}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-3 py-2 sm:px-6 sm:py-3 bg-[#111] border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <div className="flex gap-1 sm:gap-1.5 shrink-0">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500/80"></div>
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500/80"></div>
              </div>
              
              {isPreviewable && (
                <div className="flex items-center gap-0.5 sm:gap-1 bg-black/50 p-0.5 sm:p-1 rounded-lg border border-white/10 ml-1 sm:ml-2">
                  <button
                    onClick={() => setActiveTab('code')}
                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                      activeTab === 'code' 
                        ? 'bg-zinc-700 text-white shadow-md border border-white/20' 
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Code className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden xs:inline">Code</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                      activeTab === 'preview' 
                        ? 'bg-indigo-600 text-white shadow-md border border-indigo-400/30' 
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden xs:inline">Preview</span>
                  </button>
                </div>
              )}

              {!isPreviewable && (
                <span className="text-xs sm:text-sm font-mono text-zinc-400 uppercase tracking-widest ml-1 sm:ml-2 flex items-center gap-1.5 sm:gap-2 bg-black/40 px-2 sm:px-3 py-1 rounded-lg shrink-0">
                  <Terminal className="w-3 h-3 sm:w-4 sm:h-4" />
                  {language || 'text'}
                </span>
              )}
            </div>

            <button
              onClick={() => setIsFullScreen(false)}
              className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all rounded-lg shrink-0 ml-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              title="Close (ESC)"
              aria-label="Close fullscreen preview"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {activeTab === 'code' ? (
              <div className="flex-1 overflow-auto bg-[#0a0a0a] scrollbar-light">
                <SyntaxHighlighter
                  language={language || 'text'}
                  style={vscDarkPlus as any}
                  customStyle={{
                    margin: 0,
                    padding: '16px',
                    background: 'transparent',
                    fontSize: 'clamp(12px, 2.5vw, 14px)',
                    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                    minHeight: '100%'
                  }}
                  PreTag="div"
                  wrapLongLines={true}
                >
                  {codeString}
                </SyntaxHighlighter>
              </div>
            ) : (
              <iframe
                title="Preview Sandbox Full Screen"
                srcDoc={getSrcDoc()}
                sandbox="allow-scripts allow-forms allow-popups"
                className="flex-1 w-full border-none bg-white"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
