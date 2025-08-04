# Authentication System Setup Guide

This guide walks you through setting up the authentication system for the application, including initial admin user creation and configuration validation.

## Prerequisites

Before setting up authentication, ensure you have:

1. **Node.js** (version 18 or higher)
2. **Supabase project** configured and running
3. **Database migrations** completed
4. **Environment variables** properly configured

## Quick Setup

For a quick setup, run the automated setup script:

```bash
npm run setup:admin
```

This script will:
- Validate your environment configuration
- Check database connectivity
- Create the initial admin user (if it doesn't exist)
- Display the generated admin credentials

## Manual Setup Steps

### 1. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and update the following variables:

#### Required Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-chars
JWT_EXPIRES_IN=1h
```

#### Optional but Recommended Variables

```bash
# Rate Limiting
RATE_LIMIT_MAX_ATTEMPTS=5
RATE_LIMIT_WINDOW_MS=900000
ACCOUNT_LOCK_DURATION_MS=1800000

# Security
BCRYPT_ROUNDS=12
CSRF_SECRET=your-csrf-secret-here
```

### 2. Generate Secure Secrets

For production environments, generate secure secrets:

```bash
# Generate JWT_SECRET (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate CSRF_SECRET
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

### 3. Database Setup

Ensure your Supabase database has the required tables. Run migrations if not already done:

```bash
# Run the auth table migrations
npm run migrate:auth
```

The authentication system requires these tables:
- `auth_users` - Stores user credentials and metadata
- `auth_sessions` - (Optional) Stores session information for token invalidation

### 4. Validate Configuration

Before creating the admin user, validate your configuration:

```bash
node -e "
const { validateConfigOrExit } = require('./src/lib/auth/startup-validation.ts');
validateConfigOrExit();
"
```

### 5. Create Initial Admin User

Run the setup script to create the initial admin user:

```bash
node scripts/setup-initial-admin.js
```

This will:
- Validate all configurations
- Generate a secure random password
- Create the admin user in the database
- Display the login credentials

**Important:** Save the generated password securely and change it after first login!

## Configuration Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | - | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | - | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | - | Supabase service role key (for admin operations) |
| `JWT_SECRET` | Yes | - | Secret key for JWT token signing (32+ chars) |
| `JWT_EXPIRES_IN` | No | `1h` | JWT token expiration time |
| `BCRYPT_ROUNDS` | No | `12` | Bcrypt salt rounds (10-15 recommended) |
| `RATE_LIMIT_MAX_ATTEMPTS` | No | `5` | Max login attempts per IP |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window (15 minutes) |
| `ACCOUNT_LOCK_DURATION_MS` | No | `1800000` | Account lock duration (30 minutes) |
| `CSRF_SECRET` | No | - | CSRF protection secret |

### Security Recommendations

1. **JWT_SECRET**: Use a cryptographically secure random string of at least 32 characters
2. **BCRYPT_ROUNDS**: Use 12 rounds for good security/performance balance
3. **Rate Limiting**: Adjust based on your expected traffic patterns
4. **HTTPS**: Always use HTTPS in production
5. **Environment Isolation**: Use different secrets for development/staging/production

## Troubleshooting

### Common Issues

#### 1. "Missing required environment variable"
- Ensure all required variables are set in `.env.local`
- Check for typos in variable names
- Verify the file is in the project root

#### 2. "Auth database validation failed"
- Verify Supabase connection details
- Ensure database migrations have been run
- Check service role key permissions

#### 3. "JWT_SECRET must be changed from default value"
- Generate a new secure secret using the command above
- Ensure it's at least 32 characters long

#### 4. "relation 'auth_users' does not exist"
- Run database migrations: `npm run migrate:auth`
- Verify Supabase project is properly configured

### Validation Commands

```bash
# Quick configuration check
node -e "
const { validateStartupConfig, logValidationResults } = require('./src/lib/auth/startup-validation.ts');
const result = validateStartupConfig();
logValidationResults(result);
"

# Full validation including database
node scripts/setup-initial-admin.js --validate-only
```

## First Login

After setup is complete:

1. Start the application: `npm run dev`
2. Navigate to: `http://localhost:3000/login`
3. Use the generated credentials:
   - Username: `admin`
   - Password: `[generated password from setup]`
4. **Important**: Change the password immediately after first login

## Security Considerations

### Password Policy
- Minimum 8 characters
- Must contain uppercase, lowercase, numbers, and special characters
- Generated passwords are 16 characters with guaranteed diversity

### Session Management
- JWT tokens expire after 1 hour by default
- Tokens are stored in HttpOnly cookies
- Automatic logout on token expiration

### Rate Limiting
- 5 failed attempts per IP address per 15 minutes
- Account lockout after 3 consecutive failures
- Progressive delays for repeated attempts

### Audit Logging
- All authentication events are logged
- Failed login attempts are tracked
- Suspicious activity is flagged for review

## Production Deployment

Before deploying to production:

1. **Change all default secrets**
2. **Enable HTTPS enforcement**
3. **Configure proper CORS settings**
4. **Set up monitoring and alerting**
5. **Review and adjust rate limiting**
6. **Enable security headers**

## Support

If you encounter issues during setup:

1. Check the troubleshooting section above
2. Verify all prerequisites are met
3. Review the configuration reference
4. Check application logs for detailed error messages

For additional help, refer to the main project documentation or contact the development team.