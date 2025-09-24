// src/hooks/useAuth.tsx - SIMPLIFIED VERSION
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

  // IMMEDIATE RESPONSE: Create instant profile from session, then fetch real data in background
  const fetchUserProfile = useCallback(async (userId: string, userEmail: string): Promise<UserProfile> => {
    // Create immediate fallback profile for instant UI response
    const immediateProfile: UserProfile = {
      id: userId,
      email: userEmail,
      username: userEmail.split('@')[0] || 'user',
      full_name: 'User',
      role: 'viewer', // Safe default that won't break permissions
      is_active: true,
      created_at: new Date().toISOString()
    };

    // Return immediate profile right away
    setTimeout(async () => {
      try {
        console.log('Background: Fetching actual profile for:', userId);

        // Try users table first (primary source)
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, username, full_name, role, is_active, created_at')
          .eq('id', userId)
          .single();

        if (userData && !userError) {
          console.log('Background: Profile found in users table');
          const actualProfile: UserProfile = {
            id: userData.id,
            email: userData.email,
            username: userData.username,
            full_name: userData.full_name,
            role: userData.role as UserRole || 'viewer',
            is_active: userData.is_active !== false,
            created_at: userData.created_at || new Date().toISOString()
          };
          
          // Update states with actual profile data
          setUserProfile(actualProfile);
          setCurrentUser(prev => prev ? {
            ...prev,
            role: actualProfile.role,
            username: actualProfile.username,
            full_name: actualProfile.full_name,
            is_active: actualProfile.is_active
          } : null);
          return;
        }

        // Fallback to user_profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('user_id, username, full_name, role, is_active, created_at')
          .eq('user_id', userId)
          .single();

        if (profileData && !profileError) {
          console.log('Background: Profile found in user_profiles table');
          const actualProfile: UserProfile = {
            id: profileData.user_id,
            email: userEmail,
            username: profileData.username,
            full_name: profileData.full_name,
            role: profileData.role as UserRole || 'viewer',
            is_active: profileData.is_active !== false,
            created_at: profileData.created_at || new Date().toISOString()
          };
          
          // Update states with actual profile data
          setUserProfile(actualProfile);
          setCurrentUser(prev => prev ? {
            ...prev,
            role: actualProfile.role,
            username: actualProfile.username,
            full_name: actualProfile.full_name,
            is_active: actualProfile.is_active
          } : null);
          return;
        }

        console.warn('Background: No profile found in either table, keeping fallback');
      } catch (error) {
        console.error('Background: Error fetching user profile:', error);
      }
    }, 0);

    return immediateProfile;
  }, []);

  // IMMEDIATE RESPONSE: Set UI state instantly, then upgrade in background
  const handleUserSession = useCallback(async (session: Session, showWelcome: boolean = false, bypassAuthCheck: boolean = false): Promise<void> => {
    if (isProcessingAuth.current && !bypassAuthCheck) {
      console.log('Auth already processing, skipping...');
      return;
    }
    
    if (!bypassAuthCheck) {
      isProcessingAuth.current = true;
    }
    
    try {
      console.log('Processing session for:', session.user.email);
      
      // IMMEDIATE: Get instant profile for fast UI response
      const profile = await fetchUserProfile(session.user.id, session.user.email || '');
      
      // Set all states immediately with the instant profile
      const authUser: AuthUser = {
        ...session.user,
        role: profile.role,
        username: profile.username,
        full_name: profile.full_name,
        is_active: profile.is_active
      };

      setSession(session);
      setCurrentUser(authUser);
      setUserProfile(profile);
      setIsAuthenticated(true);
      setLoading(false);

      if (showWelcome) {
        toast({
          title: 'Success',
          description: `Welcome back, ${profile.full_name || profile.username || 'User'}!`
        });
      }

      console.log('Session processing complete with immediate response');
      // Background profile fetch already started in fetchUserProfile
      
    } catch (error) {
      console.error('Error handling user session:', error);
      setLoading(false);
      toast({
        title: 'Authentication Error',
        description: 'Failed to authenticate user. Please try again.',
        variant: 'destructive'
      });
    } finally {
      if (!bypassAuthCheck) {
        isProcessingAuth.current = false;
      }
    }
  }, [fetchUserProfile, toast]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          await handleUserSession(session, false);
        } else {
          console.log('No active session found');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session) {
          // Only handle if not already processing (to avoid duplicate processing during login)
          if (!isProcessingAuth.current) {
            await handleUserSession(session, false);
          }
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setCurrentUser(null);
          setUserProfile(null);
          setIsAuthenticated(false);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Only update session, keep existing profile
          setSession(session);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [handleUserSession]);

  const login = async (email: string, password: string): Promise<boolean> => {
    if (isProcessingAuth.current) {
      console.log('Login already in progress');
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

      // Handle session directly in login instead of waiting for auth state change
      console.log('Login successful, processing session...');
      await handleUserSession(data.session, true, true); // bypassAuthCheck = true
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
      console.log('Logout already in progress');
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
        'manage_email_notifications', 'manage_equipment', 'view_equipment'
      ],
      manager: [
        // UPDATED: Manager now has the same permissions as admin (full access)
        'view_users', 'manage_users', 'delete_users',
        'view_financial_reports', 'view_earnings', 'edit_earnings',
        'manage_machines', 'view_machines', 'edit_machine_reports',
        'manage_venues', 'view_venues', 'manage_prizes', 'view_inventory',
        'manage_stock', 'manage_jobs', 'view_jobs', 'create_jobs',
        'update_job_status', 'manage_settings', 'view_analytics',
        'manage_email_notifications', 'manage_equipment', 'view_equipment'
      ],
      technician: [
        // UNCHANGED: Technician keeps the same limited access
        'view_machines', 'edit_machine_reports', 'view_venues',
        'view_inventory', 'view_jobs', 'create_jobs', 'update_job_status',
        'view_equipment'
      ],
      viewer: [
        'view_machines', 'view_venues', 'view_inventory', 'view_jobs',
        'view_equipment'
      ]
    };
  
    const userPermissions = rolePermissions[userProfile.role] || [];
    return userPermissions.includes('*') || userPermissions.includes(permission);
  };

  const canManageUsers = (): boolean => {
    if (!userProfile) return false;
    // UPDATED: Manager can now manage users like admin
    return userProfile.role === 'super_admin' || userProfile.role === 'admin' || userProfile.role === 'manager';
  };
  
  const canViewUsers = (): boolean => {
    if (!userProfile) return false;
    return hasPermission('view_users') || hasPermission('manage_users');
  };
  
  const canDeleteUsers = (): boolean => {
    if (!userProfile) return false;
    // UPDATED: Manager can now delete users like admin
    return userProfile.role === 'super_admin' || 
           (userProfile.role === 'admin' && hasPermission('delete_users')) ||
           (userProfile.role === 'manager' && hasPermission('delete_users'));
  };
  
  const canCreateUserWithRole = (targetRole: string): boolean => {
    if (!userProfile) return false;
    
    const roleHierarchy = {
      super_admin: ['super_admin', 'admin', 'manager', 'technician', 'viewer'],
      admin: ['manager', 'technician', 'viewer'],
      manager: ['manager', 'technician', 'viewer'], // UPDATED: Manager can create manager, technician, viewer
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
      'view-reports': 'view_financial_reports', // NEW: View Reports access
      'machines': 'view_machines',
      'venues': 'view_venues',
      'prizes': 'view_inventory',
      'jobs': 'view_jobs',
      'analytics': 'view_analytics',
      'email-notifications': 'manage_email_notifications',
      'dashboard': 'always',
      'map': 'view_venues',
      'parts': 'manage_stock',
      'equipment-hire': 'view_equipment' // NEW: Equipment Hire access
    };
  
    const requiredPermission = viewPermissions[view];
    if (requiredPermission === 'always') return true;
  
    // For view-reports, allow both view_financial_reports OR view_earnings permissions
    if (view === 'view-reports') {
      return hasPermission('view_financial_reports') || hasPermission('view_earnings');
    }
  
    // For equipment-hire, allow both view_equipment OR manage_equipment permissions
    if (view === 'equipment-hire') {
      return hasPermission('view_equipment') || hasPermission('manage_equipment');
    }
  
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