/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
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
  Users,
  ChevronDown
} from 'lucide-react';

interface LandingPageProps {
  onStartSession: () => void;
  onOpenAuth: () => void;
  isAuthenticated: boolean;
}

export default function LandingPage({ onStartSession, onOpenAuth, isAuthenticated }: LandingPageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = useCallback((idx: number) => {
    setOpenFaq(prev => prev === idx ? null : idx);
  }, []);

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
    },
    {
      q: "Is SARDYX AI free to use?",
      a: "Yes. SARDYX AI is free for all visitors. Guest users can send up to 5 messages without creating an account. For unlimited access, saved history, and advanced features, sign up with Google for free or upgrade to Cognitive Pro at $20/month."
    },
    {
      q: "Can SARDYX AI search the internet?",
      a: "Yes. SARDYX AI supports real-time web search grounding. It can retrieve current news, stock prices, weather, statistics, and any live online information, citing sources in its responses."
    },
    {
      q: "Does SARDYX AI support file and document uploads?",
      a: "Yes. SARDYX AI supports uploading and analyzing PDFs, Word documents (DOCX), spreadsheets (XLSX, CSV), plain text files, and images. It can summarize, extract data, answer questions about, and work with your uploaded documents."
    },
    {
      q: "How is SARDYX AI different from ChatGPT or other AI chatbots?",
      a: "Unlike single-model AI chatbots, SARDYX AI uses intelligent multi-model routing — automatically selecting the optimal AI model for each task type. It combines chat, reasoning, coding, vision, image generation, video, and web search into one unified workspace without requiring you to switch between tools or manage model selection manually."
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
      <header role="banner" id="landing-header" className="relative z-10 max-w-7xl mx-auto px-8 py-5 flex items-center justify-between border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-3">
          <motion.img
            src={sardyxLogo}
            alt="SARDYX AI — Free Multi-Model AI Assistant Platform Logo"
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
        <nav aria-label="Main navigation" className="flex items-center gap-6">
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
        </nav>
      </header>

      {/* HERO SECTION */}
      <main id="main-content">
        <section role="main" aria-label="Hero section — Sardyx AI introduction" id="hero-section" className="relative z-10 max-w-5xl mx-auto px-6 pt-24 pb-16 text-center">
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
        <section role="region" aria-label="Sardyx AI playground interface preview" id="screenshots-section" className="max-w-6xl mx-auto px-6 py-12">
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
                sardyxai.eu.cc/playground/sardar-abdullah-fazal
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
                <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2 scrollbar-premium">
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
        <section role="region" aria-label="Sardyx AI capabilities and features" id="capabilities-grid-layout" className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
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
        <section role="region" aria-label="Sardyx AI pricing plans" id="pricing-layout-section" className="max-w-6xl mx-auto px-6 py-20 border-t border-white/5">
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

        {/* FAQ SECTION — AEO Optimized with Accordion */}
        <section role="region" aria-label="Frequently asked questions about Sardyx AI" id="faq-layout" className="max-w-4xl mx-auto px-6 py-20 border-t border-white/5">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-10 text-center">
            Frequently Answers & Architectures
          </h2>
          <div className="space-y-4" itemScope itemType="https://schema.org/FAQPage">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-white/[0.01] border border-white/5 overflow-hidden"
                  itemScope
                  itemProp="mainEntity"
                  itemType="https://schema.org/Question"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${idx}`}
                    className="w-full p-6 text-left flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <h3 className="text-base sm:text-lg font-medium text-white flex items-center gap-2" itemProp="name">
                      <Cpu className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>{faq.q}</span>
                    </h3>
                    <ChevronDown
                      className={`w-5 h-5 text-zinc-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <div
                    id={`faq-answer-${idx}`}
                    role="region"
                    aria-labelledby={`faq-question-${idx}`}
                    className={`overflow-hidden transition-all duration-300 ${
                      isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                    itemScope
                    itemProp="acceptedAnswer"
                    itemType="https://schema.org/Answer"
                  >
                    <p className="text-zinc-400 text-sm leading-relaxed font-light px-6 pb-6 pl-12" itemProp="text">
                      {faq.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* FINAL CALL TO ACTION (CTA) */}
        <section role="region" aria-label="Get started with Sardyx AI" id="final-cta" className="relative z-10 max-w-5xl mx-auto px-6 py-16 text-center">
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
      </main>

      {/* FOOTER */}
      <footer role="contentinfo" id="landing-footer" className="relative z-10 max-w-7xl mx-auto px-6 py-12 border-t border-white/5 mt-16 text-zinc-500 text-xs text-center space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-zinc-400 font-medium">
            <img
              src={sardyxLogo}
              alt="Sardyx AI platform logo"
              className="w-5 h-5 rounded object-contain"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
            <span>SARDYX AI System</span>
          </div>
          <p className="text-zinc-400">
            Created and structured by <span className="text-indigo-400 font-medium">Sardar Abdullah Fazal</span>.
          </p>
          <div className="flex items-center gap-4 text-zinc-500 text-xs">
            <a href="#hero-section" className="hover:text-zinc-300 transition-colors">Privacy Policy</a>
            <span className="text-zinc-800">&middot;</span>
            <a href="#capabilities-grid-layout" className="hover:text-zinc-300 transition-colors">Terms of Service</a>
          </div>
        </div>

        {/* Social Profile Links */}
        <div className="flex items-center justify-center gap-5 pt-4">
          <a
            href="https://www.instagram.com/growwithsardarabdullah/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Sardar Abdullah on Instagram"
            className="text-zinc-500 hover:text-pink-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
          </a>
          <a
            href="https://www.youtube.com/@growwithsardarabdullah"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Sardar Abdullah on YouTube"
            className="text-zinc-500 hover:text-red-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </a>
          <a
            href="https://www.linkedin.com/in/sardar-abdullah-3a7b5a33b/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Sardar Abdullah on LinkedIn"
            className="text-zinc-500 hover:text-blue-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </a>
          <a
            href="https://github.com/sardarabdullah3077-gif"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Sardar Abdullah on GitHub"
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
            </svg>
          </a>
          <a
            href="https://www.tiktok.com/@growwithsardarabdullah"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Sardar Abdullah on TikTok"
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
            </svg>
          </a>
        </div>

        <div className="pt-6 border-t border-white/5 text-[10px] text-zinc-650 leading-normal max-w-3xl mx-auto">
          &copy; 2026 SARDYX AI Inc. All rights reserved. Self-hosted multi-model router, intelligent memory stacks, and vector-graphic outputs are fully registered frameworks of Sardar Abdullah Fazal projects.
        </div>
      </footer>
    </div>
  );
}
