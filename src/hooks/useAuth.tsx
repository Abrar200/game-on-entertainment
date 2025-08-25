// src/hooks/useAuth.tsx - FIXED VERSION to prevent loading loops
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
  
  // CRITICAL: Prevent infinite loops and multiple initializations
  const isInitialized = useRef(false);
  const isProcessingAuth = useRef(false);
  const currentUserId = useRef<string | null>(null);
  const retryTimeouts = useRef<Set<NodeJS.Timeout>>(new Set());

  // Clear all timeouts on unmount
  useEffect(() => {
    return () => {
      retryTimeouts.current.forEach(timeout => clearTimeout(timeout));
      retryTimeouts.current.clear();
    };
  }, []);

  // Enhanced profile fetching with better error handling and loop prevention
  const fetchUserProfile = useCallback(async (userId: string, attempt: number = 1): Promise<UserProfile | null> => {
    try {
      console.log(`🔍 Fetching user profile (attempt ${attempt}/3) for:`, userId);
      
      const { data, error } = await supabase
        .from('users')
        .select('id, email, username, full_name, role, is_active, created_at')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ Profile fetch error:', error);
        
        // Only retry on network/temporary errors, not on missing data
        if (attempt < 3 && error.code !== 'PGRST116') {
          console.log(`🔄 Retrying profile fetch (attempt ${attempt + 1})...`);
          
          return new Promise((resolve) => {
            const timeout = setTimeout(() => {
              retryTimeouts.current.delete(timeout);
              resolve(fetchUserProfile(userId, attempt + 1));
            }, 1000 * attempt);
            retryTimeouts.current.add(timeout);
          });
        }
        
        throw error;
      }

      if (data) {
        console.log('✅ User profile fetched successfully:', data.email, 'Role:', data.role);
        return data;
      }

      console.log('ℹ️ No user profile found for:', userId);
      return null;

    } catch (error: any) {
      console.error('❌ Error in fetchUserProfile:', error);
      
      // Don't retry on auth errors or missing profile errors
      if (error.code === 'PGRST116' || error.message?.includes('JWT')) {
        console.log('🚫 Not retrying due to auth/missing profile error');
        return null;
      }
      
      // Only retry on genuine network errors
      if (attempt < 3 && error.name === 'NetworkError') {
        return new Promise((resolve) => {
          const timeout = setTimeout(() => {
            retryTimeouts.current.delete(timeout);
            resolve(fetchUserProfile(userId, attempt + 1));
          }, 1000 * attempt);
          retryTimeouts.current.add(timeout);
        });
      }
      
      return null;
    }
  }, []);

  const handleUserSession = useCallback(async (session: Session, showWelcome: boolean = false): Promise<void> => {
    const userId = session.user.id;
    
    // CRITICAL: Only prevent if EXACTLY the same session is being processed
    if (isProcessingAuth.current && currentUserId.current === userId && currentUser?.id === userId) {
      console.log('⏭️ Already processing same session for authenticated user:', userId);
      return;
    }

    isProcessingAuth.current = true;
    currentUserId.current = userId;

    try {
      console.log('📱 Handling user session for:', session.user.email);
      
      const profile = await fetchUserProfile(userId);
      
      if (profile && profile.is_active) {
        // SUCCESS: Set all auth state
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
        // Account inactive
        console.log('⛔ User account is inactive');
        await handleSignOut(true);
        toast({
          title: 'Account Inactive',
          description: 'Your account has been deactivated. Please contact an administrator.',
          variant: 'destructive'
        });
        
      } else {
        // No profile found - try to create one for existing auth users
        console.log('❌ No profile found for user:', session.user.email, 'ID:', userId);
        console.log('📋 User metadata:', session.user.user_metadata);
        
        // Try to create a profile for this user if they have auth access
        try {
          console.log('🔧 Attempting to create missing user profile...');
          
          const newProfile = {
            id: userId,
            email: session.user.email || '',
            username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'user',
            full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.username || 'User',
            role: session.user.user_metadata?.role || 'viewer', // Default to viewer
            is_active: true
          };
          
          const { data: createdProfile, error: createError } = await supabase
            .from('users')
            .insert([newProfile])
            .select()
            .single();
            
          if (createError) {
            console.error('❌ Failed to create user profile:', createError);
            throw createError;
          }
          
          console.log('✅ Created missing user profile:', createdProfile);
          
          // Now set up the session with the new profile
          setSession(session);
          setCurrentUser({ ...session.user, ...createdProfile });
          setUserProfile(createdProfile);
          setIsAuthenticated(true);
          setLoading(false);
          
          toast({
            title: 'Profile Created',
            description: 'Your user profile has been created successfully!',
          });
          
          if (showWelcome) {
            toast({
              title: 'Success',
              description: `Welcome, ${createdProfile.full_name || createdProfile.username || 'User'}!`
            });
          }
          
        } catch (profileCreateError) {
          console.error('❌ Could not create user profile:', profileCreateError);
          await handleSignOut(true);
          toast({
            title: 'Profile Creation Failed',
            description: 'Could not create your user profile. Please contact an administrator.',
            variant: 'destructive'
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Error handling user session:', error);
      await handleSignOut(true);
      toast({
        title: 'Session Error',
        description: 'Failed to establish session. Please try logging in again.',
        variant: 'destructive'
      });
    } finally {
      isProcessingAuth.current = false;
      setLoading(false);
    }
  }, [fetchUserProfile, toast, currentUser]);

  const handleSignOut = useCallback(async (skipSupabaseSignOut: boolean = false): Promise<void> => {
    console.log('🧹 Clearing all auth state...');
    
    // Clear processing flags
    isProcessingAuth.current = false;
    currentUserId.current = null;
    
    // Clear all timeouts
    retryTimeouts.current.forEach(timeout => clearTimeout(timeout));
    retryTimeouts.current.clear();
    
    // Clear auth state
    setSession(null);
    setCurrentUser(null);
    setUserProfile(null);
    setIsAuthenticated(false);
    setLoading(false);
    
    // Clear problematic cache while preserving auth tokens
    try {
      const keysToRemove: string[] = [];
      
      Object.keys(localStorage).forEach(key => {
        // Preserve Supabase auth keys but remove other cache
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
      
      // Clear sessionStorage (usually safe)
      try {
        sessionStorage.clear();
      } catch (e) {
        console.warn('⚠️ SessionStorage clear failed:', e);
      }
      
    } catch (error) {
      console.warn('⚠️ Cache clearing failed:', error);
    }
    
    // Sign out from Supabase if requested
    if (!skipSupabaseSignOut) {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('❌ Supabase signout error:', error);
      }
    }
    
    console.log('✅ Auth state cleared completely');
  }, []);

  useEffect(() => {
    // CRITICAL: Prevent multiple initializations
    if (isInitialized.current) {
      console.log('⏭️ Auth already initialized, skipping...');
      return;
    }
    
    isInitialized.current = true;
    console.log('🔐 Initializing auth system...');

    // Clear cross-domain auth conflicts on development
    if (window.location.hostname === 'localhost') {
      console.log('🧹 Development mode: clearing potential auth conflicts...');
      try {
        // Only clear auth tokens, not all localStorage
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
        
        // Get current session
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

    // CRITICAL: Set up auth state listener with better error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, 'Session exists:', !!session);
        
        // Prevent processing during ongoing auth operations
        if (isProcessingAuth.current && event !== 'SIGNED_OUT') {
          console.log('⏭️ Skipping auth event during processing:', event);
          return;
        }
        
        try {
          if (event === 'SIGNED_IN' && session) {
            // Only process if it's a different user or we're not authenticated
            if (!isAuthenticated || currentUserId.current !== session.user.id) {
              console.log('🔑 Processing SIGNED_IN event...');
              await handleUserSession(session, false);
            } else {
              console.log('ℹ️ Session already processed for current user');
              setLoading(false);
            }
            
          } else if (event === 'SIGNED_OUT') {
            console.log('🚪 Processing SIGNED_OUT event...');
            await handleSignOut(true); // Skip supabase signout since it's already done
            
          } else if (event === 'TOKEN_REFRESHED' && session) {
            console.log('🔄 Processing TOKEN_REFRESHED event...');
            
            // Only update session, don't refetch profile
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
              // If we don't have profile data, fetch it
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
      
      // Handle the session with welcome message
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
      
      // Clear state immediately for better UX
      await handleSignOut(false); // This will also call supabase.auth.signOut()
      
    } catch (error) {
      console.error('❌ Logout exception:', error);
      // Still clear state even if logout fails
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