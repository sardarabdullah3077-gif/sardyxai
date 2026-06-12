/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, AlertCircle, Loader2, Mail, Lock, User, ArrowRight, CheckCircle2 } from 'lucide-react';
import sardyxLogo from '../assets/images/sx_logo.jpg';

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
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'verify'>('signin');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/google');
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to initialize Google sign-in.');
      }
    } catch (err: any) {
      setError(err.message || 'Google sign-in is not available. Please use email sign-in.');
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
      if (authMode === 'signup') {
        const response = await fetch('/api/auth/local-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name: fullName }),
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

        if (data.verificationRequired) {
          setAuthMode('verify');
          setSuccess('Account created! A 6-digit verification code has been sent to your email. Check your inbox and spam folder.');
          setCooldown(60);
          return;
        }

        onLoginSuccess(
          data.user.email,
          data.user.name,
          data.user.avatarUrl,
          data.user.id,
          '',
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
          if (data.error === 'EMAIL_NOT_VERIFIED') {
            setAuthMode('verify');
            setError('Please verify your email address before signing in. A new code has been sent.');
            setCooldown(60);

            fetch('/api/auth/resend-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email }),
            }).catch(() => {});
            return;
          }
          throw new Error(data.error || 'Failed to authenticate.');
        }

        onLoginSuccess(
          data.user.email,
          data.user.name,
          data.user.avatarUrl,
          data.user.id,
          data.token || '',
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

  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otpCode.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify code.');
      }

      setSuccess('Email verified successfully!');
      setTimeout(() => {
        onLoginSuccess(
          data.user.email,
          data.user.name,
          data.user.avatarUrl,
          data.user.id,
          data.token || '',
          ''
        );
        onClose();
      }, 800);
    } catch (err: any) {
      setError(err.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code.');
      }

      setSuccess('Verification code resent! Check your inbox and spam folder.');
      setCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-modal-root" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050505]/95 backdrop-blur-md overflow-y-auto animate-fade-in scrollbar-light">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm p-8 my-8 rounded-3xl bg-[#0a0a0a] border border-white/10 shadow-2xl text-center overflow-visible"
      >
        {/* Decorative ambient glow */}
        <div className="absolute top-[-20%] left-[-20%] w-[180px] h-[180px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-1%] w-[180px] h-[180px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Brand header */}
        <div className="relative z-10 mb-6 mt-2">
          <img
            src={sardyxLogo}
            alt="Sardyx AI"
            className="w-14 h-14 rounded-2xl object-cover shadow-xl mx-auto mb-4"
            referrerPolicy="no-referrer"
          />
          <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
            {authMode === 'signin' ? 'Sign In' : authMode === 'signup' ? 'Create Account' : 'Verify Email'}
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm max-w-xs mx-auto">
            {authMode === 'verify'
              ? 'Enter the 6-digit code sent to your email.'
              : isGuestBlocked
                ? 'Your free limit has been reached. Sign in to continue.'
                : 'Access your AI workspace with a free account.'}
          </p>
        </div>

        {isGuestBlocked && authMode !== 'verify' && (
          <div className="mb-6 p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/25 text-left text-xs text-indigo-200 flex gap-3 items-start">
            <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5 text-zinc-100">Free Limit Reached</span>
              Sign in to unlock unlimited messages and saved conversations.
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

        {authMode === 'verify' ? (
          <form onSubmit={handleVerifyOtpSubmit} className="space-y-4 mb-6 relative z-10 text-left">
            <div>
              <div className="text-xs text-zinc-400 mb-4 bg-zinc-900/40 p-3 rounded-xl border border-white/5">
                Code sent to <strong className="text-zinc-200">{email}</strong>. Check spam if not in inbox.
              </div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 font-mono uppercase tracking-wider">Verification Code</label>
              <input
                type="text"
                maxLength={6}
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                disabled={loading}
                required
                className="w-full bg-[#121212] border border-white/10 rounded-xl py-3 px-4 text-lg text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors tracking-[0.5em] text-center font-bold font-mono"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-950 text-white font-semibold rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Verify</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              disabled={loading || cooldown > 0}
              onClick={handleResendOtp}
              className="w-full py-2.5 px-5 bg-[#121212] hover:bg-[#181818] border border-white/5 disabled:bg-zinc-950 disabled:opacity-50 text-zinc-300 hover:text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {cooldown > 0 ? `Resend Code (${cooldown}s)` : 'Resend Code'}
            </button>
          </form>
        ) : (
          <>
            {/* Google Sign In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full mb-4 py-3 px-5 bg-white hover:bg-zinc-100 text-black font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 relative z-10"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="flex-1 h-px bg-white/10"></div>
              <span className="text-[10px] text-zinc-500 font-mono uppercase">or</span>
              <div className="flex-1 h-px bg-white/10"></div>
            </div>

            {/* Email form */}
            <form onSubmit={handleEmailAuthSubmit} className="space-y-4 mb-6 relative z-10 text-left">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Full Name</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-500">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={loading}
                      required
                      className="w-full bg-[#121212] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                    className="w-full bg-[#121212] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    className="w-full bg-[#121212] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-950 text-white font-semibold rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{authMode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {/* Auth mode toggle */}
        <div className="relative z-10 text-xs text-zinc-400 font-medium mb-6">
          {authMode === 'verify' ? (
            <span>
              Need to change email?{' '}
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setError(''); setSuccess(''); }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold underline cursor-pointer"
              >
                Sign Up Again
              </button>
            </span>
          ) : authMode === 'signin' ? (
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
            className="text-zinc-600 hover:text-zinc-400 text-xs block w-full text-center transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
