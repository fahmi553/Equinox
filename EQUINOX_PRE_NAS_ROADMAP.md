# Equinox Pre-NAS Production Readiness Roadmap

This roadmap tracks security, reliability, and deployment work before the UGREEN NAS is purchased. Product and module feature progress lives in [EQUINOX_ROADMAP.md](EQUINOX_ROADMAP.md); this file only tracks readiness items that make the current app safer to use before NAS integration.

Status key:

- [x] Implemented enough for the current prototype
- [ ] Still pending

## Scope Split

Keep these items in the main roadmap:

- Identity, dashboard, productivity modules, chat, notifications, settings, search, and portal features
- Adapter contracts and future WebDAV, SMB, Docker, SSH, photo, media, server, and automation modules

Keep these items in the pre-NAS roadmap:

- Security controls
- HTTPS/reverse-proxy readiness
- Secret handling
- Upload safety
- Backups
- Monitoring
- Pagination and reliability work

## Phase 1 - Security Baseline

### Password Security

- [x] Password hashing
- [x] Minimum password length requirement
- [ ] Strong password rules
- [x] Password reset tokens
- [x] Password reset token expiry

### Session Security

- [x] Session timeout
- [x] Logout all devices
- [x] Remember me support
- [x] Active session list
- [x] Revoke device/session

### Authorization

- [x] User can only edit owned private productivity content
- [x] Admin-only pages are protected
- [x] API checks ownership for current productivity modules
- [x] Shared adapter files use a read-only family download route
- [x] Specific-user file permissions
- [x] Direct adapter file download/delete ownership checks
- [x] Minimal access-control regression test suite

Access-control test to keep running:

```text
User A opens:
/api/files/1

User B opens:
/api/files/1

Expected result:
403 Forbidden
```

## Phase 2 - Edge Protection

### Rate Limiting

- [x] General API rate limit
- [x] Login/setup rate limit
- [x] File upload rate limit
- [x] Password reset request/confirm rate limit
- [x] Rate limits configurable through environment variables

### HTTPS

- [x] Proxy-aware HTTPS detection
- [x] Optional HTTP-to-HTTPS redirect with `ENFORCE_HTTPS=true`
- [x] HSTS header when HTTPS is enforced or detected
- [x] Basic security headers
- [ ] Real HTTPS certificate and reverse proxy configured on deployment host

Recommended deployment shape:

```text
Browser
  |
  v
HTTPS reverse proxy on NAS / router / mini-server
  |
  v
Equinox Docker services
```

### Secret Management

- [x] `.env.example` lists required local and deployment variables
- [x] `.env` is ignored by Git
- [x] JWT secret is read from environment
- [x] Backend warns when JWT secret is missing or weak
- [ ] Rotate the local Docker database password before real family use
- [ ] Add SMTP/NAS/OpenAI/OAuth secrets only when those integrations exist

Never commit this file to GitHub:

```text
.env
```

## Phase 3 - File Upload Security

### Upload Validation

- [x] Allow only approved file types
- [x] Validate MIME type
- [x] Validate extension
- [x] Upload size limit
- [x] Friendly oversized-upload error

### Dangerous Files

- [x] Block executable uploads
- [x] Block script uploads

Examples to block or quarantine before family use:

```text
.exe
.bat
.cmd
.ps1
.php
.sh
.js
```

## Phase 4 - Reliability

### Application Logs

- [x] Useful activity logs for major app actions
- [ ] Login failure logs
- [ ] Upload failure logs
- [ ] API error logs
- [ ] Permission denial logs

### Error Logs

- [ ] Store stack traces server-side
- [x] Avoid exposing most internal errors to users
- [ ] Standard error response format across all endpoints

Bad user-facing response:

```json
500 Internal Server Error
```

Better user-facing response:

```json
{
  "message": "Something went wrong"
}
```

The detailed stack trace should stay in logs.

## Phase 5 - Monitoring And Health

### Health Checks

- [x] Docker health check for PostgreSQL
- [x] Basic API/service status on dashboard
- [ ] Dedicated server online check endpoint
- [ ] Database online check endpoint
- [ ] NAS online check endpoint

