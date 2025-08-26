// src/hooks/useAuth.tsx - OPTIMIZED VERSION
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
  const currentUserId = useRef<string | null>(null);
  const profileCache = useRef<Map<string, { profile: UserProfile | null, timestamp: number }>>(new Map());

  // Cache TTL: 5 minutes
  const CACHE_TTL = 5 * 60 * 1000;
  const QUERY_TIMEOUT = 5000; // Reduced to 5 seconds

  const handleSignOut = useCallback(async (skipSupabaseSignOut: boolean = false): Promise<void> => {
    console.log('🧹 Clearing auth state...');
    
    currentUserId.current = null;
    profileCache.current.clear();
    
    setSession(null);
    setCurrentUser(null);
    setUserProfile(null);
    setIsAuthenticated(false);
    setLoading(false);
    
    if (!skipSupabaseSignOut) {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.warn('⚠️ Supabase signout error:', error);
      }
    }
    
    console.log('✅ Auth state cleared');
  }, []);

  // OPTIMIZED: Single query with proper fallback
  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      console.log(`🔍 Fetching profile for:`, userId);
      
      // Check cache first
      const cached = profileCache.current.get(userId);
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        console.log('📦 Using cached profile');
        return cached.profile;
      }

      // Single query with timeout
      const queryPromise = supabase
        .from('users')
        .select('id, email, username, full_name, role, is_active, created_at')
        .eq('id', userId)
        .single();

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), QUERY_TIMEOUT);
      });

      let result;
      try {
        result = await Promise.race([queryPromise, timeoutPromise]);
      } catch (timeoutError) {
        console.warn('⚠️ Users query timed out, trying user_profiles...');
        
        // Fallback to user_profiles
        try {
          const profileResult = await supabase
            .from('user_profiles')
            .select('user_id, username, full_name, role, is_active, created_at')
            .eq('user_id', userId)
            .single();
            
          if (profileResult.data) {
            result = {
              data: {
                id: profileResult.data.user_id,
                email: '', // Will be filled from session
                username: profileResult.data.username,
                full_name: profileResult.data.full_name,
                role: profileResult.data.role,
                is_active: profileResult.data.is_active,
                created_at: profileResult.data.created_at
              },
              error: null
            };
          } else {
            throw new Error('No profile data found');
          }
        } catch (profileError) {
          console.warn('⚠️ user_profiles query also failed:', profileError);
          profileCache.current.set(userId, { profile: null, timestamp: Date.now() });
          return null;
        }
      }

      const { data, error } = result;

      if (error || !data) {
        console.warn('⚠️ Profile query failed:', error);
        profileCache.current.set(userId, { profile: null, timestamp: Date.now() });
        return null;
      }

      const profile: UserProfile = {
        id: data.id,
        email: data.email || `user-${userId}@unknown.com`,
        username: data.username,
        full_name: data.full_name,
        role: data.role || 'viewer',
        is_active: data.is_active !== false,
        created_at: data.created_at || new Date().toISOString()
      };
      
      // Cache the result
      profileCache.current.set(userId, { profile, timestamp: Date.now() });
      
      console.log('✅ Profile fetched:', profile.email, 'Role:', profile.role);
      return profile;

    } catch (error: any) {
      console.error('❌ Error fetching profile:', error);
      return null;
    }
  }, []);

  // OPTIMIZED: Faster session handling
  const handleUserSession = useCallback(async (session: Session, showWelcome: boolean = false): Promise<void> => {
    const userId = session.user.id;
    
    // Prevent duplicate processing
    if (currentUserId.current === userId && isAuthenticated) {
      console.log('⏭️ Session already processed');
      setLoading(false);
      return;
    }

    currentUserId.current = userId;

    try {
      console.log('📱 Processing session for:', session.user.email);
      
      const profile = await fetchUserProfile(userId);
      
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
        
        console.log('✅ Session established for:', profile.email);
        
        if (showWelcome) {
          toast({
            title: 'Success',
            description: `Welcome back, ${profile.full_name || profile.username || 'User'}!`
          });
        }
        
      } else if (profile && !profile.is_active) {
        console.log('⛔ User account inactive');
        await handleSignOut(true);
        toast({
          title: 'Account Inactive',
          description: 'Your account has been deactivated.',
          variant: 'destructive'
        });
        
      } else {
        // Create fallback profile
        const fallbackProfile: UserProfile = {
          id: userId,
          email: session.user.email || `user-${userId}@unknown.com`,
          username: session.user.user_metadata?.username || 'unknown',
          full_name: session.user.user_metadata?.full_name || 'Unknown User',
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
      }
      
    } catch (error) {
      console.error('❌ Error handling session:', error);
      
      // Minimal fallback
      const errorProfile: UserProfile = {
        id: userId,
        email: session.user.email || 'error@user.com',
        username: 'error_user',
        full_name: 'Error User',
        role: 'viewer',
        is_active: true,
        created_at: new Date().toISOString()
      };

      setSession(session);
      setCurrentUser({ ...session.user, role: 'viewer' });
      setUserProfile(errorProfile);
      setIsAuthenticated(true);
    } finally {
      setLoading(false);
    }
  }, [fetchUserProfile, toast, handleSignOut, isAuthenticated]);

  // SIMPLIFIED: Single initialization
  useEffect(() => {
    if (isInitialized.current) return;
    
    isInitialized.current = true;
    console.log('🔐 Initializing auth...');

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ Session error:', error);
          setLoading(false);
          return;
        }

        if (session) {
          console.log('📱 Found session for:', session.user.email);
          await handleUserSession(session, false);
        } else {
          console.log('ℹ️ No session found');
          setLoading(false);
        }
        
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    // OPTIMIZED: Better auth state change handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event);
        
        try {
          if (event === 'SIGNED_IN' && session) {
            await handleUserSession(session, event === 'SIGNED_IN');
            
          } else if (event === 'SIGNED_OUT') {
            console.log('🚪 Processing sign out...');
            await handleSignOut(true);
            
          } else if (event === 'TOKEN_REFRESHED' && session) {
            // Just update session without refetching profile
            setSession(session);
            setLoading(false);
            
          } else {
            setLoading(false);
          }
          
        } catch (error) {
          console.error('❌ Auth state change error:', error);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [handleUserSession, handleSignOut]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      console.log('🔐 Logging in:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user || !data.session) {
        console.error('❌ Login failed:', error);
        toast({
          title: 'Login Failed',
          description: error?.message || 'Invalid credentials',
          variant: 'destructive'
        });
        return false;
      }

      console.log('✅ Login successful');
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
    try {
      console.log('🚪 Logging out...');
      setLoading(true);
      await handleSignOut(false);
    } catch (error) {
      console.error('❌ Logout error:', error);
      await handleSignOut(true);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions remain the same...
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
        'view_users', 'view_earnings', 'manage_machines', 'view_machines',
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
    canManageUsers: () => userProfile?.role === 'super_admin' || userProfile?.role === 'admin',
    canViewUsers: () => hasPermission('view_users') || hasPermission('manage_users'),
    canDeleteUsers: () => userProfile?.role === 'super_admin' || (userProfile?.role === 'admin' && hasPermission('delete_users')),
    canCreateUserWithRole: (targetRole: string) => {
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
    }
  };
};