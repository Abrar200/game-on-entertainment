// src/lib/supabase.ts - OPTIMIZED VERSION
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ogbxiolnyzidylzoljuh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nYnhpb2xueXppZHlsem9sanVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MDk5MjAsImV4cCI6MjA2OTI4NTkyMH0._l43gP6A8jJQmkoQr11NavPovImxhG6SDHG8CE5tF0Q';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nYnhpb2xueXppZHlsem9sanVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzcwOTkyMCwiZXhwIjoyMDY5Mjg1OTIwfQ.TGnJv4mxlAHcEAk_hVEtpWSegpZS9r7Jmss93wjivgM';

const isProduction = process.env.NODE_ENV === 'production' || window.location.hostname !== 'localhost';

// Optimized client configuration
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Faster initial load
    flowType: 'pkce',
    storage: {
      getItem: (key: string) => {
        try {
          return localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch {
          // Ignore storage errors
        }
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch {
          // Ignore storage errors
        }
      }
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'game-on-dashboard-v2',
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 3 // Reduced for better performance
    }
  }
});

// Enhanced admin client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      'X-Client-Info': 'game-on-dashboard-admin',
    }
  }
});

// OPTIMIZED: Simple query wrapper with shorter timeouts
const safeQuery = async <T>(
  queryFn: () => Promise<T>, 
  maxRetries = 2, 
  timeoutMs = 8000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Query attempt ${attempt}/${maxRetries}`);
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs}ms`)), timeoutMs);
      });
      
      const result = await Promise.race([queryFn(), timeoutPromise]);
      console.log(`✅ Query succeeded on attempt ${attempt}`);
      return result;
      
    } catch (error: any) {
      lastError = error;
      console.warn(`⚠️ Query attempt ${attempt} failed:`, error.message);
      
      // Don't retry on certain errors
      if (error.code === 'PGRST116' || 
          error.message?.includes('JWT') || 
          error.message?.includes('not found')) {
        throw error;
      }
      
      // Wait before retry
      if (attempt < maxRetries) {
        const delay = 1000 * attempt;
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

// OPTIMIZED: Single strategy profile fetch
export const fetchUserProfileSafe = async (userId: string): Promise<any> => {
  return safeQuery(async () => {
    console.log(`🔍 Fetching profile for:`, userId);
    
    // Try users table first
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, username, full_name, role, is_active, created_at')
        .eq('id', userId)
        .single();
      
      if (!userError && userData) {
        console.log('✅ Users table success:', userData.email);
        return userData;
      }
      
      if (userError && userError.code !== 'PGRST116') {
        console.warn('⚠️ Users table error:', userError);
      }
    } catch (error) {
      console.warn('⚠️ Users table failed:', error);
    }
    
    // Fallback to user_profiles table
    try {
      console.log('📋 Trying user_profiles fallback...');
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_id, username, full_name, role, is_active, created_at, email')
        .eq('user_id', userId)
        .single();
      
      if (!profileError && profileData) {
        const transformedData = {
          id: profileData.user_id,
          email: profileData.email || '',
          username: profileData.username,
          full_name: profileData.full_name,
          role: profileData.role,
          is_active: profileData.is_active,
          created_at: profileData.created_at
        };
        
        console.log('✅ User_profiles table success');
        return transformedData;
      }
      
      if (profileError) {
        console.warn('⚠️ User_profiles table error:', profileError);
      }
    } catch (error) {
      console.warn('⚠️ User_profiles table failed:', error);
    }
    
    console.log('❌ Both queries failed for:', userId);
    return null;
  }, 2, 10000);
};

// Connection health check
export const checkSupabaseConnection = async (): Promise<{ 
  healthy: boolean, 
  latency: number, 
  error?: string 
}> => {
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

// Optimized table existence check
export const tableExists = async (tableName: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0);
    
    return !error || error.code !== 'PGRST106';
  } catch {
    return false;
  }
};

// Cache for table existence to avoid repeated checks
const tableExistenceCache = new Map<string, boolean>();

export const safeTableQuery = async <T>(
  tableName: string,
  queryFn: () => Promise<{ data: T | null, error: any }>
): Promise<{ data: T | null, error: any }> => {
  // Check cache first
  if (tableExistenceCache.has(tableName) && !tableExistenceCache.get(tableName)) {
    return { data: null, error: { message: `Table ${tableName} does not exist`, code: 'TABLE_NOT_EXISTS' } };
  }
  
  try {
    const result = await queryFn();
    
    // If successful, mark table as existing
    if (!result.error) {
      tableExistenceCache.set(tableName, true);
    } else if (result.error.code === 'PGRST106' || result.error.code === '42P01') {
      // Table doesn't exist
      tableExistenceCache.set(tableName, false);
      console.warn(`⚠️ Table '${tableName}' does not exist`);
    }
    
    return result;
  } catch (error: any) {
    if (error.code === 'PGRST106' || error.code === '42P01') {
      tableExistenceCache.set(tableName, false);
    }
    return { data: null, error };
  }
};

export { supabase, supabaseAdmin, isProduction, safeQuery };