'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export function InactivityHandler() {
  const { user, logout } = useAuth();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const updateDbActivity = useCallback(async () => {
    if (!user) return;
    const now = Date.now();
    // Update DB only every 2 minutes to save resources
    if (now - lastUpdateRef.current < 120000) return;

    lastUpdateRef.current = now;
    try {
      await supabase
        .from('usuarios')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', user.id);
    } catch (e) {
      console.error('Error updating activity:', e);
    }
  }, [user]);

  const resetTimer = useCallback(() => {
    if (!user) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    updateDbActivity();

    const timeoutMinutes = parseInt(localStorage.getItem('session_timeout') || '30', 10);
    const timeoutMs = timeoutMinutes * 60 * 1000;

    timerRef.current = setTimeout(() => {
      console.log('Inactivity timeout reached. Logging out...');
      logout();
    }, timeoutMs);
  }, [user, logout, updateDbActivity]);

  useEffect(() => {
    if (!user) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const events = ['mousedown', 'keydown', 'touchstart', 'mousemove', 'scroll'];
    
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user, resetTimer]);

  return null;
}