### Alerts

- [ ] Low storage warning
- [ ] Backup failure warning
- [ ] Failed upload warning

## Phase 6 - Database And API Hardening

### API Validation

Every API should validate:

- [ ] Required fields
- [ ] String length
- [ ] Allowed values
- [ ] Email format if email accounts are added
- [ ] File path safety for every adapter route

### Database Optimization

- [x] Core indexes for notifications/chat/module metadata
- [x] Adapter metadata indexes
- [ ] User email index if email login is added
- [ ] File owner index for future specific-user sharing
- [ ] Shared file index for specific-user sharing

### Pagination

- [ ] File listing pagination
- [ ] Search pagination
- [ ] Activity log pagination
- [ ] Chat pagination

Avoid loading unbounded lists when a user may eventually have thousands of records.

## Phase 7 - Backups

### Database Backup

- [ ] Automated PostgreSQL backups
- [ ] Backup retention policy
- [ ] Backup verification

### File Backup

- [ ] Local adapter backup plan
- [ ] Important files backup
- [ ] Offsite backup
- [ ] Future NAS backup plan

### Recovery Testing

- [ ] Test restoring database
- [ ] Test restoring files
- [ ] Verify backup integrity

This is a must before relying on Equinox for real household data.

## Phase 8 - NAS Integration Preparation

### Storage Permissions

- [ ] User folders isolated
- [ ] Shared folders permission controlled by adapter metadata
- [ ] Admin access separated
- [ ] Equinox app permissions documented separately from UGOS/NAS permissions

### Storage Safety

- [ ] Low disk warning
- [ ] Storage quota support
- [ ] Failed upload cleanup
- [ ] Adapter unavailable state
- [ ] Adapter retry behavior

## Phase 9 - User Experience Readiness

### Error Handling

- [ ] Friendly error messages everywhere
- [ ] Upload progress indicators
- [ ] Retry failed uploads
- [ ] Empty states for every module
- [ ] Loading states for every module

### Notifications

- [x] Basic notifications
- [x] Share notifications
- [ ] Password reset notifications
- [ ] Storage warnings
- [ ] Backup warnings

## Phase 10 - Advanced Security

### Two-Factor Authentication

- [ ] TOTP support
- [ ] Recovery codes

### Audit Logs

- [x] Login
- [x] Logout
- [x] Upload
- [x] Delete
- [x] Share
- [x] Permission changes
- [ ] Login failures
- [ ] Download events for shared files

## Phase 11 - Before Family/Public Release

### Security

- [ ] Real HTTPS certificate configured
- [x] App-level HTTPS enforcement support
- [x] Rate limiting enabled
- [x] Secrets moved to environment variables where they exist
- [x] File validation working
- [x] Dangerous uploads blocked or quarantined

### Reliability

- [ ] Backups running
- [ ] Restore tested
- [ ] Logs working
- [ ] Health checks working

### Access Control

- [ ] User cannot access another user's private data
- [ ] Shared access works correctly
- [ ] Shared revoke works correctly
- [ ] Admin permissions tested
- [ ] Non-admin permissions tested

### Performance

- [ ] Pagination implemented
- [ ] Database indexes reviewed
- [ ] Large file uploads tested
- [ ] Large file listing tested

## Minimum Viable Secure Equinox

These are the items I would not skip before relying on Equinox for real family use:

- [x] Authentication
- [x] Basic authorization
- [x] Rate limiting
- [x] Secrets in `.env` for current secrets
- [ ] Real HTTPS certificate
- [x] File upload validation
- [ ] Structured logging
- [ ] Database backup
- [ ] File backup
- [ ] Restore test
- [ ] Pagination
- [ ] Storage permissions documented and tested

## Current Recommended Order Before NAS

1. Pagination for files, search, activity, and chat.
2. Backup scripts for PostgreSQL and Local Storage.
3. Health endpoints and dashboard warnings.
4. HTTPS/reverse-proxy deployment notes for the final NAS environment.
5. Access-control regression tests.
