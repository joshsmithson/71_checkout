import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isSigningIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const getSession = async () => {
      try {
        setLoading(true);
        const { data } = await supabase.auth.getSession();
        
        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
        }
        
        const { data: { subscription } } = await supabase.auth.onAuthStateChange(
          (_event, newSession) => {
            setSession(newSession);
            setUser(newSession?.user ?? null);
          }
        );
        
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Auth error:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();
  }, []);

  const signIn = async () => {
    try {
      setIsSigningIn(true);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        },
      });
      
      if (error) throw error;
      
    } catch (error) {
      console.error('Sign in error:', error);
      setIsSigningIn(false);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const value = {
    session,
    user,
    loading,
    isSigningIn,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 