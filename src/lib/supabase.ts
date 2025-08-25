// src/lib/supabase.ts - PRODUCTION-OPTIMIZED VERSION
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for regular operations
const supabaseUrl = 'https://ogbxiolnyzidylzoljuh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nYnhpb2xueXppZHlsem9sanVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MDk5MjAsImV4cCI6MjA2OTI4NTkyMH0._l43gP6A8jJQmkoQr11NavPovImxhG6SDHG8CE5tF0Q';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nYnhpb2xueXppZHlsem9sanVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzcwOTkyMCwiZXhwIjoyMDY5Mjg1OTIwfQ.TGnJv4mxlAHcEAk_hVEtpWSegpZS9r7Jmss93wjivgM';

// Detect production environment
const isProduction = process.env.NODE_ENV === 'production' || window.location.hostname !== 'localhost';

// Production-optimized client configuration
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Production-specific auth settings
    flowType: 'pkce', // More secure for production
    storage: {
      getItem: (key: string) => {
        try {
          return localStorage.getItem(key);
        } catch (error) {
          console.warn('Storage getItem error:', error);
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          console.warn('Storage setItem error:', error);
        }
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn('Storage removeItem error:', error);
        }
      }
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'game-on-entertainment-dashboard',
      // Add production-specific headers
      ...(isProduction && {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      })
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: isProduction ? 5 : 10 // Lower rate for production
    }
  }
});

// Enhanced admin client with production settings
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      'X-Client-Info': 'game-on-entertainment-admin',
      ...(isProduction && {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      })
    }
  }
});

// PRODUCTION-OPTIMIZED: Enhanced query wrapper with environment-aware timeouts
const safeQuery = async <T>(queryFn: () => Promise<T>, maxRetries = 3, timeoutMs?: number): Promise<T> => {
  // Adjust timeout based on environment
  const defaultTimeout = isProduction ? 45000 : 15000; // 45s for production, 15s for development
  const actualTimeout = timeoutMs || defaultTimeout;
  
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Query attempt ${attempt}/${maxRetries} (timeout: ${actualTimeout}ms)`);
      
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Query timeout after ${actualTimeout}ms (attempt ${attempt})`)), actualTimeout);
      });
      
      // Race the query against timeout
      const result = await Promise.race([queryFn(), timeoutPromise]);
      console.log(`✅ Query succeeded on attempt ${attempt}`);
      return result;
      
    } catch (error: any) {
      lastError = error;
      console.warn(`⚠️ Query attempt ${attempt} failed:`, error.message);
      
      // Don't retry on certain errors
      if (error.code === 'PGRST116' || 
          error.message?.includes('JWT') || 
          error.message?.includes('not found') ||
          error.message?.includes('not authorized')) {
        console.log(`🚫 Not retrying due to specific error: ${error.code || error.message}`);
        throw error;
      }
      
      // Wait before retry (longer delays in production)
      if (attempt < maxRetries) {
        const baseDelay = isProduction ? 2000 : 1000;
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), isProduction ? 10000 : 5000);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

// PRODUCTION-OPTIMIZED: Dual-strategy profile fetch
export const fetchUserProfileSafe = async (userId: string): Promise<any> => {
  return safeQuery(async () => {
    console.log(`🔍 Safe profile fetch for:`, userId, `(Environment: ${isProduction ? 'production' : 'development'})`);
    
    // Strategy 1: Try users table first (more reliable based on logs)
    try {
      console.log('📋 Attempting users table query...');
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, username, full_name, role, is_active, created_at')
        .eq('id', userId)
        .maybeSingle();
      
      if (!userError && userData) {
        console.log('✅ Users table query successful:', userData.email);
        return userData;
      }
      
      if (userError && userError.code !== 'PGRST116') {
        console.warn('⚠️ Users table error:', userError);
      }
    } catch (userQueryError) {
      console.warn('⚠️ Users table query failed:', userQueryError);
    }
    
    // Strategy 2: Fallback to user_profiles table
    try {
      console.log('📋 Attempting user_profiles table query...');
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_id, username, full_name, role, is_active, created_at')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (!profileError && profileData) {
        // Transform to match users table structure
        const transformedData = {
          id: profileData.user_id,
          email: '', // Will need to get from session
          username: profileData.username,
          full_name: profileData.full_name,
          role: profileData.role,
          is_active: profileData.is_active,
          created_at: profileData.created_at
        };
        
        console.log('✅ User_profiles table query successful');
        return transformedData;
      }
      
      if (profileError) {
        console.warn('⚠️ User_profiles table error:', profileError);
      }
    } catch (profileQueryError) {
      console.warn('⚠️ User_profiles table query failed:', profileQueryError);
    }
    
    console.log('❌ Both table queries failed for:', userId);
    return null;
  }, 2, isProduction ? 60000 : 20000); // 1 minute timeout for production
};

// Connection health check (useful for debugging production issues)
export const checkSupabaseConnection = async (): Promise<{ healthy: boolean, latency: number, error?: string }> => {
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    const latency = Date.now() - startTime;
    
    if (error) {
      return { healthy: false, latency, error: error.message };
    }
    
    return { healthy: true, latency };
  } catch (error: any) {
    const latency = Date.now() - startTime;
    return { healthy: false, latency, error: error.message };
  }
};

export { supabase, supabaseAdmin, isProduction };