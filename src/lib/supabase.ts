import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for regular operations
const supabaseUrl = 'https://ogbxiolnyzidylzoljuh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nYnhpb2xueXppZHlsem9sanVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MDk5MjAsImV4cCI6MjA2OTI4NTkyMH0._l43gP6A8jJQmkoQr11NavPovImxhG6SDHG8CE5tF0Q';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nYnhpb2xueXppZHlsem9sanVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzcwOTkyMCwiZXhwIjoyMDY5Mjg1OTIwfQ.TGnJv4mxlAHcEAk_hVEtpWSegpZS9r7Jmss93wjivgM';

// Regular client for normal operations (uses RLS)
const supabase = createClient(supabaseUrl, supabaseKey);

// Admin client for admin operations (bypasses RLS)
// IMPORTANT: Only use this for admin operations, never expose to regular users
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export { supabase, supabaseAdmin };