import { createClient } from '@supabase/supabase-js';


// Initialize Supabase client
// Using direct values from project configuration
const supabaseUrl = 'https://bwmrnlbjjakqnmqvxiso.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bXJubGJqamFrcW5tcXZ4aXNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1OTQxNzYsImV4cCI6MjA2NjE3MDE3Nn0.YV_VQFOBqyAkbaUbcJQ-q8hycbSSPqUpPq17x09RwWc';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };