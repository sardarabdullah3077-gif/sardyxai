/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import sardyxLogo from '../assets/images/sx_logo.jpg';
import { 
  Bot, 
  MessageSquare, 
  Brain, 
  Code, 
  Globe, 
  FileText, 
  Eye, 
  Palette, 
  Video, 
  Workflow, 
  Cpu, 
  Sparkles, 
  ArrowRight, 
  Check, 
  Layers, 
  Zap, 
  ShieldCheck, 
  Users 
} from 'lucide-react';

interface LandingPageProps {
  onStartSession: () => void;
  onOpenAuth: () => void;
  isAuthenticated: boolean;
}

export default function LandingPage({ onStartSession, onOpenAuth, isAuthenticated }: LandingPageProps) {
  const capabilities = [
    {
      icon: <MessageSquare className="w-6 h-6 text-purple-400" />,
      title: "Chat & Dynamic Language",
      description: "Engage in highly contextual conversational prompts with ultra-low latency response structures."
    },
    {
      icon: <Brain className="w-6 h-6 text-indigo-400" />,
      title: "Deep Context Reasoning",
      description: "Deep thinking mode activates multi-turn logical workspace chains for math, engineering, and logic."
    },
    {
      icon: <Globe className="w-6 h-6 text-cyan-400" />,
      title: "Real-time Web Grounding",
      description: "Dynamically accesses global search indexes to cite real-time news, stocks, statistics, and weather details."
    },
    {
      icon: <FileText className="w-6 h-6 text-teal-400" />,
      title: "Multi-type Document Ingestion",
      description: "Analyze, summarize, and extract tabular logs, CSVs, DOCX files, spreadsheets, and heavy PDFs on the fly."
    },
    {
      icon: <Eye className="w-6 h-6 text-pink-400" />,
      title: "Omni-Vision Analyzing",
      description: "Visual logic processing recognizes screenshots, structural flowcharts, scanned forms, and OCR fields."
    },
    {
      icon: <Palette className="w-6 h-6 text-orange-400" />,
      title: "AI Canvas Image Generation",
      description: "Render high definition graphics, professional brand vector logos, and visual digital art using Imagen."
    },
    {
      icon: <Video className="w-6 h-6 text-red-400" />,
      title: "Dynamic Cinematic Videos",
      description: "Command and prompt motion vectors to render spectacular cinematic landscape sequences."
    },
    {
      icon: <Code className="w-6 h-6 text-emerald-400" />,
      title: "System Coder Pro",
      description: "Write, refactor, and type-verify software modules with instant syntax highlighting outputs."
    },
    {
      icon: <Workflow className="w-6 h-6 text-amber-400" />,
      title: "Autonomous Agent Flow",
      description: "Submit complex objective goals. The system splits, plans, acts, and iterates on multiple sub-tasks."
    }
  ];

  const pricingTiers = [
    {
      name: "Guest Sandbox",
      price: "0",
      description: "Experience central SARDYX AI models in sandbox sandbox.",
      features: [
        "Exactly 1 Free Multi-Model Message",
        "Unified Intelligent Auto-Router",
        "Document Attachment Preview",
        "Basic Web citations",
        "Creator credits visibility"
      ],
      cta: "Try Free Message",
      isPrimary: false,
      onClick: onStartSession
    },
    {
      name: "Cognitive Pro",
      price: "20",
      description: "Our signature plan for unlimited autonomous modeling scale.",
      features: [
        "Unlimited Multi-Model Prompts",
        "Full Search Grounding / Citations",
        "Autonomous Multi-step Agent Executions",
        "Saved Historical Conversations",
        "Dynamic User Memory Integration",
        "High Fidelity Art & Video Outputs"
      ],
      cta: isAuthenticated ? "Access Dashboard" : "Sign In with Google",
      isPrimary: true,
      onClick: isAuthenticated ? onStartSession : onOpenAuth
    },
    {
      name: "Organizational Core",
      price: "120",
      description: "Dedicated cluster pipelines for custom API keys and team memories.",
      features: [
        "Custom FreeLLMAPI Routing Targets",
        "Multi-user Team Memory sync",
        "Custom API Analytics Panels",
        "Prioritized High Throughput Speeds",
        "Creator Sardar Abdullah Fazal Direct Support"
      ],
      cta: "Contact Architecture",
      isPrimary: false,
      onClick: onOpenAuth
    }
  ];

  const faqs = [
    {
      q: "What is SARDYX AI?",
      a: "SARDYX AI is a premium multi-model cognitive platform created by Sardar Abdullah Fazal. It acts as an intelligent proxy utilizing only one unified model router key, allowing you to use the optimized model category for Chat, Code, Vision, Art, Video, or Search without manual toggle errors."
    },
    {
      q: "Who is the creator of SARDYX AI?",
      a: "SARDYX AI was completely designed, structured, and implemented by Sardar Abdullah Fazal as a premium, unified AI agent dashboard."
    },
    {
      q: "How does the Guest Access message limit work?",
      a: "Unauthenticated guest visitors are allowed exactly 1 free query to test SARDYX model capabilities. Further queries are protected and require a secure Sign-in to sync conversations and enable unlimited access."
    },
    {
      q: "How does the Intelligent Model Router choose models?",
      a: "SARDYX AI scans input syntax heuristically on our full-stack Express server to detect intent. If you request a code template, it leverages CodePro; if you ask about recent stock pricing, it triggers global search citations; if you supply media, it automatically boots high-density Art and Video models."
    }
  ];

  return (
    <div id="landing-page-root" className="min-h-screen bg-[#050505] text-zinc-200 font-sans selection:bg-indigo-500/20 selection:text-indigo-200 overflow-x-hidden">
      {/* Dynamic Glowing background orb conforming to the design guidelines */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none overflow-hidden opacity-25 select-none z-0">
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-indigo-950/40 rounded-full blur-[125px] animate-pulse"></div>
        <div className="absolute top-[10%] right-[20%] w-[500px] h-[500px] bg-cyan-950/30 rounded-full blur-[105px] animate-pulse delay-700"></div>
      </div>

      {/* HEADER Nav */}
      <header id="landing-header" className="relative z-10 max-w-7xl mx-auto px-8 py-5 flex items-center justify-between border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-3">
          <motion.img 
            src={sardyxLogo} 
            alt="SARDYX AI Premium Logo" 
            className="w-11 h-11 rounded-xl object-contain shadow-xl cursor-pointer border border-white/10 p-0.5 bg-black"
            referrerPolicy="no-referrer"
            animate={{ 
              scale: [1, 1.04, 1],
              rotate: [0, 1.5, -1.5, 0],
              boxShadow: [
                "0 4px 20px rgba(99, 102, 241, 0.2)",
                "0 4px 30px rgba(99, 102, 241, 0.4)",
                "0 4px 20px rgba(99, 102, 241, 0.2)"
              ]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            whileHover={{ scale: 1.12, rotate: 6 }}
          />
          <span className="text-xl font-bold tracking-tight text-white">
            SARDYX <span className="text-indigo-400">AI</span>
          </span>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={onStartSession} 
            className="text-sm font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Launch Playground
          </button>
          {!isAuthenticated ? (
            <button 
              onClick={onOpenAuth} 
              className="bg-white text-black px-4 py-2 rounded-full text-xs font-bold hover:bg-zinc-200 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-md"
            >
              Google Sign In
            </button>
          ) : (
            <button 
              onClick={onStartSession} 
              className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-full shadow-md shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              Dashboard
            </button>
          )}
        </div>
      </header>

      {/* HERO SECTION */}
      <section id="hero-section" className="relative z-10 max-w-5xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-white/5 backdrop-blur-sm text-[11px] font-mono text-indigo-300 mb-8 mx-auto">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
          <span>AUTONOMOUS COGNITIVE SYSTEM</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tighter leading-tight text-white mb-6">
          One Autonomous Interface. <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-zinc-200 to-zinc-500">
            All AI Capabilities Unified.
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-zinc-400 max-w-3xl mx-auto mb-10 leading-relaxed font-light">
          SARDYX AI is a premium multi-model platform that dynamically route-detects user intent. Fully powered to handle chat parameters, execute reasoning, write complete code scripts, analyze complex data spreadsheets, and render high quality graphics.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-16">
          <button 
            onClick={onStartSession} 
            className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 group transition-all duration-300 cursor-pointer text-base"
          >
            Start Dynamic Chat
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          {!isAuthenticated && (
            <button 
              onClick={onOpenAuth} 
              className="w-full sm:w-auto px-6 py-4 bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-200 hover:text-white rounded-xl font-medium transition-colors cursor-pointer text-base"
            >
              Sign Up Free
            </button>
          )}
        </div>

        {/* Dynamic Capability Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-4xl mx-auto p-4 rounded-2xl bg-[#0a0a0a]/60 border border-white/5 backdrop-blur-sm">
          <div className="flex flex-col items-center p-3 font-mono text-xs text-zinc-400 hover:text-white transition-colors">
            <MessageSquare className="w-5 h-5 mb-1.5 text-indigo-400" />
            <span>Chat Assistant</span>
          </div>
          <div className="flex flex-col items-center p-3 font-mono text-xs text-zinc-400 hover:text-white transition-colors">
            <Brain className="w-5 h-5 mb-1.5 text-cyan-400" />
            <span>Self Reasoning</span>
          </div>
          <div className="flex flex-col items-center p-3 font-mono text-xs text-zinc-400 hover:text-white transition-colors">
            <Globe className="w-5 h-5 mb-1.5 text-indigo-400" />
            <span>Real-time Search</span>
          </div>
          <div className="flex flex-col items-center p-3 font-mono text-xs text-zinc-400 hover:text-white transition-colors">
            <Palette className="w-5 h-5 mb-1.5 text-cyan-400" />
            <span>Art Rendering</span>
          </div>
          <div className="flex flex-col items-center p-3 font-mono text-xs text-zinc-400 hover:text-white transition-colors col-span-2 sm:col-span-1">
            <Workflow className="w-5 h-5 mb-1.5 text-indigo-400" />
            <span>Multi-step Agents</span>
          </div>
        </div>
      </section>

      {/* INTERACTIVE PREVIEW SCREENSHOT MOCK */}
      <section id="screenshots-section" className="max-w-6xl mx-auto px-6 py-12">
        <div className="relative rounded-2xl border border-white/10 bg-[#050505] p-4 shadow-2xl">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[1px] w-[80%] bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
          {/* Mock Mac Toolbar */}
          <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
            </div>
            <div className="px-5 py-1 rounded bg-zinc-900 text-[11px] font-mono text-zinc-400 w-full max-w-sm text-center truncate">
              sardyx.ai/playground/sardar-abdullah-fazal
            </div>
            <div className="w-8"></div>
          </div>
          {/* Mock UI Contents */}
          <div className="grid grid-cols-12 gap-4 h-[400px]">
            {/* Mock Sidebar */}
            <div className="col-span-3 hidden md:flex flex-col justify-between border-r border-[#0a0a0a] pr-4 py-2">
              <div className="space-y-3">
                <div className="h-6 bg-zinc-900 rounded-md w-[80%]"></div>
                <div className="space-y-2 mt-4">
                  <div className="h-7 bg-indigo-950/20 border border-indigo-500/30 rounded px-2 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-indigo-300">Live Agent Pipeline</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                  </div>
                  <div className="h-4 bg-zinc-900/40 rounded w-[90%]"></div>
                  <div className="h-4 bg-zinc-900/40 rounded w-[75%]"></div>
                  <div className="h-4 bg-zinc-900/40 rounded w-[85%]"></div>
                </div>
              </div>
              <div className="border-t border-white/5 pt-3">
                <div className="text-[10px] font-mono text-zinc-500 truncate">
                  Platform by Sardar Abdullah Fazal
                </div>
              </div>
            </div>
            {/* Mock Main chat area */}
            <div className="col-span-12 md:col-span-9 flex flex-col justify-between py-2">
              <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2">
                <div className="flex gap-2.5 items-start">
                  <div className="w-6 h-6 rounded bg-zinc-850 flex items-center justify-center text-[10px] font-mono font-semibold">U</div>
                  <div className="bg-zinc-900/50 px-3 py-2 rounded-lg text-xs leading-relaxed max-w-[85%]">
                    Can you generate a quick vector architecture diagram and search who founded SARDYX AI?
                  </div>
                </div>
                <div className="flex gap-2.5 items-start">
                  <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-[10px] text-white font-mono font-semibold">SA</div>
                  <div className="bg-[#050505] border border-white/5 px-4 py-2.5 rounded-lg text-xs leading-relaxed max-w-[85%] space-y-2.5">
                    <div className="flex gap-1.5 items-center font-mono text-[9px] text-indigo-400">
                      <Workflow className="w-3 h-3 animate-spin" />
                      <span>AUTONOMOUS AGENT ACTIVE: Routing to Search and Art generation fallback models...</span>
                    </div>
                    <p className="text-zinc-300">
                      Our system successfully queried global indices: SARDYX AI was created by **Sardar Abdullah Fazal**. To represent this, here is a custom visual diagram generated based on search coordinates:
                    </p>
                    <div className="h-28 bg-gradient-to-br from-indigo-950/40 to-zinc-900/40 border border-white/5 rounded flex items-center justify-center">
                      <span className="text-[10px] font-mono text-indigo-300">[SARDYX-COGNITIVE-ART-MATRIX]</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Fake Input Row */}
              <div className="flex items-center gap-2 border border-white/10 bg-zinc-900/40 p-2 rounded-xl mt-3">
                <div className="h-5 bg-zinc-850 rounded w-16"></div>
                <div className="h-4 bg-zinc-850 rounded w-full"></div>
                <div className="w-6 h-6 rounded-lg bg-indigo-600"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* POWERFUL COGNITIVE ABILITIES SECTION */}
      <section id="capabilities-grid-layout" className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mb-4">
            Comprehensive Multi-Model Capability
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
            Eliminate cognitive friction. Type descriptions naturally while SARDYX AI autonomously targets correct coding or image creation neural grids behind a single client framework key.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((cap, idx) => (
            <div 
              key={idx} 
              className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 hover:translate-y-[-2px] group flex flex-col items-start"
            >
              <div className="p-2.5 rounded-xl bg-zinc-900 mb-5 border border-white/5 group-hover:scale-105 transition-transform">
                {cap.icon}
              </div>
              <h3 className="text-lg font-medium text-white mb-2">{cap.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{cap.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING PLANS */}
      <section id="pricing-layout-section" className="max-w-6xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mb-4">
            Simple, Absolute Scaling Plans
          </h2>
          <p className="text-zinc-400 text-sm">
            Access unified model routers with sandbox guest options or unlimited cognitive synchronization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pricingTiers.map((tier, idx) => (
            <div 
              key={idx} 
              className={`p-8 rounded-3xl border flex flex-col justify-between transition-all duration-300 relative ${
                tier.isPrimary 
                  ? 'bg-zinc-950 border-indigo-500/40 shadow-2xl' 
                  : 'bg-white/[0.01] border-white/5'
              }`}
            >
              {tier.isPrimary && (
                <span className="absolute top-0 right-8 -translate-y-1/2 px-3 py-1 bg-indigo-600 font-mono text-[10px] text-white rounded-full uppercase tracking-wider">
                  Highly Popular
                </span>
              )}
              <div>
                <h3 className="text-lg font-medium text-white mb-1">{tier.name}</h3>
                <p className="text-zinc-400 text-xs mb-6">{tier.description}</p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-bold tracking-tight text-white">$</span>
                  <span className="text-5xl font-bold tracking-tight text-white">{tier.price}</span>
                  <span className="text-zinc-500 text-sm">/month</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {tier.features.map((feat, fidx) => (
                    <li key={fidx} className="flex gap-2.5 items-start text-sm text-zinc-350">
                      <Check className={`w-4 h-4 shrink-0 ${tier.isPrimary ? 'text-indigo-450' : 'text-zinc-500'}`} />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button 
                onClick={tier.onClick}
                className={`w-full py-3.5 px-4 font-medium sm:text-sm rounded-xl transition-all cursor-pointer ${
                  tier.isPrimary 
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg' 
                    : 'bg-zinc-905 hover:bg-zinc-800 text-zinc-200 hover:text-white'
                }`}
              >
                {tier.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq-layout" className="max-w-4xl mx-auto px-6 py-20 border-t border-white/5">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-10 text-center">
          Frequently Answers & Architectures
        </h2>
        <div className="space-y-6">
          {faqs.map((faq, idx) => (
            <div key={idx} className="p-6 rounded-2xl bg-white/[0.01] border border-white/5">
              <h3 className="text-base sm:text-lg font-medium text-white mb-2 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>{faq.q}</span>
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed font-light pl-6">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CALL TO ACTION (CTA) */}
      <section id="final-cta" className="relative z-10 max-w-5xl mx-auto px-6 py-16 text-center">
        <div className="p-10 rounded-3xl bg-gradient-to-br from-indigo-950/20 via-zinc-950/10 to-transparent border border-white/5 backdrop-blur-sm">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mb-4">
            Unified Intelligent Capabilities Await
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base max-w-2xl mx-auto mb-8 font-light leading-relaxed">
            Experience complete autonomous task execution with instant fallbacks. Log in now and sync your saved chats seamlessly across browser terminals.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onStartSession} 
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg transition-colors cursor-pointer w-full sm:w-auto text-sm"
            >
              Open SARDYX Workspace
            </button>
            {!isAuthenticated && (
              <button 
                onClick={onOpenAuth} 
                className="px-6 py-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-xl font-medium border border-white/10 hover:border-white/20 transition-all cursor-pointer w-full sm:w-auto text-sm"
              >
                Sign In with Google
              </button>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="landing-footer" className="relative z-10 max-w-7xl mx-auto px-6 py-12 border-t border-white/5 mt-16 text-zinc-500 text-xs text-center space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-zinc-400 font-medium">
            <img 
              src={sardyxLogo} 
              alt="SARDYX AI Mini Logo" 
              className="w-5 h-5 rounded object-contain"
              referrerPolicy="no-referrer"
            />
            <span>SARDYX AI System</span>
          </div>
          <p className="text-zinc-400">
            Created and structured by <span className="text-indigo-400 font-medium">Sardar Abdullah Fazal</span>.
          </p>
          <div className="flex items-center gap-4 text-zinc-500 text-xs">
            <a href="#landing-page-root" className="hover:text-zinc-300">Privacy Register</a>
            <span className="text-zinc-850">•</span>
            <a href="#landing-page-root" className="hover:text-zinc-300">Engineering Rules</a>
          </div>
        </div>
        <div className="pt-6 border-t border-white/5 text-[10px] text-zinc-650 leading-normal max-w-3xl mx-auto">
          &copy; 2026 SARDYX AI Inc. All rights reserved. Self-hosted multi-model router, intelligent memory stacks, and vector-graphic outputs are fully registered frameworks of Sardar Abdullah Fazal projects.
        </div>
      </footer>
    </div>
  );
}
