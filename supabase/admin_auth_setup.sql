-- Create admin_users table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to read admin_users (needed for checking permissions during login/register)
CREATE POLICY "Allow public read access" ON admin_users FOR SELECT USING (true);
-- Policy: Allow admins to manage admin_users
CREATE POLICY "Allow admin write access" ON admin_users FOR ALL USING (public.is_admin());


-- Create admin_access_requests table
CREATE TABLE IF NOT EXISTS admin_access_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE admin_access_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to insert (for registration requests) with basic validation
CREATE POLICY "Allow public insert access" ON admin_access_requests FOR INSERT WITH CHECK (
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' 
    AND name IS NOT NULL 
    AND length(name) > 1
);

-- Policy: Allow admins to view/update requests
CREATE POLICY "Allow admin full access" ON admin_access_requests FOR ALL USING (
    public.is_admin()
);

-- Insert the Master Admin
INSERT INTO admin_users (email, role)
VALUES ('ronilsondesouza159@gmail.com', 'master')
ON CONFLICT (email) DO NOTHING;
