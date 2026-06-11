/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, AlertCircle, Loader2, Mail, Lock, User, ArrowRight, CheckCircle2 } from 'lucide-react';
import sardyxLogo from '../assets/images/sardyx_sa_emblem_1781174395689.png';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (
    email: string, 
    name: string, 
    avatarUrl?: string, 
    id?: string, 
    access_token?: string, 
    refresh_token?: string
  ) => void;
  isGuestBlocked?: boolean;
}

export default function AuthModal({ isOpen, onClose, onLoginSuccess, isGuestBlocked = false }: AuthModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  
  // Form values
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  if (!isOpen) return null;


  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide all mandatory fields.');
      return;
    }
    if (authMode === 'signup' && !fullName) {
      setError('Please provide your full name.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Use local email/password auth
      if (authMode === 'signup') {
        const response = await fetch('/api/auth/local-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, fullName }),
        });

        let data;
        try {
          data = await response.json();
        } catch {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create account.');
        }

        onLoginSuccess(
          data.user.email,
          data.user.name,
          data.user.avatarUrl,
          data.user.id,
          '', // Local token acts as bypass
          ''
        );
        onClose();
      } else {
        const response = await fetch('/api/auth/local-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        let data;
        try {
          data = await response.json();
        } catch {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        if (!response.ok) {
          throw new Error(data.error || 'Failed to authenticate.');
        }

        onLoginSuccess(
          data.user.email,
          data.user.name,
          data.user.avatarUrl,
          data.user.id,
          '', // Local token acts as bypass
          ''
        );
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication operation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-modal-root" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050505]/95 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="relative w-full max-w-sm p-8 my-8 rounded-3xl bg-[#0a0a0a] border border-white/10 shadow-2xl text-center overflow-visible"
      >
        {/* Decorative ambient glowing gradient */}
        <div className="absolute top-[-20%] left-[-20%] w-[180px] h-[180px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-1%] w-[180px] h-[180px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Brand visual header */}
        <div className="relative z-10 mb-6 mt-2">
          <img 
            src={sardyxLogo} 
            alt="SARDYX AI Premium Logo" 
            className="w-14 h-14 rounded-2xl object-cover shadow-xl shadow-indigo-550/15 mx-auto mb-4 animate-pulse"
            referrerPolicy="no-referrer"
          />
          <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
            {authMode === 'signin' ? 'Sign In' : 'Sign Up'} / SARDYX Core
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm max-w-xs mx-auto">
            {isGuestBlocked 
              ? 'Your free guest limit has been consumed. Register/Login with your Email and Password below.'
              : 'Provision secure digital memory contexts and retrieve encrypted chat historical records.'}
          </p>
        </div>

        {isGuestBlocked && (
          <div className="mb-6 p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/25 text-left text-xs text-indigo-200 flex gap-3 items-start">
            <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5 text-zinc-100">Sandbox Guest Limit Met</span>
              Unlock continuous message streams, custom semantic memories, and high-fidelity text-to-speech cognitive engines.
            </div>
          </div>
        )}

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-950/35 border border-red-900/35 text-xs text-red-300 text-left flex gap-2.5 items-center">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 p-3 rounded-xl bg-emerald-950/35 border border-emerald-900/35 text-xs text-emerald-300 text-left flex gap-2.5 items-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="flex-1">{success}</span>
          </div>
        )}

        {/* Standard Manual Credentials Form */}
        <form onSubmit={handleEmailAuthSubmit} className="space-y-4 mb-6 relative z-10 text-left">
          {authMode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 font-mono uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Amelia Vance"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  required
                  className="w-full bg-[#121212] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-650 focus:outline-none focus:border-indigo-500/85 focus:ring-1 focus:ring-indigo-500/35 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 font-mono uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                className="w-full bg-[#121212] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-650 focus:outline-none focus:border-indigo-500/85 focus:ring-1 focus:ring-indigo-500/35 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 font-mono uppercase tracking-wider">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                className="w-full bg-[#121212] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-650 focus:outline-none focus:border-indigo-500/85 focus:ring-1 focus:ring-indigo-500/35 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-5 bg-indigo-600 hover:bg-indigo-550 disabled:bg-indigo-950 text-white font-semibold rounded-xl text-sm transition-all shadow-lg hover:shadow-indigo-500/10 flex items-center justify-center gap-2 cursor-pointer select-none"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{authMode === 'signin' ? 'Sign In to Core' : 'Create Encrypted Profile'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Switch Auth Mode toggle link */}
        <div className="relative z-10 text-xs text-zinc-400 font-medium mb-6">
          {authMode === 'signin' ? (
            <span>
              Don't have an account?{' '}
              <button 
                type="button" 
                onClick={() => { setAuthMode('signup'); setError(''); setSuccess(''); }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold underline cursor-pointer"
              >
                Sign Up
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button 
                type="button" 
                onClick={() => { setAuthMode('signin'); setError(''); setSuccess(''); }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold underline cursor-pointer"
              >
                Sign In
              </button>
            </span>
          )}
        </div>

        {!isGuestBlocked && (
          <button 
            type="button"
            disabled={loading}
            onClick={onClose}
            className="text-zinc-650 hover:text-zinc-400 text-xs mt-6 block w-full text-center transition-colors cursor-pointer disabled:opacity-50 select-none"
          >
            Cancel and Return
          </button>
        )}
      </div>
    </div>
  );
}
