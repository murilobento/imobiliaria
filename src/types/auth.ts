/**
 * Authentication types and interfaces for the authentication system
 */

// User roles available in the system
export type UserRole = 'admin' | 'real-estate-agent';

// User interface representing authenticated user data
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  created_by: string | null;
}

// JWT payload structure
export interface JWTPayload {
  sub: string; // user id
  username: string;
  role: string;
  iat: number;
  exp: number;
}

// Login form data interface
export interface LoginFormData {
  username: string;
  password: string;
}

// Authentication context type
export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Database user record (includes sensitive fields)
export interface DatabaseUser {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  created_by: string | null;
  failed_attempts: number;
  locked_until: string | null;
}

// Security event logging interface
export interface SecurityEvent {
  type: 'login_attempt' | 'login_success' | 'login_failure' | 'token_invalid' | 'logout' | 
        'unauthorized_access' | 'admin_action' | 'system_error' | 'rate_limit_exceeded';
  user_id?: string;
  ip_address: string;
  user_agent: string;
  timestamp: Date;
  details?: Record<string, any>;
}

// Rate limiting configuration
export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  accountLockDurationMs: number;
}

// Authentication API response types
export interface LoginResponse {
  success: boolean;
  user?: User;
  error?: string;
}

export interface LogoutResponse {
  success: boolean;
  error?: string;
}

export interface VerifyResponse {
  success: boolean;
  user?: User;
  error?: string;
}

// Session data interface (for optional session table)
export interface Session {
  id: string;
  user_id: string;
  token_jti: string;
  expires_at: string;
  created_at: string;
}

// Authentication configuration interface
export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptRounds: number;
  csrfSecret: string;
  rateLimitConfig: RateLimitConfig;
}

// Password validation result
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

// Authentication error types
export type AuthError = 
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_LOCKED'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'RATE_LIMITED'
  | 'CSRF_ERROR'
  | 'INTERNAL_ERROR';

// Authentication result for internal use
export interface AuthResult {
  success: boolean;
  user?: User;
  error?: AuthError;
  message?: string;
}

// User Management Request/Response Interfaces

// Request interface for creating new users
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// Request interface for updating user profile
export interface UpdateProfileRequest {
  fullName?: string;
  username?: string;
  email?: string;
}

// Request interface for changing password
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Response interface for user list with pagination
export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

// Request interface for user list with search and pagination
export interface UserListRequest {
  page?: number;
  limit?: number;
  search?: string;
}

// Request interface for updating user status
export interface UpdateUserStatusRequest {
  is_active: boolean;
}

// Generic API response interface for user management operations
export interface UserManagementResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    field?: string;
  };
}

// User management error types
export type UserManagementError = 
  | 'USERNAME_EXISTS'
  | 'EMAIL_EXISTS'
  | 'USER_NOT_FOUND'
  | 'INVALID_PASSWORD'
  | 'PASSWORDS_DONT_MATCH'
  | 'INVALID_EMAIL_FORMAT'
  | 'WEAK_PASSWORD'
  | 'UNAUTHORIZED'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR';