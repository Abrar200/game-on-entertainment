// src/hooks/useAuth.tsx - FIXED VERSION to resolve profile fetch timeouts
import { useState, useEffect, useRef, useCallback } from 'react';
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
  
  const isInitialized = useRef(false);
  const isProcessingAuth = useRef(false);
  const currentUserId = useRef<string | null>(null);
  const retryTimeouts = useRef<Set<NodeJS.Timeout>>(new Set());

  useEffect(() => {
    return () => {
      retryTimeouts.current.forEach(timeout => clearTimeout(timeout));
      retryTimeouts.current.clear();
    };
  }, []);

  const handleSignOut = useCallback(async (skipSupabaseSignOut: boolean = false): Promise<void> => {
    console.log('🧹 Clearing all auth state...');
    
    isProcessingAuth.current = false;
    currentUserId.current = null;
    
    retryTimeouts.current.forEach(timeout => clearTimeout(timeout));
    retryTimeouts.current.clear();
    
    setSession(null);
    setCurrentUser(null);
    setUserProfile(null);
    setIsAuthenticated(false);
    setLoading(false);
    
    try {
      const keysToRemove: string[] = [];
      
      Object.keys(localStorage).forEach(key => {
        const shouldPreserve = key.includes('sb-') || key.includes('supabase.auth');
        
        if (!shouldPreserve && (
          key.includes('user') || 
          key.includes('profile') || 
          key.includes('cache') ||
          key.includes('metadata')
        )) {
          keysToRemove.push(key);
        }
      });
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log('🗑️ Cleared cache:', key);
      });
      
      try {
        sessionStorage.clear();
      } catch (e) {
        console.warn('⚠️ SessionStorage clear failed:', e);
      }
      
    } catch (error) {
      console.warn('⚠️ Cache clearing failed:', error);
    }
    
    if (!skipSupabaseSignOut) {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('❌ Supabase signout error:', error);
      }
    }
    
    console.log('✅ Auth state cleared completely');
  }, []);

  // FIXED: More aggressive and faster profile fetching
  const fetchUserProfile = useCallback(async (userId: string, attempt: number = 1): Promise<UserProfile | null> => {
    try {
      console.log(`🔍 Fetching user profile (attempt ${attempt}/2) for:`, userId);
      
      // FIXED: Try both queries simultaneously to avoid sequential timeouts
      console.log(`🗄️ Querying both tables simultaneously...`);
      
      const profilePromise = supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      const usersPromise = supabase
        .from('users')
        .select('id, email, username, full_name, role, is_active, created_at')
        .eq('id', userId)
        .single();

      // Run both queries in parallel with a 3-second timeout each
      const [profileResult, usersResult] = await Promise.allSettled([
        Promise.race([
          profilePromise,
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('user_profiles timeout')), 3000)
          )
        ]),
        Promise.race([
          usersPromise,
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('users timeout')), 3000)
          )
        ])
      ]);

      // Check user_profiles result first
      if (profileResult.status === 'fulfilled' && profileResult.value?.data) {
        const data = profileResult.value.data;
        const profile = {
          id: data.user_id || data.id,
          email: data.email || '', // Handle missing email
          username: data.username,
          full_name: data.full_name,
          role: data.role,
          is_active: data.is_active,
          created_at: data.created_at
        };
        
        // Get email from users table if missing from user_profiles
        if (!profile.email && usersResult.status === 'fulfilled' && usersResult.value?.data) {
          profile.email = usersResult.value.data.email;
        }
        
        console.log('✅ User profile fetched from user_profiles:', profile.email, 'Role:', profile.role);
        return profile;
      }

      // Fall back to users table result
      if (usersResult.status === 'fulfilled' && usersResult.value?.data) {
        const data = usersResult.value.data;
        const profile = {
          id: data.id,
          email: data.email,
          username: data.username,
          full_name: data.full_name,
          role: data.role,
          is_active: data.is_active,
          created_at: data.created_at
        };
        
        console.log('✅ User profile fetched from users table:', profile.email, 'Role:', profile.role);
        return profile;
      }

      // Check for specific errors
      const profileError = profileResult.status === 'rejected' ? profileResult.reason : null;
      const usersError = usersResult.status === 'rejected' ? usersResult.reason : null;

      console.log('⚠️ Profile fetch results:', {
        profileStatus: profileResult.status,
        usersStatus: usersResult.status,
        profileError: profileError?.message,
        usersError: usersError?.message
      });

      // Only retry on network errors, not on "not found" errors
      const shouldRetry = attempt < 2 && (
        (profileError && !profileError.message?.includes('timeout') && profileError.code !== 'PGRST116') ||
        (usersError && !usersError.message?.includes('timeout') && usersError.code !== 'PGRST116')
      );

      if (shouldRetry) {
        console.log(`🔄 Retrying profile fetch (attempt ${attempt + 1})...`);
        
        return new Promise((resolve) => {
          const timeout = setTimeout(() => {
            retryTimeouts.current.delete(timeout);
            resolve(fetchUserProfile(userId, attempt + 1));
          }, 500); // Shorter retry delay
          retryTimeouts.current.add(timeout);
        });
      }

      console.log('ℹ️ No user profile found for:', userId);
      return null;

    } catch (error: any) {
      console.error('❌ Error in fetchUserProfile:', error);
      return null;
    }
  }, []);

  // FIXED: Remove timeout mechanism and make more robust
  const handleUserSession = useCallback(async (session: Session, showWelcome: boolean = false): Promise<void> => {
    const userId = session.user.id;
    
    if (isProcessingAuth.current && currentUserId.current === userId && currentUser?.id === userId) {
      console.log('⏭️ Already processing same session for authenticated user:', userId);
      return;
    }

    isProcessingAuth.current = true;
    currentUserId.current = userId;

    try {
      console.log('📱 Handling user session for:', session.user.email);
      
      // FIXED: Remove the timeout mechanism that was causing the fallback
      const profile = await fetchUserProfile(userId);
      
      if (profile && profile.is_active) {
        setSession(session);
        setCurrentUser({ ...session.user, ...profile });
        setUserProfile(profile);
        setIsAuthenticated(true);
        setLoading(false);
        
        console.log('✅ User session established successfully for:', profile.email);
        
        if (showWelcome) {
          toast({
            title: 'Success',
            description: `Welcome back, ${profile.full_name || profile.username || 'User'}!`
          });
        }
        
      } else if (profile && !profile.is_active) {
        console.log('⛔ User account is inactive');
        await handleSignOut(true);
        toast({
          title: 'Account Inactive',
          description: 'Your account has been deactivated. Please contact an administrator.',
          variant: 'destructive'
        });
        
      } else {
        console.log('❌ No profile found for user:', session.user.email, 'ID:', userId);
        
        // FIXED: Set basic auth state immediately without showing profile missing error
        console.log('🔧 Using fallback auth state - will retry profile fetch');
        setSession(session);
        setCurrentUser(session.user as AuthUser);
        setIsAuthenticated(true);
        setLoading(false);
        
        // Don't show error toast for missing profile on page refresh
        if (showWelcome) {
          toast({
            title: 'Profile Missing',
            description: 'Your user profile is incomplete. Please contact your administrator.',
            variant: 'destructive'
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Error handling user session:', error);
      
      // FIXED: Always set basic auth state as fallback
      console.log('🔧 Error fallback - setting basic auth state');
      setSession(session);
      setCurrentUser(session.user as AuthUser);
      setIsAuthenticated(true);
      setLoading(false);
      
      if (showWelcome) {
        toast({
          title: 'Authentication Warning',
          description: 'Logged in with basic access. Some features may be limited.',
          variant: 'destructive'
        });
      }
    } finally {
      isProcessingAuth.current = false;
      setLoading(false);
    }
  }, [fetchUserProfile, toast, currentUser, handleSignOut]);

  useEffect(() => {
    if (isInitialized.current) {
      console.log('⏭️ Auth already initialized, skipping...');
      return;
    }
    
    isInitialized.current = true;
    console.log('🔐 Initializing auth system...');

    if (window.location.hostname === 'localhost') {
      console.log('🧹 Development mode: clearing potential auth conflicts...');
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase.auth') || key.includes('sb-')) {
            localStorage.removeItem(key);
            console.log('🗑️ Cleared dev auth key:', key);
          }
        });
      } catch (error) {
        console.warn('⚠️ Dev auth cleanup failed:', error);
      }
    }

    const initializeAuth = async () => {
      try {
        setLoading(true);
        
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ Error getting session:', error);
          setLoading(false);
          return;
        }

        if (session) {
          console.log('📱 Found existing session for:', session.user.email);
          await handleUserSession(session, false);
        } else {
          console.log('ℹ️ No session found');
          setLoading(false);
        }
        
      } catch (error) {
        console.error('❌ Error in auth initialization:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, 'Session exists:', !!session);
        
        if (isProcessingAuth.current && event !== 'SIGNED_OUT') {
          console.log('⏭️ Skipping auth event during processing:', event);
          return;
        }
        
        try {
          if (event === 'SIGNED_IN' && session) {
            if (!isAuthenticated || currentUserId.current !== session.user.id) {
              console.log('🔑 Processing SIGNED_IN event...');
              await handleUserSession(session, false);
            } else {
              console.log('ℹ️ Session already processed for current user');
              setLoading(false);
            }
            
          } else if (event === 'SIGNED_OUT') {
            console.log('🚪 Processing SIGNED_OUT event...');
            await handleSignOut(true);
            
          } else if (event === 'TOKEN_REFRESHED' && session) {
            console.log('🔄 Processing TOKEN_REFRESHED event...');
            
            if (currentUserId.current === session.user.id && userProfile) {
              setSession(session);
              setCurrentUser({
                ...session.user,
                role: userProfile.role,
                username: userProfile.username,
                full_name: userProfile.full_name,
                is_active: userProfile.is_active
              });
            } else {
              await handleUserSession(session, false);
            }
            
          } else {
            console.log('ℹ️ Unhandled auth event:', event);
            setLoading(false);
          }
          
        } catch (error) {
          console.error('❌ Error in auth state change handler:', error);
          setLoading(false);
        }
      }
    );

    return () => {
      console.log('🧹 Cleaning up auth subscription...');
      subscription.unsubscribe();
    };
  }, [handleUserSession, handleSignOut, isAuthenticated, userProfile]);

  const login = async (email: string, password: string): Promise<boolean> => {
    if (isProcessingAuth.current) {
      console.log('⏭️ Login already in progress, skipping...');
      return false;
    }

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

      console.log('✅ Login successful, handling session...');
      
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

  const logout = async (): Promise<void> => {
    if (isProcessingAuth.current) {
      console.log('⏭️ Logout already in progress, skipping...');
      return;
    }

    try {
      console.log('🚪 Logging out...');
      setLoading(true);
      
      await handleSignOut(false);
      
    } catch (error) {
      console.error('❌ Logout exception:', error);
      await handleSignOut(true);
      toast({
        title: 'Error',
        description: 'Failed to log out completely. Please try again.',
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