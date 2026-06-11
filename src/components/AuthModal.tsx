/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, AlertCircle, ShieldCheck, Loader2, Mail, Lock, User, ArrowRight, CheckCircle2 } from 'lucide-react';
import { getSupabase, getSupabaseConfig } from '../lib/supabase';
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

  // Listen for callback events from our popup auth window (for Google Sign-In helper)
  useEffect(() => {
    const handlePopupMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { email: sEmail, name: sName, avatarUrl: sAvatarUrl, id: sId, access_token: sAccessToken, refresh_token: sRefreshToken } = event.data;
        onLoginSuccess(sEmail, sName, sAvatarUrl, sId, sAccessToken, sRefreshToken);
        onClose();
        setLoading(false);
      } else if (event.data?.type === 'OAUTH_AUTH_FAILURE') {
        setError(event.data.error || 'Identity provider rejected credentials handshake.');
        setLoading(false);
      }
    };

    window.addEventListener('message', handlePopupMessage);
    return () => {
      window.removeEventListener('message', handlePopupMessage);
    };
  }, [onLoginSuccess, onClose]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/google-url');
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        let errMsg = '';
        try {
          const json = JSON.parse(text);
          errMsg = json.error || json.message;
        } catch (e) {}
        throw new Error(errMsg || `HTTP error ${response.status}: ${text.slice(0, 150)}`);
      }
      const { url } = await response.json();

      if (!url) {
        throw new Error('Backchannel did not return a valid Google authorization payload.');
      }

      const width = 520;
      const height = 660;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const authWindow = window.open(
        url,
        'sardyx_google_oauth',
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
      );

      if (!authWindow) {
        throw new Error('Popup blocked! Please facilitate cookies or allow popups to continue Google Sign-In.');
      }
    } catch (err: any) {
      setError(err.message || 'Backchannel verification handshakes failed.');
      setLoading(false);
    }
  };

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
      const config = await getSupabaseConfig();

      if (config.isPlaceholder) {
        // Fallback local JSON database auth flow
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
            throw new Error(data.error || 'Failed to complete direct local registration.');
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
            throw new Error(data.error || 'Failed to complete direct local authentication.');
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
      } else {
        // Standard Supabase authentication flow
        const supabase = await getSupabase();
        
        if (authMode === 'signup') {
          const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                name: fullName,
                full_name: fullName,
              }
            }
          });

          if (signUpError) throw signUpError;

          if (data.user && data.session) {
            const user = data.user;
            const session = data.session;
            const userEmail = user.email || '';
            const name = user.user_metadata?.name || fullName || userEmail.split('@')[0];
            const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userEmail)}`;

            await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: userEmail,
                name,
                avatarUrl,
                id: user.id
              }),
            });

            onLoginSuccess(
              userEmail,
              name,
              avatarUrl,
              user.id,
              session.access_token,
              session.refresh_token
            );
            onClose();
          } else {
            setSuccess('Account registered successfully! If you have email verification enabled in your Supabase dashboard, please verify your email and sign in below. Otherwise, try to sign in directly.');
            setAuthMode('signin');
            setPassword('');
          }
        } else {
          const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (signInError) throw signInError;

          if (data.user && data.session) {
            const user = data.user;
            const session = data.session;
            const userEmail = user.email || '';
            const name = user.user_metadata?.name || user.user_metadata?.full_name || userEmail.split('@')[0];
            const avatarUrl = user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userEmail)}`;

            await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: userEmail,
                name,
                avatarUrl,
                id: user.id
              }),
            });

            onLoginSuccess(
              userEmail,
              name,
              avatarUrl,
              user.id,
              session.access_token,
              session.refresh_token
            );
            onClose();
          } else {
            throw new Error('Supabase did not establish an active session frame.');
          }
        }
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

        {/* Divider */}
        <div className="relative z-10 mb-5 flex items-center">
          <div className="flex-1 border-t border-zinc-900"></div>
          <span className="px-3 text-[10px] text-zinc-500 font-mono uppercase tracking-wider select-none">Or</span>
          <div className="flex-1 border-t border-zinc-900"></div>
        </div>

        {/* Primary Prompt Action button - Google remains as premium fallback */}
        <div className="space-y-4 relative z-10 mb-2">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#121212] hover:bg-[#1a1a1a] disabled:bg-zinc-900 border border-white/5 hover:border-white/10 text-zinc-300 font-medium rounded-xl text-xs transition-all flex items-center justify-center select-none cursor-pointer"
          >
            {/* High-fidelity Google Vector Asset */}
            <svg className="w-4 h-4 mr-2.5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            Google Single Sign-In
          </button>
          
          <div className="flex items-center justify-center gap-1.5 text-[9px] uppercase font-mono tracking-wider text-zinc-550 select-none">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-550" />
            <span>Securely managed by Supabase SSO & Auth Engine</span>
          </div>
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
