// src/hooks/useAuth.tsx - OPTIMIZED VERSION
import { useState, useEffect, useCallback, useRef } from 'react';
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
  
  const isProcessingAuth = useRef(false);

  // Simple sign out function
  const handleSignOut = useCallback(async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setCurrentUser(null);
      setUserProfile(null);
      setIsAuthenticated(false);
      setLoading(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, []);

  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      // FIRST: Try to get immediate session data for fast fallback
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) return null;
      
      // Create immediate fallback profile for fast response
      const immediateFallback: UserProfile = {
        id: userId,
        email: currentSession.user.email || '',
        username: currentSession.user.email?.split('@')[0] || 'user',
        full_name: currentSession.user.user_metadata?.full_name || 'User',
        role: (currentSession.user.user_metadata?.role as UserRole) || 'viewer',
        is_active: true,
        created_at: new Date().toISOString()
      };
      
      // Return fallback immediately for fast UI response
      // The actual DB query will happen in the background
      setTimeout(async () => {
        try {
          // Try users table
          const { data, error } = await supabase
            .from('users')
            .select('id, email, username, full_name, role, is_active, created_at')
            .eq('id', userId)
            .maybeSingle();

          if (error || !data) {
            // Fallback to user_profiles
            const { data: profileData } = await supabase
              .from('user_profiles')
              .select('user_id, username, full_name, role, is_active, created_at')
              .eq('user_id', userId)
              .maybeSingle();

            if (profileData) {
              const actualProfile: UserProfile = {
                id: profileData.user_id,
                email: currentSession.user.email || '',
                username: profileData.username,
                full_name: profileData.full_name,
                role: profileData.role as UserRole || 'viewer',
                is_active: profileData.is_active !== false,
                created_at: profileData.created_at || new Date().toISOString()
              };
              
              // Update with actual profile data
              setUserProfile(actualProfile);
              setCurrentUser(prev => prev ? {
                ...prev,
                role: actualProfile.role,
                username: actualProfile.username,
                full_name: actualProfile.full_name,
                is_active: actualProfile.is_active
              } : null);
            }
          } else if (data) {
            const actualProfile: UserProfile = {
              id: data.id,
              email: data.email,
              username: data.username,
              full_name: data.full_name,
              role: data.role as UserRole || 'viewer',
              is_active: data.is_active !== false,
              created_at: data.created_at || new Date().toISOString()
            };
            
            // Update with actual profile data
            setUserProfile(actualProfile);
            setCurrentUser(prev => prev ? {
              ...prev,
              role: actualProfile.role,
              username: actualProfile.username,
              full_name: actualProfile.full_name,
              is_active: actualProfile.is_active
            } : null);
          }
        } catch (error) {
          console.error('Background profile fetch error:', error);
        }
      }, 0);
      
      return immediateFallback;
      
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  }, []);

  const handleUserSession = useCallback(async (session: Session, showWelcome: boolean = false): Promise<void> => {
    if (isProcessingAuth.current) return;
    
    isProcessingAuth.current = true;
    
    try {
      setLoading(true);
      
      // Create immediate session response for fast UI
      const immediateUser: AuthUser = {
        ...session.user,
        role: (session.user.user_metadata?.role as UserRole) || 'viewer',
        username: session.user.email?.split('@')[0] || 'user',
        full_name: session.user.user_metadata?.full_name || 'User',
        is_active: true
      };
      
      const immediateProfile: UserProfile = {
        id: session.user.id,
        email: session.user.email || '',
        username: immediateUser.username,
        full_name: immediateUser.full_name,
        role: immediateUser.role as UserRole,
        is_active: true,
        created_at: new Date().toISOString()
      };

      setSession(session);
      setCurrentUser(immediateUser);
      setUserProfile(immediateProfile);
      setIsAuthenticated(true);
      setLoading(false);

      // Fetch actual profile in background
      setTimeout(async () => {
        try {
          const profile = await fetchUserProfile(session.user.id);
          
          if (profile) {
            setUserProfile(profile);
            setCurrentUser(prev => prev ? {
              ...prev,
              role: profile.role,
              username: profile.username,
              full_name: profile.full_name,
              is_active: profile.is_active
            } : null);
            
            if (showWelcome) {
              toast({
                title: 'Success',
                description: `Welcome back, ${profile.full_name || profile.username || 'User'}!`
              });
            }
            
            if (!profile.is_active) {
              console.log('User account is inactive');
              await handleSignOut();
              toast({
                title: 'Account Inactive',
                description: 'Your account has been deactivated.',
                variant: 'destructive'
              });
            }
          }
        } catch (error) {
          console.error('Background profile update error:', error);
        }
      }, 0);
      
    } catch (error) {
      console.error('Error handling user session:', error);
      setLoading(false);
    } finally {
      isProcessingAuth.current = false;
    }
  }, [fetchUserProfile, toast, handleSignOut]);

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await handleUserSession(session, false);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          await handleUserSession(session, true);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setCurrentUser(null);
          setUserProfile(null);
          setIsAuthenticated(false);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Just update the session without re-fetching profile
          setSession(session);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [handleUserSession]);

  const login = async (email: string, password: string): Promise<boolean> => {
    if (isProcessingAuth.current) {
      console.log('Login already in progress, skipping...');
      return false;
    }

    isProcessingAuth.current = true;

    try {
      setLoading(true);
      console.log('Attempting login for:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        toast({
          title: 'Login Failed',
          description: error.message,
          variant: 'destructive'
        });
        return false;
      }

      if (!data.user || !data.session) {
        console.error('No user data or session returned');
        toast({
          title: 'Login Failed',
          description: 'Invalid response from server',
          variant: 'destructive'
        });
        return false;
      }

      console.log('Login successful, handling session...');
      await handleUserSession(data.session, true);
      return true;
    } catch (error) {
      console.error('Login exception:', error);
      toast({
        title: 'Error',
        description: 'Login failed. Please try again.',
        variant: 'destructive'
      });
      return false;
    } finally {
      isProcessingAuth.current = false;
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    if (isProcessingAuth.current) {
      console.log('Logout already in progress, skipping...');
      return;
    }

    isProcessingAuth.current = true;

    try {
      console.log('Logging out...');
      setLoading(true);
      await handleSignOut();
    } catch (error) {
      console.error('Logout exception:', error);
      toast({
        title: 'Error',
        description: 'Failed to log out completely. Please try again.',
        variant: 'destructive'
      });
    } finally {
      isProcessingAuth.current = false;
      setLoading(false);
    }
  };

  // Helper function to check permissions
  const hasPermission = (permission: string): boolean => {
    if (!userProfile) return false;
    
    const rolePermissions = {
      super_admin: ['*'],
      admin: [
        'view_users', 'manage_users', 'delete_users',
        'view_financial_reports', 'view_earnings', 'edit_earnings',
        'manage_machines', 'view_machines', 'edit_machine_reports',
        'manage_venues', 'view_venues', 'manage_prizes', 'view_inventory',
        'manage_stock', 'manage_jobs', 'view_jobs', 'create_jobs',
        'update_job_status', 'manage_settings', 'view_analytics',
        'manage_email_notifications'
      ],
      manager: [
        'view_users',
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
      'parts': 'manage_stock'
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