// src/hooks/useAuth.tsx - PRODUCTION OPTIMIZED VERSION
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
  const profileCache = useRef<Map<string, { profile: UserProfile | null, timestamp: number }>>(new Map());

  // Cache TTL: 1 minute for production
  const CACHE_TTL = 1 * 60 * 1000;

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
    
    // Clear profile cache
    profileCache.current.clear();
    
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

  // PRODUCTION OPTIMIZED: Faster profile fetching with shorter timeouts
  const fetchUserProfile = useCallback(async (userId: string, attempt: number = 1): Promise<UserProfile | null> => {
    const isProduction = window.location.hostname !== 'localhost';
    
    try {
      console.log(`🔍 Fetching user profile (attempt ${attempt}/2) for:`, userId);
      
      // Check cache first
      const cached = profileCache.current.get(userId);
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        console.log('📦 Using cached profile for:', userId);
        return cached.profile;
      }

      // MUCH SHORTER TIMEOUTS for production
      const timeoutDuration = isProduction ? 8000 : 5000; // 8s for production, 5s for dev

      console.log(`🗄️ Querying 'users' table (timeout: ${timeoutDuration}ms)...`);
      
      const usersPromise = supabase
        .from('users')
        .select('id, email, username, full_name, role, is_active, created_at')
        .eq('id', userId)
        .maybeSingle();

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Users query timeout')), timeoutDuration);
      });

      let result;
      try {
        result = await Promise.race([usersPromise, timeoutPromise]);
      } catch (timeoutError) {
        console.warn(`⚠️ users table query timed out after ${timeoutDuration}ms`);
        
        // For production, try a much faster fallback
        if (isProduction && attempt === 1) {
          console.log('🚀 Production: Trying direct user_profiles query...');
          const fastProfilePromise = supabase
            .from('user_profiles')
            .select('user_id, username, full_name, role, is_active, created_at')
            .eq('user_id', userId)
            .maybeSingle();

          const fastTimeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Fast profile query timeout')), 5000);
          });

          try {
            result = await Promise.race([fastProfilePromise, fastTimeoutPromise]);
            if (result.data) {
              result.data = {
                id: result.data.user_id,
                email: '', // Will be filled from session
                username: result.data.username,
                full_name: result.data.full_name,
                role: result.data.role,
                is_active: result.data.is_active,
                created_at: result.data.created_at
              };
            }
          } catch (fastError) {
            console.warn('⚠️ Fast profile query also failed:', fastError);
            throw new Error('All profile queries failed');
          }
        } else {
          throw timeoutError;
        }
      }

      let { data, error } = result;

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Profile fetch error:', error);
        
        // Only retry on network/temporary errors, not on auth or not-found errors
        if (attempt < 2 && 
            !error.message?.includes('timeout') && 
            !error.message?.includes('JWT') && 
            !error.message?.includes('not authorized')) {
          console.log(`🔄 Retrying profile fetch (attempt ${attempt + 1}/2)...`);
          
          return new Promise((resolve) => {
            const timeout = setTimeout(() => {
              retryTimeouts.current.delete(timeout);
              resolve(fetchUserProfile(userId, attempt + 1));
            }, Math.min(1000 * attempt, 2000)); // Shorter backoff
            retryTimeouts.current.add(timeout);
          });
        }
        
        // Cache null result to prevent repeated failed requests
        profileCache.current.set(userId, { profile: null, timestamp: Date.now() });
        return null;
      }

      if (data) {
        // Normalize the data structure and ensure we have an email
        const profile: UserProfile = {
          id: data.id,
          email: data.email || `user-${userId}@unknown.com`, // Fallback email
          username: data.username,
          full_name: data.full_name,
          role: data.role || 'viewer', // Default role if missing
          is_active: data.is_active !== false, // Default to true if undefined
          created_at: data.created_at || new Date().toISOString()
        };
        
        // Cache the successful result
        profileCache.current.set(userId, { profile, timestamp: Date.now() });
        
        console.log('✅ User profile fetched successfully:', profile.email, 'Role:', profile.role);
        return profile;
      }

      console.log('ℹ️ No user profile data found for:', userId);
      
      // Cache null result
      profileCache.current.set(userId, { profile: null, timestamp: Date.now() });
      return null;

    } catch (error: any) {
      console.error('❌ Error in fetchUserProfile:', error);
      
      // For production, provide immediate fallback instead of retrying
      if (window.location.hostname !== 'localhost') {
        console.log('🏭 Production: Using immediate session fallback');
        return null; // Will trigger the fallback in handleUserSession
      }
      
      // Don't retry on certain errors
      if (error.code === 'PGRST116' || 
          error.message?.includes('JWT') || 
          error.message?.includes('not authorized')) {
        console.log('🚫 Not retrying due to specific error');
        profileCache.current.set(userId, { profile: null, timestamp: Date.now() });
        return null;
      }
      
      // For timeout errors, don't cache so we can retry later
      return null;
    }
  }, []);

  // PRODUCTION OPTIMIZED: Faster session handling
  const handleUserSession = useCallback(async (session: Session, showWelcome: boolean = false): Promise<void> => {
    const userId = session.user.id;
    const isProduction = window.location.hostname !== 'localhost';
    
    // FIXED: Better duplicate processing prevention
    if (isProcessingAuth.current && currentUserId.current === userId) {
      console.log('⏭️ Already processing session for user:', userId);
      return;
    }

    isProcessingAuth.current = true;
    currentUserId.current = userId;

    try {
      console.log('📱 Handling user session for:', session.user.email);
      
      // PRODUCTION OPTIMIZATION: Shorter timeout for profile fetch
      let profile: UserProfile | null = null;
      
      if (isProduction) {
        // Production: Use a promise race with shorter timeout
        const profilePromise = fetchUserProfile(userId);
        const sessionTimeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Session handling timeout')), 10000);
        });
        
        try {
          profile = await Promise.race([profilePromise, sessionTimeoutPromise]);
        } catch (timeoutError) {
          console.warn('⚠️ Profile fetch timed out, using fallback');
          profile = null;
        }
      } else {
        // Development: Normal flow
        profile = await fetchUserProfile(userId);
      }
      
      if (profile && profile.is_active) {
        const enhancedUser: AuthUser = {
          ...session.user,
          role: profile.role,
          username: profile.username,
          full_name: profile.full_name,
          is_active: profile.is_active
        };

        setSession(session);
        setCurrentUser(enhancedUser);
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
        
        // FIXED: Create a more complete fallback profile based on session data
        const fallbackProfile: UserProfile = {
          id: userId,
          email: session.user.email || `user-${userId}@unknown.com`,
          username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'unknown',
          full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.username || 'Unknown User',
          role: (session.user.user_metadata?.role as UserRole) || 'viewer',
          is_active: true,
          created_at: session.user.created_at || new Date().toISOString()
        };

        const fallbackUser: AuthUser = {
          ...session.user,
          role: fallbackProfile.role,
          username: fallbackProfile.username,
          full_name: fallbackProfile.full_name,
          is_active: true
        };

        console.log('🔧 Using fallback profile with role:', fallbackProfile.role);
        
        setSession(session);
        setCurrentUser(fallbackUser);
        setUserProfile(fallbackProfile);
        setIsAuthenticated(true);
        setLoading(false);
        
        toast({
          title: 'Profile Missing',
          description: 'Your user profile is incomplete. Please contact your administrator.',
          variant: 'destructive'
        });
      }
      
    } catch (error) {
      console.error('❌ Error handling user session:', error);
      
      // FIXED: Always provide some form of authentication even on errors
      const errorFallbackProfile: UserProfile = {
        id: userId,
        email: session.user.email || `user-${userId}@unknown.com`,
        username: 'error_user',
        full_name: 'Error User',
        role: 'viewer',
        is_active: true,
        created_at: new Date().toISOString()
      };

      const errorFallbackUser: AuthUser = {
        ...session.user,
        role: 'viewer',
        username: 'error_user',
        full_name: 'Error User',
        is_active: true
      };

      setSession(session);
      setCurrentUser(errorFallbackUser);
      setUserProfile(errorFallbackProfile);
      setIsAuthenticated(true);
      setLoading(false);
      
      toast({
        title: 'Authentication Warning',
        description: 'Logged in with limited access due to profile loading error.',
        variant: 'destructive'
      });
    } finally {
      isProcessingAuth.current = false;
      setLoading(false);
    }
  }, [fetchUserProfile, toast, handleSignOut]);

  useEffect(() => {
    if (isInitialized.current) {
      console.log('⏭️ Auth already initialized, skipping...');
      return;
    }
    
    isInitialized.current = true;
    console.log('🔐 Initializing auth system...');

    // FIXED: Simplified dev mode cleanup
    if (window.location.hostname === 'localhost') {
      console.log('🧹 Development mode: clearing potential auth conflicts...');
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.includes('user_profile_cache') || key.includes('auth_cache')) {
            localStorage.removeItem(key);
            console.log('🗑️ Cleared dev cache key:', key);
          }
        });
      } catch (error) {
        console.warn('⚠️ Dev cache cleanup failed:', error);
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
        
        // FIXED: Better event handling logic
        if (isProcessingAuth.current && event !== 'SIGNED_OUT' && event !== 'TOKEN_REFRESHED') {
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
            
            // FIXED: For token refresh, just update the session without re-fetching profile
            if (currentUserId.current === session.user.id && userProfile) {
              setSession(session);
              setCurrentUser({
                ...session.user,
                role: userProfile.role,
                username: userProfile.username,
                full_name: userProfile.full_name,
                is_active: userProfile.is_active
              });
              setLoading(false);
            } else {
              // Only re-fetch profile if we don't have one or user changed
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