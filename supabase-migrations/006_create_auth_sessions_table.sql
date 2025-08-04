-- Create auth_sessions table for JWT token management (optional)
-- This table can be used for token invalidation and session tracking

CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  token_jti VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_token_jti ON auth_sessions(token_jti);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_created_at ON auth_sessions(created_at);

-- Enable Row Level Security
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy for session management
CREATE POLICY "Allow session operations for authenticated users" ON auth_sessions
  FOR ALL USING (true); -- Will be refined when authentication is fully implemented

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM auth_sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Add constraints
ALTER TABLE auth_sessions ADD CONSTRAINT check_expires_at_future 
  CHECK (expires_at > created_at);

ALTER TABLE auth_sessions ADD CONSTRAINT check_token_jti_length 
  CHECK (char_length(token_jti) > 0);