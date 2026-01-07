# Security Policy

## Supported Versions

We actively support the latest version of memlane. Security updates will be provided for:

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < Latest| :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability, please follow these steps:

### 1. **Do NOT** open a public issue

Security vulnerabilities should be reported privately to protect users.

### 2. Report the vulnerability

Please email security details to: **hari@moderndaydevelopers.com**

Include the following information:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)
- Your contact information

### 3. Response timeline

- **Initial response**: Within 48 hours
- **Status update**: Within 7 days
- **Resolution**: Depends on severity and complexity

### 4. Disclosure

We will:
- Acknowledge receipt of your report
- Keep you informed of the progress
- Credit you in the security advisory (if desired)
- Not disclose your identity without permission

## Security Best Practices

### For Users

1. **Environment Variables**: Never commit `.env` files or expose API keys
2. **Supabase JWT Secret**: Store securely, use for token verification (backend only)
3. **Encryption Key**: Generate a secure 32-character encryption key for production
4. **API Keys**: Keep your AI provider API keys secure
5. **Database**: Ensure database files have proper permissions
6. **HTTPS**: Use HTTPS in production environments
7. **CORS**: Configure `ALLOWED_ORIGINS` appropriately for your deployment

### For Developers

1. **Dependencies**: Keep dependencies up to date
2. **Secrets**: Never hardcode secrets or API keys
3. **Input Validation**: Validate and sanitize all user inputs
4. **SQL Injection**: Use parameterized queries (already implemented)
5. **XSS**: Sanitize user-generated content
6. **Authentication**: Use Supabase authentication with proper RLS policies
7. **Encryption**: Encrypt sensitive data at rest (API keys)

## Critical Supabase Security Guidelines

### ✅ Safe to Expose (Frontend)

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Anonymous/public key (designed to be public)

### 🔒 Backend Only (Secret)

- `SUPABASE_JWT_SECRET` - For verifying JWT tokens on backend
- `SUPABASE_ANON_KEY` - Also used on backend for API calls

### ⛔ NEVER Use in Application

- `SUPABASE_SERVICE_ROLE_KEY` - Grants admin access, bypasses all RLS policies

**Warning**: The service role key should NEVER be in your `.env` file or application code. It should only be used in:
- One-time migration scripts (run manually)
- Admin CLI tools (not deployed)
- Temporary troubleshooting (then rotated immediately)

### Docker Security

The application uses `.dockerignore` files to prevent `.env` files from being copied into Docker images:

- `frontend/.dockerignore` - Prevents frontend secrets in build
- `backend/.dockerignore` - Prevents backend secrets in build

Secrets are passed to containers via `docker-compose.yml` environment variables (read from your local `.env`, not copied into image).

## Known Security Considerations

### Current Security Features

- ✅ Supabase authentication with JWT tokens
- ✅ Row Level Security (RLS) via Supabase
- ✅ Encrypted storage of user API keys (AES encryption)
- ✅ Parameterized SQL queries (SQLite)
- ✅ CORS protection
- ✅ Input validation on API endpoints
- ✅ `.dockerignore` files preventing secret leaks in images
- ✅ `.gitignore` preventing secret commits to version control

### Areas for Improvement

- [ ] Rate limiting on API endpoints
- [ ] CSRF protection
- [ ] Content Security Policy (CSP) headers
- [ ] Security headers (HSTS, X-Frame-Options, etc.)
- [ ] Automated security scanning
- [ ] Dependency vulnerability scanning

## Security Updates

Security updates will be:
- Released as patch versions
- Documented in release notes
- Tagged with security labels in issues

## Thank You

Thank you for helping keep memlane secure! We appreciate responsible disclosure and will work with you to address security issues promptly.

