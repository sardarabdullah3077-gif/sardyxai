/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import LandingPage from './components/LandingPage';
import ChatInterface from './components/ChatInterface';
import AuthModal from './components/AuthModal';
import UserDashboard from './components/UserDashboard';
import { UserProfile } from './types';
import { getSupabase } from './lib/supabase';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'landing' | 'workspace'>('landing');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userToken, setUserToken] = useState<string>('');
  const [guestToken, setGuestToken] = useState<string>('');
  
  // Modal / overlay states
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isGuestBlocked, setIsGuestBlocked] = useState(false);

  useEffect(() => {
    // Initialize or read guest tracker finger-token
    let gToken = localStorage.getItem('sardyx_guest_key');
    if (!gToken) {
      gToken = `guest-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
      localStorage.setItem('sardyx_guest_key', gToken);
    }
    setGuestToken(gToken);

    // Bootstrap user session from local storage token OR Supabase persistence
    const bootstrapSession = async () => {
      // 1. Try restoring Supabase persistent Google session first
      try {
        const supabase = await getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          const sUser = session.user;
          const email = sUser.email || "";
          const name = sUser.user_metadata?.full_name || sUser.user_metadata?.name || email.split('@')[0];
          const avatarUrl = sUser.user_metadata?.avatar_url || sUser.user_metadata?.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`;
          const id = sUser.id;

          localStorage.setItem('sardyx_auth_token', email);
          setUserToken(email);
          setUser({
            id,
            email,
            name,
            role: 'user',
            createdAt: sUser.created_at || new Date().toISOString(),
            avatarUrl,
          });

          // Sync with custom central server record to ensure compatibility
          await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name, avatarUrl, id }),
          });

          setCurrentScreen('workspace');
          setIsGuestBlocked(false);
          return;
        }
      } catch (err) {
        console.error("Failed to restore Supabase secure session:", err);
      }

      // 2. Fallback to existing manual token handshake check
      const savedToken = localStorage.getItem('sardyx_auth_token');
      if (savedToken) {
        fetchUserSession(savedToken);
      }
    };

    bootstrapSession();
    
    // Evaluate guest locking logs from server on load
    checkGuestLock(gToken);
  }, []);

  const fetchUserSession = async (token: string) => {
    try {
      const response = await fetch('/api/auth/session', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.session && data.session.user) {
          setUser(data.session.user);
          setUserToken(token);
          // Auto route to playground if authenticated
          setCurrentScreen('workspace');
        } else {
          localStorage.removeItem('sardyx_auth_token');
        }
      }
    } catch (err) {
      console.error("Auth sync error:", err);
    }
  };

  const checkGuestLock = async (gToken: string) => {
    try {
      const response = await fetch('/api/security/check-guest-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestToken: gToken }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.currentCount >= 1 && !user) {
          setIsGuestBlocked(true);
        } else {
          setIsGuestBlocked(false);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLoginSuccess = async (
    email: string, 
    name: string, 
    avatarUrl?: string, 
    id?: string, 
    access_token?: string, 
    refresh_token?: string
  ) => {
    localStorage.setItem('sardyx_auth_token', email);
    setUserToken(email);
    
    const userProfile: UserProfile = {
      id: id || `usr-${Date.now()}`,
      email,
      name: name || email.split('@')[0],
      role: 'user',
      createdAt: new Date().toISOString(),
      avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
    };

    setUser(userProfile);
    setIsGuestBlocked(false);
    setCurrentScreen('workspace');

    // Securely cache Supabase Session for complete token-refresh persistence
    if (access_token && refresh_token) {
      try {
        const supabase = await getSupabase();
        await supabase.auth.setSession({
          access_token,
          refresh_token
        });
      } catch (err) {
        console.error("Failed to commit session to Supabase Engine:", err);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user?.email }),
      });
    } catch (err) {
      console.error(err);
    }

    try {
      const supabase = await getSupabase();
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Failed to clear Supabase central session:", err);
    }

    localStorage.removeItem('sardyx_auth_token');
    setUser(null);
    setUserToken('');
    setCurrentScreen('landing');
    
    // Check limits again to configure guest locks correctly on logout
    if (guestToken) {
      checkGuestLock(guestToken);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 overflow-x-hidden relative select-none">
      
      {/* Route Animation Wrapper */}
      <AnimatePresence mode="wait">
        {currentScreen === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
          >
            <LandingPage 
              onStartSession={() => setCurrentScreen('workspace')}
              onOpenAuth={() => setIsAuthOpen(true)}
              isAuthenticated={!!user}
            />
          </motion.div>
        )}

        {currentScreen === 'workspace' && (
          <motion.div
            key="workspace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-screen w-screen"
          >
            <ChatInterface 
              user={user}
              onLogout={handleLogout}
              onOpenDashboard={() => setIsDashboardOpen(true)}
              onOpenAuth={() => {
                setIsGuestBlocked(true);
                setIsAuthOpen(true);
              }}
              guestToken={guestToken}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL OVERLAYS */}
      {isAuthOpen && (
        <AuthModal 
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onLoginSuccess={handleLoginSuccess}
          isGuestBlocked={isGuestBlocked && !user}
        />
      )}

      {isDashboardOpen && user && (
        <UserDashboard 
          user={user}
          userToken={userToken}
          onClose={() => setIsDashboardOpen(false)}
        />
      )}
    </div>
  );
}
