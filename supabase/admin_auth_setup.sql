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
-- Policy: Allow authenticated admins to insert/update/delete
CREATE POLICY "Allow admin write access" ON admin_users FOR ALL USING (auth.uid() IN (SELECT id FROM auth.users WHERE email IN (SELECT email FROM admin_users)));


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

-- Policy: Allow anyone to insert (for registration requests)
CREATE POLICY "Allow public insert access" ON admin_access_requests FOR INSERT WITH CHECK (true);

-- Policy: Allow admins to view/update requests
CREATE POLICY "Allow admin full access" ON admin_access_requests FOR ALL USING (
    public.is_admin()
);

-- Insert the Master Admin
INSERT INTO admin_users (email, role)
VALUES ('ronilsondesouza159@gmail.com', 'master')
ON CONFLICT (email) DO NOTHING;
