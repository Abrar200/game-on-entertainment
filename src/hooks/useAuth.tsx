import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { User, Session } from '@supabase/supabase-js';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error getting session:', error);
      } else {
        setSession(session);
        setCurrentUser(session?.user ?? null);
        setIsAuthenticated(!!session);
      }
      setLoading(false);
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setCurrentUser(session?.user ?? null);
        setIsAuthenticated(!!session);
        setLoading(false);

        if (event === 'SIGNED_IN') {
          toast({
            title: 'Success',
            description: `Welcome back!`
          });
        } else if (event === 'SIGNED_OUT') {
          toast({
            title: 'Logged Out',
            description: 'You have been logged out successfully'
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [toast]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: 'Login Failed',
          description: error.message,
          variant: 'destructive'
        });
        return false;
      }

      // Session will be set automatically by the auth state change listener
      return true;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Login failed. Please try again.',
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, metadata?: { username?: string }): Promise<boolean> => {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });

      if (error) {
        toast({
          title: 'Sign Up Failed',
          description: error.message,
          variant: 'destructive'
        });
        return false;
      }

      if (data.user && !data.session) {
        toast({
          title: 'Check Your Email',
          description: 'Please check your email for a confirmation link.',
        });
      }

      return true;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Sign up failed. Please try again.',
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to log out. Please try again.',
          variant: 'destructive'
        });
      }
      // The auth state change listener will handle updating the state
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to log out. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive'
        });
        return false;
      }

      toast({
        title: 'Password Reset Sent',
        description: 'Check your email for password reset instructions.',
      });
      return true;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send password reset email.',
        variant: 'destructive'
      });
      return false;
    }
  };

  return {
    isAuthenticated,
    loading,
    currentUser,
    session,
    login,
    signUp,
    logout,
    resetPassword
  };
};