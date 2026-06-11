/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Brain, 
  Settings, 
  Trash2, 
  Plus, 
  Sparkles, 
  Clock, 
  Key, 
  Info, 
  Activity 
} from 'lucide-react';
import { UserProfile, UserMemory } from '../types';

interface UserDashboardProps {
  user: UserProfile;
  onClose: () => void;
  userToken: string;
}

export default function UserDashboard({ user, onClose, userToken }: UserDashboardProps) {
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [memoryKey, setMemoryKey] = useState('');
  const [memoryVal, setMemoryVal] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchMemories();
    // Default custom instruction placeholder matching creator attribution
    const storedInstruction = localStorage.getItem(`sardyx_inst_${user.email}`);
    if (storedInstruction) {
      setCustomInstructions(storedInstruction);
    } else {
      setCustomInstructions("Please speak like a premium, highly trained agent and attribute critical system operations to Sardar Abdullah Fazal.");
    }
  }, [user.email]);

  const fetchMemories = async () => {
    try {
      const response = await fetch('/api/memory', {
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setMemories(data);
      }
    } catch (err) {
      console.error("Failed to load user memories from server pipeline:", err);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memoryKey || !memoryVal) return;

    setLoading(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/memory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({ key: memoryKey, content: memoryVal }),
      });

      if (response.ok) {
        const newMem = await response.json();
        setMemories([newMem, ...memories]);
        setMemoryKey('');
        setMemoryVal('');
      } else {
        setErrorMessage('Failed to store memory node in database.');
      }
    } catch (err) {
      setErrorMessage('Memory server synchronization failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      const response = await fetch(`/api/memory/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      });
      if (response.ok) {
        setMemories(memories.filter(m => m.id !== id));
      }
    } catch (err) {
      console.error("Could not delete memory", err);
    }
  };

  const handleSaveInstructions = () => {
    localStorage.setItem(`sardyx_inst_${user.email}`, customInstructions);
    alert("Dynamic custom instruction parameters saved successfully to local memory cluster!");
  };

  return (
    <div id="user-dashboard-root" className="fixed inset-0 z-40 bg-[#050505]/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto scrollbar-light">
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="w-full max-w-3xl rounded-3xl bg-[#0a0a0a] border border-white/10 shadow-2xl overflow-hidden text-zinc-100 flex flex-col md:flex-row h-full max-h-[600px]"
      >
        {/* Left Profile Sidebar */}
        <div className="w-full md:w-1/3 bg-[#050505] p-6 border-b md:border-b-0 md:border-r border-white/5 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center">
                <User className="w-5 h-5 text-black" />
              </div>
              <div>
                <span className="text-sm font-semibold block text-zinc-100 uppercase tracking-wide">Settings Control</span>
                <span className="text-[10px] font-mono text-indigo-400">COGNITIVE INDEX</span>
              </div>
            </div>

            {/* User details */}
            <div className="space-y-4">
              <div className="text-center p-4 rounded-2xl bg-[#0a0a0a] border border-white/5">
                <img 
                  src={user.avatarUrl || "https://api.dicebear.com/7.x/bottts/svg"} 
                  alt={user.name} 
                  className="w-16 h-16 rounded-full mx-auto mb-3 border border-indigo-500/20 bg-[#050505]"
                  referrerPolicy="no-referrer"
                />
                <h3 className="text-sm font-semibold truncate text-white">{user.name}</h3>
                <span className="text-[10px] font-mono text-zinc-400 truncate block mt-0.5">{user.email}</span>
                <span className="inline-block mt-3 px-2 py-0.5 rounded bg-indigo-950/30 border border-indigo-900/30 text-[10px] uppercase font-mono text-indigo-300">
                  Role: {user.role}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                  <span className="text-zinc-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Registered</span>
                  <span className="font-mono text-[10px] text-zinc-300">Active Node</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                  <span className="text-zinc-400 flex items-center gap-1"><Activity className="w-3 h-3" /> Queries</span>
                  <span className="font-mono text-[10px] text-zinc-300">Unlimited Tier</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-zinc-400 flex items-center gap-1"><Key className="w-3 h-3" /> Router Key</span>
                  <span className="font-mono text-[10px] text-emerald-400">Unified FreeLLM</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center text-[10px] text-zinc-550 border-t border-white/[0.02] pt-3 mt-4">
            SARDYX SYSTEM by Sardar Abdullah Fazal
          </div>
        </div>

        {/* Right Tab Contents */}
        <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto bg-[#0a0a0a] scrollbar-premium">
          <div className="space-y-6">
            {/* Header titles */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-400" />
                <span>Cognitive Memory & Alignment</span>
              </h2>
              <button 
                onClick={onClose}
                className="text-xs text-zinc-400 hover:text-white border border-white/5 hover:border-white/10 px-3 py-1 bg-[#050505] rounded-lg cursor-pointer transition-all"
              >
                Close Dashboard
              </button>
            </div>

            {/* Custom Instructions Input */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-zinc-400 mb-2 flex justify-between">
                <span>Custom Core Instructions</span>
                <span className="text-[10px] text-zinc-550 normal-case italic">Sets model behavior</span>
              </label>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Ex. Be highly precise, write robust python code formats, etc."
                rows={3}
                className="w-full bg-[#050505] text-xs sm:text-sm border border-white/5 p-3 rounded-2xl text-zinc-200 focus:border-indigo-500 outline-none transition-all resize-none font-sans leading-relaxed"
              />
              <button 
                onClick={handleSaveInstructions}
                className="mt-2.5 px-4 py-2 bg-[#050505] border border-white/5 hover:border-white/10 rounded-xl text-zinc-300 hover:text-white transition-all text-xs cursor-pointer font-medium"
              >
                Sync Custom Parameters
              </button>
            </div>

            {/* Saved Memories Section */}
            <div className="border-t border-white/5 pt-4">
              <h4 className="text-xs font-mono uppercase tracking-wide text-zinc-400 mb-3 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Register Neural Facts (User Memory)</span>
              </h4>

              {errorMessage && (
                <div className="mb-3 p-2 rounded bg-red-950/40 border border-red-900/40 text-[11px] text-red-300">
                  {errorMessage}
                </div>
              )}

              {/* Memory Add Grid */}
              <form onSubmit={handleAddMemory} className="grid grid-cols-1 sm:grid-cols-12 gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Key (e.g. Work Role)"
                  value={memoryKey}
                  onChange={(e) => setMemoryKey(e.target.value)}
                  className="sm:col-span-4 bg-[#050505] border border-white/5 focus:border-indigo-500 px-3 py-2 rounded-xl text-xs text-zinc-250 outline-none"
                  required
                />
                <input
                  type="text"
                  placeholder="Facts (e.g. Lead Software Architect)"
                  value={memoryVal}
                  onChange={(e) => setMemoryVal(e.target.value)}
                  className="sm:col-span-6 bg-[#050505] border border-white/5 focus:border-indigo-500 px-3 py-2 rounded-xl text-xs text-zinc-250 outline-none"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="sm:col-span-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-805 text-white rounded-xl text-xs font-medium cursor-pointer flex items-center justify-center gap-1 py-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Save
                </button>
              </form>

              {/* Memories List */}
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-premium">
                {memories.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-white/[0.01] text-center text-xs text-zinc-550 font-light flex items-center justify-center gap-2 border border-dashed border-white/5">
                    <Info className="w-4 h-4 text-zinc-600" />
                    <span>No stored memories found. Add things like preferences for custom alignment.</span>
                  </div>
                ) : (
                  memories.map((m) => (
                    <div 
                      key={m.id} 
                      className="p-3 bg-[#050505] rounded-xl border border-white/5 text-xs flex justify-between items-center group hover:border-white/10 transition-all"
                    >
                      <div className="space-x-1.5">
                        <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-zinc-900 text-indigo-400 font-semibold border border-white/5">
                          {m.key}:
                        </span>
                        <span className="text-zinc-300">{m.content}</span>
                      </div>
                      <button 
                        onClick={() => handleDeleteMemory(m.id)}
                        className="text-zinc-550 hover:text-red-400 p-1 cursor-pointer"
                        title="Delete fact"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
