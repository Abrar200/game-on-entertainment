// src/hooks/useAuth.tsx - Fixed version that prevents loading loops
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { User, Session } from '@supabase/supabase-js';

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'technician' | 'viewer';

export interface AuthUser extends User {
  role?: UserRole;
  username?: string;
  full_name?: string;
  is_active?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const { toast } = useToast();
  
  // Prevent infinite loops with refs
  const isInitialized = useRef(false);
  const currentAttempt = useRef(0);
  const maxRetries = 3;

  // Enhanced profile fetching with retry logic
  const fetchUserProfile = async (userId: string, attempt: number = 1): Promise<UserProfile | null> => {
    try {
      console.log(`🔍 Fetching user profile (attempt ${attempt}/${maxRetries})...`);
      
      // Clear any problematic cache before fetching
      if (attempt === 1) {
        // Only clear on first attempt to avoid loops
        try {
          const cacheKeys = Object.keys(localStorage).filter(key => 
            key.includes('user') && !key.includes('auth-token')
          );
          cacheKeys.forEach(key => localStorage.removeItem(key));
        } catch (e) {
          // Ignore cache clearing errors
        }
      }

      const { data, error } = await supabase
        .from('users')
        .select('id, email, username, full_name, role, is_active, created_at')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error fetching user profile:', error);
        if (attempt < maxRetries) {
          console.log(`🔄 Retrying profile fetch (attempt ${attempt + 1})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          return fetchUserProfile(userId, attempt + 1);
        }
        throw error;
      }

      if (data) {
        console.log('✅ User profile fetched successfully:', data);
        return data;
      }

      // No profile found - this is expected for new users
      console.log('ℹ️ No user profile found for:', userId);
      return null;

    } catch (error) {
      console.error('❌ Error in fetchUserProfile:', error);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        return fetchUserProfile(userId, attempt + 1);
      }
      return null;
    }
  };

  const handleUserSession = async (session: Session, showWelcome: boolean = false) => {
    try {
      console.log('📱 Handling user session for:', session.user.email);
      
      const profile = await fetchUserProfile(session.user.id);
      
      if (profile && profile.is_active) {
        setSession(session);
        setCurrentUser({ ...session.user, ...profile });
        setUserProfile(profile);
        setIsAuthenticated(true);
        console.log('✅ User session established successfully');
        
        if (showWelcome) {
          toast({
            title: 'Success',
            description: `Welcome back, ${profile.full_name || profile.username || 'User'}!`
          });
        }
      } else if (profile && !profile.is_active) {
        console.log('⛔ User account is inactive');
        await supabase.auth.signOut();
        toast({
          title: 'Account Inactive',
          description: 'Your account has been deactivated. Please contact an administrator.',
          variant: 'destructive'
        });
        handleSignOut();
      } else {
        // No profile found - sign out to prevent loops
        console.log('❌ No profile found, signing out to prevent loops');
        await supabase.auth.signOut();
        handleSignOut();
        toast({
          title: 'Access Denied',
          description: 'Your account is not properly configured.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('❌ Error handling user session:', error);
      await supabase.auth.signOut();
      handleSignOut();
    }
  };

  const handleSignOut = () => {
    console.log('🧹 Clearing all auth state...');
    setSession(null);
    setCurrentUser(null);
    setUserProfile(null);
    setIsAuthenticated(false);
    
    // Clear any cached user data to prevent stale data issues
    try {
      const userKeys = Object.keys(localStorage).filter(key => 
        key.includes('user') && !key.includes('auth-token') && !key.includes('sb-')
      );
      userKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log('🗑️ Cleared:', key);
      });
      
      // Also clear sessionStorage
      const sessionKeys = Object.keys(sessionStorage).filter(key => 
        key.includes('user') && !key.includes('auth-token') && !key.includes('sb-')
      );
      sessionKeys.forEach(key => {
        sessionStorage.removeItem(key);
        console.log('🗑️ Cleared session:', key);
      });
    } catch (e) {
      console.warn('⚠️ Cache clearing failed:', e);
    }
    
    console.log('✅ Auth state cleared completely');
  };

  useEffect(() => {
    // Prevent multiple initializations
    if (isInitialized.current) return;
    isInitialized.current = true;

    console.log('🔐 Getting initial session...');

    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ Error getting session:', error);
          setLoading(false);
          return;
        }

        if (session) {
          console.log('📱 Found existing session for:', session.user.email);
          await handleUserSession(session, false); // Don't show welcome on initial load
        } else {
          console.log('ℹ️ No session found');
        }
      } catch (error) {
        console.error('❌ Error in getSession:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, 'Session exists:', !!session);
        
        // Reset attempt counter on new auth events
        currentAttempt.current = 0;
        
        if (event === 'SIGNED_IN' && session) {
          console.log('🔑 Processing SIGNED_IN event...');
          // Only handle if we don't already have this session
          if (!currentUser || currentUser.id !== session.user.id) {
            await handleUserSession(session, false); // Don't show welcome since login() handles it
          } else {
            console.log('ℹ️ Session already handled by login function');
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('🚪 Processing SIGNED_OUT event...');
          handleSignOut();
          toast({
            title: 'Logged Out',
            description: 'You have been logged out successfully'
          });
        } else if (event === 'TOKEN_REFRESHED' && session) {
          console.log('🔄 Processing TOKEN_REFRESHED event...');
          // Don't refetch profile on token refresh to avoid loops
          setSession(session);
          if (currentUser && userProfile) {
            setCurrentUser({
              ...session.user,
              role: userProfile.role,
              username: userProfile.username,
              full_name: userProfile.full_name,
              is_active: userProfile.is_active
            });
          }
        }
        
        setLoading(false);
      }
    );

    return () => {
      console.log('🧹 Cleaning up auth subscription...');
      subscription.unsubscribe();
    };
  }, [toast]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      console.log('🔐 Attempting login for:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Login error:', error);
        toast({
          title: 'Login Failed',
          description: error.message,
          variant: 'destructive'
        });
        return false;
      }

      if (!data.user || !data.session) {
        console.error('❌ No user data or session returned');
        toast({
          title: 'Login Failed',
          description: 'Invalid response from server',
          variant: 'destructive'
        });
        return false;
      }

      console.log('✅ Login successful, handling session immediately...');
      
      // Handle the session immediately instead of waiting for auth state change
      await handleUserSession(data.session, true);
      
      return true;
    } catch (error) {
      console.error('❌ Login exception:', error);
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

  const logout = async () => {
    try {
      console.log('🚪 Logging out...');
      setLoading(true);
      
      // Clear state IMMEDIATELY for better UX
      console.log('🧹 Clearing auth state immediately...');
      handleSignOut();
      
      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('❌ Logout error:', error);
        toast({
          title: 'Error',
          description: 'Failed to log out. Please try again.',
          variant: 'destructive'
        });
        // Don't restore state - better to be logged out than stuck
      } else {
        console.log('✅ Supabase logout successful');
      }
      
      // Force clear any remaining auth data
      try {
        await supabase.auth.getSession(); // This helps trigger cleanup
      } catch (e) {
        // Ignore errors here
      }
      
    } catch (error) {
      console.error('❌ Logout exception:', error);
      // Still clear state even if logout fails
      handleSignOut();
      toast({
        title: 'Error',
        description: 'Failed to log out. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check permissions - PRESERVED EXACTLY
  const hasPermission = (permission: string): boolean => {
    if (!userProfile) return false;
    
    const rolePermissions = {
      super_admin: ['*'], // All permissions
      admin: [
        'view_users', 'manage_users', 'delete_users', // User management
        'view_financial_reports', 'view_earnings', 'edit_earnings',
        'manage_machines', 'view_machines', 'edit_machine_reports',
        'manage_venues', 'view_venues', 'manage_prizes', 'view_inventory',
        'manage_stock', 'manage_jobs', 'view_jobs', 'create_jobs',
        'update_job_status', 'manage_settings', 'view_analytics',
        'manage_email_notifications'
      ],
      manager: [
        'view_users', // Can view but not manage users
        'view_earnings', 'manage_machines', 'view_machines',
        'edit_machine_reports', 'manage_venues', 'view_venues',
        'manage_prizes', 'view_inventory', 'manage_stock', 'manage_jobs',
        'view_jobs', 'create_jobs', 'update_job_status', 'view_analytics'
      ],
      technician: [
        'view_machines', 'edit_machine_reports', 'view_venues',
        'view_inventory', 'view_jobs', 'create_jobs', 'update_job_status'
      ],
      viewer: [
        'view_machines', 'view_venues', 'view_inventory', 'view_jobs'
      ]
    };
  
    const userPermissions = rolePermissions[userProfile.role] || [];
    return userPermissions.includes('*') || userPermissions.includes(permission);
  };

  // ALL USER MANAGEMENT FUNCTIONS PRESERVED EXACTLY
  const canManageUsers = (): boolean => {
    if (!userProfile) return false;
    return userProfile.role === 'super_admin' || userProfile.role === 'admin';
  };
  
  const canViewUsers = (): boolean => {
    if (!userProfile) return false;
    return hasPermission('view_users') || hasPermission('manage_users');
  };
  
  const canDeleteUsers = (): boolean => {
    if (!userProfile) return false;
    return userProfile.role === 'super_admin' || (userProfile.role === 'admin' && hasPermission('delete_users'));
  };
  
  const canCreateUserWithRole = (targetRole: string): boolean => {
    if (!userProfile) return false;
    
    const roleHierarchy = {
      super_admin: ['super_admin', 'admin', 'manager', 'technician', 'viewer'],
      admin: ['manager', 'technician', 'viewer'],
      manager: ['technician', 'viewer'],
      technician: [],
      viewer: []
    };
    
    const allowedRoles = roleHierarchy[userProfile.role as keyof typeof roleHierarchy] || [];
    return allowedRoles.includes(targetRole);
  };

  const canAccessView = (view: string): boolean => {
    if (!userProfile) return false;
  
    const viewPermissions = {
      'users': 'view_users',
      'reports': 'view_financial_reports',
      'machines': 'view_machines',
      'venues': 'view_venues',
      'prizes': 'view_inventory',
      'jobs': 'view_jobs',
      'analytics': 'view_analytics',
      'email-notifications': 'manage_email_notifications',
      'dashboard': 'always',
      'map': 'view_venues',
      'parts': 'manage_stock'  // <-- Add this line
    };
  
    const requiredPermission = viewPermissions[view];
    if (requiredPermission === 'always') return true;
  
    return requiredPermission ? hasPermission(requiredPermission) : false;
  };
  

  return {
    isAuthenticated,
    loading,
    currentUser,
    userProfile,
    session,
    login,
    logout,
    hasPermission,
    canAccessView,
    canManageUsers,
    canViewUsers,
    canDeleteUsers,
    canCreateUserWithRole
  };
};