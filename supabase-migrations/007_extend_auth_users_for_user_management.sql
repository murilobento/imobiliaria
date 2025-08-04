-- Extend auth_users table for user management functionality
-- Add email, is_active, and created_by columns

-- Add new columns to auth_users table
ALTER TABLE auth_users 
ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth_users(id);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
CREATE INDEX IF NOT EXISTS idx_auth_users_is_active ON auth_users(is_active);
CREATE INDEX IF NOT EXISTS idx_auth_users_created_by ON auth_users(created_by);

-- Add constraints for data integrity
ALTER TABLE auth_users ADD CONSTRAINT check_email_format 
  CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE auth_users ADD CONSTRAINT check_email_length 
  CHECK (email IS NULL OR (char_length(email) >= 5 AND char_length(email) <= 255));

-- Update the trigger function to handle new columns
CREATE OR REPLACE FUNCTION update_auth_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create function to check username uniqueness (excluding specific user)
CREATE OR REPLACE FUNCTION check_username_availability(
  p_username VARCHAR(50),
  p_exclude_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count
  FROM auth_users 
  WHERE username = p_username 
    AND (p_exclude_user_id IS NULL OR id != p_exclude_user_id);
  
  RETURN user_count = 0;
END;
$$ language 'plpgsql';

-- Create function to check email uniqueness (excluding specific user)
CREATE OR REPLACE FUNCTION check_email_availability(
  p_email VARCHAR(255),
  p_exclude_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count
  FROM auth_users 
  WHERE email = p_email 
    AND (p_exclude_user_id IS NULL OR id != p_exclude_user_id);
  
  RETURN user_count = 0;
END;
$$ language 'plpgsql';

-- Create function to get users list with pagination and search
CREATE OR REPLACE FUNCTION get_users_list(
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 10,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  username VARCHAR(50),
  email VARCHAR(255),
  role VARCHAR(20),
  is_active BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  total_count BIGINT
) AS $$
DECLARE
  offset_val INTEGER;
BEGIN
  offset_val := (p_page - 1) * p_limit;
  
  RETURN QUERY
  SELECT 
    u.id,
    u.username,
    u.email,
    u.role,
    u.is_active,
    u.created_at,
    u.updated_at,
    u.last_login,
    u.created_by,
    COUNT(*) OVER() as total_count
  FROM auth_users u
  WHERE (p_search IS NULL OR 
         u.username ILIKE '%' || p_search || '%' OR 
         u.email ILIKE '%' || p_search || '%')
  ORDER BY u.created_at DESC
  LIMIT p_limit
  OFFSET offset_val;
END;
$$ language 'plpgsql';

-- Create function to invalidate user sessions when deactivated
CREATE OR REPLACE FUNCTION invalidate_user_sessions(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM auth_sessions WHERE user_id = p_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ language 'plpgsql';