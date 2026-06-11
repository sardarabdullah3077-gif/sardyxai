import React, { useState } from 'react';
import { Check, Copy, Code, Eye, Terminal } from 'lucide-react';
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

  const codeString = String(children).replace(/\n$/, '');

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
      <div className="flex items-center justify-between px-4 py-2 bg-[#111] border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
          </div>
          
          {isPreviewable && (
            <div className="flex items-center gap-1 bg-black/50 p-0.5 rounded-lg border border-white/5 ml-2">
              <button
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-medium transition-all ${
                  activeTab === 'code' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Code className="w-3 h-3" />
                Code
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-medium transition-all ${
                  activeTab === 'preview' ? 'bg-indigo-600/20 text-indigo-400 shadow-sm border border-indigo-500/20' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Eye className="w-3 h-3" />
                Preview
              </button>
            </div>
          )}

          {!isPreviewable && (
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest ml-2 flex items-center gap-1.5">
              <Terminal className="w-3 h-3" />
              {language || 'text'}
            </span>
          )}
        </div>

        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 hover:text-white transition-colors p-1"
          title="Copy code"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Body content */}
      <div className="relative">
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
    </div>
  );
}
