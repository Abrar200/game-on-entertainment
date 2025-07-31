import { createClient } from '@supabase/supabase-js';


// Initialize Supabase client
// Using direct values from project configuration
const supabaseUrl = 'https://ogbxiolnyzidylzoljuh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nYnhpb2xueXppZHlsem9sanVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MDk5MjAsImV4cCI6MjA2OTI4NTkyMH0._l43gP6A8jJQmkoQr11NavPovImxhG6SDHG8CE5tF0Q';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };