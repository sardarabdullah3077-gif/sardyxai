/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, AlertCircle, ShieldCheck, Loader2 } from 'lucide-react';

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

  // Listen for callback events from our popup auth window
  useEffect(() => {
    const handlePopupMessage = (event: MessageEvent) => {
      const origin = event.origin;
      // Safety origin verification
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { email, name, avatarUrl, id, access_token, refresh_token } = event.data;
        onLoginSuccess(email, name, avatarUrl, id, access_token, refresh_token);
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

    try {
      // 1. Obtain authorization link from backchannel
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

      // 2. Open login popup Centered on screen
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

  return (
    <div id="auth-modal-root" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050505]/90 backdrop-blur-md animate-fade-in">
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="relative w-full max-w-md p-8 rounded-3xl bg-[#0a0a0a] border border-white/10 shadow-2xl overflow-hidden text-center"
      >
        {/* Decorative ambient glowing gradient */}
        <div className="absolute top-[-20%] left-[-20%] w-[180px] h-[180px] bg-indigo-600/15 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-1%] w-[180px] h-[180px] bg-cyan-500/10 rounded-full blur-3xl"></div>

        {/* Brand visual header */}
        <div className="relative z-10 mb-8 mt-2">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-cyan-400 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-550/15 mx-auto mb-4 animate-pulse">
            <span className="text-black font-black text-xl tracking-tighter">S</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
            {isGuestBlocked ? 'Authorization Required' : 'Access SARDYX Core'}
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm max-w-xs mx-auto">
            {isGuestBlocked 
              ? 'Your exactly 1 free guest sandbox message has been consumed. Initialize Google Single Sign-In to unlock full capabilities.'
              : 'Sign in utilizing your Google Workspace account to provision private computing memories and saved chat logs.'}
          </p>
        </div>

        {isGuestBlocked && (
          <div className="mb-6 p-4 rounded-2xl bg-indigo-950/25 border border-indigo-500/25 text-left text-xs text-indigo-200 flex gap-3 items-start animate-fade-in">
            <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5 text-zinc-100">Sandbox Guest Limit Met</span>
              Unlock unlimited queries, real-time context streaming, custom cognitive memories, and high-fidelity media rendering.
            </div>
          </div>
        )}

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-950/30 border border-red-900/35 text-xs text-red-300 text-left flex gap-2.5 items-center">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Primary Prompt Action button - Continuing with Google */}
        <div className="space-y-4 relative z-10 mb-2">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 px-5 bg-white hover:bg-zinc-100 disabled:bg-zinc-900 border border-white/5 text-zinc-950 font-semibold rounded-2xl text-sm transition-all shadow-lg hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center select-none"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mr-3 text-indigo-600" />
            ) : (
              /* High-fidelity Google Vector Asset */
              <svg className="w-5 h-5 mr-3 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
            )}
            {loading ? 'Bootstrapping Handshake...' : 'Continue with Google'}
          </button>
          
          <div className="flex items-center justify-center gap-1.5 text-[10px] uppercase font-mono tracking-wider text-zinc-500 select-none">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Securely managed by Supabase SSO</span>
          </div>
        </div>

        {!isGuestBlocked && (
          <button 
            disabled={loading}
            onClick={onClose}
            className="text-zinc-550 hover:text-zinc-400 text-xs mt-6 block w-full text-center transition-colors cursor-pointer disabled:opacity-50 select-none"
          >
            Cancel and Return
          </button>
        )}
      </div>
    </div>
  );
}
