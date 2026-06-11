/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Bot, Mail, Sparkles, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (email: string, name: string) => void;
  isGuestBlocked?: boolean;
}

export default function AuthModal({ isOpen, onClose, onLoginSuccess, isGuestBlocked = false }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide a valid email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name }),
      });

      if (response.ok) {
        const data = await response.json();
        onLoginSuccess(data.user.email, data.user.name);
        onClose();
      } else {
        const errData = await response.json();
        setError(errData.error || 'Authentication handshake rejected.');
      }
    } catch (err) {
      setError('Connection to security auth core failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-modal-root" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050505]/90 backdrop-blur-md animate-fade-in">
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="relative w-full max-w-md p-8 rounded-3xl bg-[#0a0a0a] border border-white/10 shadow-2xl overflow-hidden"
      >
        {/* Decorative glowing gradient backdrop conforme to design */}
        <div className="absolute top-[-20%] left-[-20%] w-[150px] h-[150px] bg-indigo-600/20 rounded-full blur-2xl"></div>
        <div className="absolute bottom-[-10%] right-[-1%] w-[150px] h-[150px] bg-cyan-650/10 rounded-full blur-2xl"></div>

        {/* Header logos */}
        <div className="text-center relative z-10 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mx-auto mb-4">
            <span className="text-black font-black text-lg">S</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
            {isGuestBlocked ? 'Guest Limit Replaced' : 'Welcome to SARDYX AI'}
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm">
            {isGuestBlocked 
              ? 'You have sent exactly 1 free guest query. Please Register/Sign In to continue with unlimited bandwidth.'
              : 'Sign in to configure personalized cognitive assistants.'}
          </p>
        </div>

        {isGuestBlocked && (
          <div className="mb-6 p-4 rounded-xl bg-indigo-950/20 border border-indigo-505/30 text-xs text-indigo-300 flex gap-2.5 items-start">
            <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <span className="font-semibold block mb-0.5">Exactly 1 Message privilege met</span>
              Access saved histories, autonomous reasoning workflows, dynamic user memories, and dynamic image renders.
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-900/40 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-zinc-400 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-550" />
              <input
                type="email"
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#050505] border border-white/5 focus:border-indigo-500 px-10 py-3 rounded-xl text-sm text-zinc-100 placeholder-zinc-650 outline-none transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-zinc-400 mb-1.5">
              Your Name (Optional)
            </label>
            <input
              type="text"
              placeholder="Sardar Abdullah Fazal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#050505] border border-white/5 focus:border-indigo-500 px-4 py-3 rounded-xl text-sm text-zinc-100 placeholder-zinc-650 outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-805 text-white font-medium rounded-xl text-sm transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? 'Verifying Coordinates...' : 'Continue with Email'}
          </button>
        </form>

        {!isGuestBlocked && (
          <button 
            onClick={onClose}
            className="w-full text-center mt-6 text-xs text-zinc-500 hover:text-zinc-400 transition-colors cursor-pointer"
          >
            Cancel and Return
          </button>
        )}
      </div>
    </div>
  );
}
