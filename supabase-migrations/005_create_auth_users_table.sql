-- Create auth_users table for authentication system
-- This table stores user credentials and security-related fields

CREATE TABLE IF NOT EXISTS auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_auth_users_username ON auth_users(username);
CREATE INDEX IF NOT EXISTS idx_auth_users_role ON auth_users(role);
CREATE INDEX IF NOT EXISTS idx_auth_users_locked_until ON auth_users(locked_until);

-- Enable Row Level Security
ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated admin operations
CREATE POLICY "Allow admin operations on auth_users" ON auth_users
  FOR ALL USING (true); -- Will be refined when authentication is fully implemented

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_auth_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_auth_users_updated_at 
  BEFORE UPDATE ON auth_users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_auth_users_updated_at();

-- Add constraints for security
ALTER TABLE auth_users ADD CONSTRAINT check_username_length 
  CHECK (char_length(username) >= 3 AND char_length(username) <= 50);

ALTER TABLE auth_users ADD CONSTRAINT check_role_valid 
  CHECK (role IN ('admin', 'super_admin'));

ALTER TABLE auth_users ADD CONSTRAINT check_failed_attempts_positive 
  CHECK (failed_attempts >= 0);