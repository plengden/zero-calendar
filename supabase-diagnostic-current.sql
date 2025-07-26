-- Diagnostic script to check current database state
-- Run this first to see what exists

-- Check if user_profiles table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_profiles') 
    THEN 'user_profiles table EXISTS'
    ELSE 'user_profiles table does NOT exist'
  END as table_status;

-- Check if events table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'events') 
    THEN 'events table EXISTS'
    ELSE 'events table does NOT exist'
  END as table_status;

-- Check if waitlist table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'waitlist') 
    THEN 'waitlist table EXISTS'
    ELSE 'waitlist table does NOT exist'
  END as table_status;

-- List all policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- List all tables in public schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name; 