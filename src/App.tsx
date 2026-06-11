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

    // Bootstrap user session from local storage token
    const bootstrapSession = async () => {
      // Try restoring local email/password session
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
