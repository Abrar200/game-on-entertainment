// src/lib/supabase.ts - BULLETPROOF VERSION
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for regular operations
const supabaseUrl = 'https://ogbxiolnyzidylzoljuh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nYnhpb2xueXppZHlsem9sanVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MDk5MjAsImV4cCI6MjA2OTI4NTkyMH0._l43gP6A8jJQmkoQr11NavPovImxhG6SDHG8CE5tF0Q';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nYnhpb2xueXppZHlsem9sanVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzcwOTkyMCwiZXhwIjoyMDY5Mjg1OTIwfQ.TGnJv4mxlAHcEAk_hVEtpWSegpZS9r7Jmss93wjivgM';

// BULLETPROOF: Enhanced client configuration
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
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
      'X-Client-Info': 'game-on-entertainment-dashboard'
    }
  },
  // Add timeout and retry configurations
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
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
      'X-Client-Info': 'game-on-entertainment-admin'
    }
  }
});

// BULLETPROOF: Enhanced query wrapper with automatic retries and timeouts
const safeQuery = async <T>(queryFn: () => Promise<T>, maxRetries = 3, timeoutMs = 10000): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs}ms`)), timeoutMs);
      });
      
      // Race the query against timeout
      const result = await Promise.race([queryFn(), timeoutPromise]);
      return result;
      
    } catch (error: any) {
      lastError = error;
      console.warn(`Query attempt ${attempt} failed:`, error.message);
      
      // Don't retry on certain errors
      if (error.code === 'PGRST116' || error.message?.includes('JWT') || error.message?.includes('not found')) {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

// BULLETPROOF: Safe user profile fetch
export const fetchUserProfileSafe = async (userId: string): Promise<any> => {
  return safeQuery(async () => {
    console.log('🔄 Safe profile fetch for:', userId);
    
    const { data, error } = await supabase
      .from('users')
      .select('id, email, username, full_name, role, is_active, created_at')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('❌ Profile fetch error:', error);
      throw error;
    }
    
    if (data) {
      console.log('✅ Profile fetched:', data.email);
      return data;
    }
    
    console.log('ℹ️ No profile found for:', userId);
    return null;
  });
};

export { supabase, supabaseAdmin };