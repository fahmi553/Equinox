import 'dotenv/config';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { createHash, randomBytes } from 'node:crypto';
import path from 'node:path';
import { mkdir, stat, unlink } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import {
  adapterDescriptor,
  adapterErrorCodes,
  adapterErrorResponse,
  AdapterError,
  integrationAdapterDefinitions
} from './integrations/adapter-contracts.js';
import { LocalStorageAdapter } from './integrations/local-storage-adapter.js';

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;
const configuredJwtSecret = process.env.JWT_SECRET;
const jwtSecret = configuredJwtSecret || 'dev-only-secret';
const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'storage/uploads');
const localStorageRoot = path.resolve(process.env.LOCAL_STORAGE_ROOT || 'storage/local');
const resetTokenTtlMinutes = Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES || 30);
const publicShareTtlDays = Number(process.env.PUBLIC_SHARE_TTL_DAYS || 7);
const exposeLocalResetCodes = process.env.EXPOSE_LOCAL_RESET_CODES !== 'false';
const sessionTtlHours = Number(process.env.SESSION_TTL_HOURS || 12);
const rememberSessionTtlDays = Number(process.env.REMEMBER_SESSION_TTL_DAYS || 30);
const enforceHttps = process.env.ENFORCE_HTTPS === 'true';
const trustProxy = process.env.TRUST_PROXY === 'true';
const isProduction = process.env.NODE_ENV === 'production';
const allowedCorsOrigins = corsOrigins(process.env.FRONTEND_URL);
const localStorageMaxUploadMb = Number(process.env.LOCAL_STORAGE_MAX_UPLOAD_MB || 50);
const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const apiRateLimitMax = Number(process.env.API_RATE_LIMIT_MAX || 300);
const authRateLimitMax = Number(process.env.AUTH_RATE_LIMIT_MAX || 5);
const passwordResetRateLimitMax = Number(process.env.PASSWORD_RESET_RATE_LIMIT_MAX || 5);
const uploadRateLimitMax = Number(process.env.UPLOAD_RATE_LIMIT_MAX || 30);
const blockedUploadExtensions = csvSetting(process.env.BLOCKED_UPLOAD_EXTENSIONS, [
  'exe', 'bat', 'cmd', 'com', 'scr', 'msi', 'ps1', 'psm1', 'vbs', 'vbe', 'js', 'jse', 'mjs',
  'cjs', 'jar', 'php', 'sh', 'bash', 'zsh', 'fish', 'py', 'pl', 'rb', 'reg', 'hta', 'html',
  'htm', 'svg'
]);
const allowedUploadExtensions = csvSetting(process.env.ALLOWED_UPLOAD_EXTENSIONS, [
  'txt', 'md', 'csv', 'json', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'mp3', 'wav', 'm4a', 'zip', '7z', 'rar'
]);
const allowedUploadMimeTypes = csvSetting(process.env.ALLOWED_UPLOAD_MIME_TYPES, [
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/csv',
  'application/json',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/x-wav',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-7z-compressed',
  'application/vnd.rar',
  'application/x-rar-compressed'
]);

if (!configuredJwtSecret || configuredJwtSecret === 'dev-only-secret') {
  console.warn('JWT_SECRET is not configured. Set a strong JWT_SECRET in .env before real use.');
} else if (configuredJwtSecret.length < 32) {
  console.warn('JWT_SECRET is set but short. Use at least 32 random characters before real use.');
}

app.set('trust proxy', trustProxy ? 1 : false);

await mkdir(uploadDir, { recursive: true });
await mkdir(localStorageRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const userUploadDir = path.join(uploadDir, req.user.id);
    mkdir(userUploadDir, { recursive: true })
      .then(() => cb(null, userUploadDir))
      .catch((err) => cb(err));
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniquePart = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniquePart}-${safeName}`);
  }
});

const upload = multer({ storage, limits: { fileSize: localStorageMaxUploadMb * 1024 * 1024 } });
const portalUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: localStorageMaxUploadMb * 1024 * 1024 }
});
const localStorageAdapter = new LocalStorageAdapter(localStorageRoot);
const permissionKeys = [
  'canCreateNotes',
  'canCreateTasks',
  'canCreateTags',
  'canCreateBookmarks',
  'canUseChat',
  'canViewAnnouncements'
];
const defaultPermissions = Object.fromEntries(permissionKeys.map((key) => [key, false]));
const rolePermissionSeeds = {
  ADMIN: Object.fromEntries(permissionKeys.map((key) => [key, true])),
  FAMILY: Object.fromEntries(permissionKeys.map((key) => [key, true])),
  GUEST: {
    canCreateNotes: false,
    canCreateTasks: false,
    canCreateTags: false,
    canCreateBookmarks: false,
    canUseChat: false,
    canViewAnnouncements: true
  },
  CHILD: {
    canCreateNotes: true,
    canCreateTasks: true,
    canCreateTags: false,
    canCreateBookmarks: true,
    canUseChat: true,
    canViewAnnouncements: true
  }
};
const roleNames = Object.keys(rolePermissionSeeds);
let rolePermissionDefaults = Object.fromEntries(roleNames.map((role) => [role, { ...rolePermissionSeeds[role] }]));
const moduleRegistry = [
  { key: 'dashboard', label: 'Dashboard', description: 'Family overview and service summary.', path: '/dashboard', group: 'Workspace', icon: 'LayoutDashboard', isCore: true, isToggleable: false, defaultEnabled: true, healthState: 'available' },
  { key: 'notes', label: 'Notes', description: 'Private and shared family notes.', path: '/notes', group: 'Workspace', icon: 'NotebookText', isCore: false, isToggleable: true, defaultEnabled: true, healthState: 'available' },
  { key: 'tasks', label: 'Tasks', description: 'Household tasks and personal to-do lists.', path: '/tasks', group: 'Workspace', icon: 'ListChecks', isCore: false, isToggleable: true, defaultEnabled: true, healthState: 'available' },
  { key: 'bookmarks', label: 'Bookmarks', description: 'Useful family links in one place.', path: '/bookmarks', group: 'Workspace', icon: 'Bookmark', isCore: false, isToggleable: true, defaultEnabled: true, healthState: 'available' },
  { key: 'tags', label: 'Tags', description: 'Labels for organizing productivity content.', path: '/tags', group: 'Workspace', icon: 'Tags', isCore: false, isToggleable: true, defaultEnabled: true, healthState: 'available' },
  { key: 'chat', label: 'Chat', description: 'Simple household messages for family members.', path: '/chat', group: 'Workspace', icon: 'MessageCircle', isCore: false, isToggleable: true, defaultEnabled: true, healthState: 'available' },
  { key: 'search', label: 'Search', description: 'Find content across enabled Equinox modules.', path: '/search', group: 'Workspace', icon: 'Search', isCore: true, isToggleable: false, defaultEnabled: true, healthState: 'available' },
  { key: 'profile', label: 'Profile', description: 'Account details and password management.', path: '/profile', group: 'Account', icon: 'UserRound', isCore: true, isToggleable: false, defaultEnabled: true, healthState: 'available' },
  { key: 'family', label: 'Family', description: 'Family accounts, roles, and announcements.', path: '/family', group: 'Account', icon: 'UsersRound', isCore: true, isToggleable: false, defaultEnabled: true, healthState: 'available', adminOnly: true },
  { key: 'activity', label: 'Activity', description: 'Useful account and content history.', path: '/activity', group: 'Account', icon: 'SquareActivity', isCore: true, isToggleable: false, defaultEnabled: true, healthState: 'available' },
  { key: 'notifications', label: 'Notifications', description: 'Personal unread updates from Equinox.', path: '/notifications', group: 'Account', icon: 'Bell', isCore: true, isToggleable: false, defaultEnabled: true, healthState: 'available' },
  { key: 'guide', label: 'Guide', description: 'Help for people using Equinox.', path: '/guide', group: 'Account', icon: 'CircleHelp', isCore: true, isToggleable: false, defaultEnabled: true, healthState: 'available' },
  { key: 'announcements', label: 'Announcements', description: 'Household messages shown on the dashboard.', path: null, group: 'Family', icon: 'Megaphone', isCore: false, isToggleable: true, defaultEnabled: true, healthState: 'available' },
  { key: 'storage', label: 'Files', description: 'Adapter-backed access to local and NAS files.', path: '/files', group: 'Workspace', icon: 'HardDrive', isCore: false, isToggleable: true, defaultEnabled: true, healthState: 'available' },
  { key: 'photos', label: 'Photo Portal', description: 'Future photo service integration.', path: null, group: 'Portals', icon: 'Images', isCore: false, isToggleable: false, defaultEnabled: false, healthState: 'planned' },
  { key: 'media', label: 'Media Portal', description: 'Future media service integration.', path: null, group: 'Portals', icon: 'Clapperboard', isCore: false, isToggleable: false, defaultEnabled: false, healthState: 'planned' }
];
let moduleSettingMap = {};
const systemSettingSeeds = {
  platformName: 'Equinox',
  householdName: 'Family Workspace'
};
const integrationSettingSeeds = integrationAdapterDefinitions.map((definition) => ({
  key: definition.key,
  label: definition.label,
  adapterType: definition.adapterType,
  healthState: definition.healthState,
  isEnabled: definition.key === 'local-storage'
}));
const startPages = ['/dashboard', '/search', '/profile'];
const dateFormats = ['locale', 'day-first', 'month-first'];

function csvSetting(value, fallback) {
  const source = value ? String(value).split(',') : fallback;
  return source
    .map((item) => String(item).trim().toLowerCase().replace(/^\./, ''))
    .filter(Boolean);
}

function corsOrigins(value) {
  const configured = csvValues(value);
  if (configured.length) return configured;
  return isProduction ? [] : ['http://localhost:5173', 'http://localhost:8080'];
}

function csvValues(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function corsOrigin(origin, callback) {
  if (!origin || allowedCorsOrigins.includes(origin)) {
    return callback(null, true);
  }

  logAuditEvent('warn', 'cors.origin_denied', { origin });
  return callback(null, false);
}

function isSecureRequest(req) {
  return req.secure || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}

function applySecurityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (enforceHttps || isSecureRequest(req)) {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }

  next();
}

function requireHttps(req, res, next) {
  if (!enforceHttps || req.path === '/health' || req.path.startsWith('/health/') || isSecureRequest(req)) {
    return next();
  }

  return res.redirect(308, `https://${req.headers.host}${req.originalUrl}`);
}

function rateLimitNumber(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function paginationParams(query, defaults = {}) {
  const defaultLimit = defaults.limit || 50;
  const maxLimit = defaults.maxLimit || 100;
  const rawPage = query.page;
  const rawLimit = query.limit;
  const page = query.page === undefined ? 1 : Number.parseInt(rawPage, 10);
  const requestedLimit = query.limit === undefined ? defaultLimit : Number.parseInt(rawLimit, 10);

  if (query.page !== undefined && (!Number.isInteger(page) || page < 1 || String(rawPage).trim() !== String(page))) {
    throw new ValidationError('Page must be a positive whole number.');
  }
  if (query.limit !== undefined && (!Number.isInteger(requestedLimit) || requestedLimit < 1 || String(rawLimit).trim() !== String(requestedLimit))) {
    throw new ValidationError('Limit must be a positive whole number.');
  }
  if (requestedLimit > maxLimit) {
    throw new ValidationError(`Limit must be ${maxLimit} or fewer.`);
  }

  const limit = requestedLimit;
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit
  };
}

function paginationMeta({ page, limit, total, returned }) {
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  return {
    page,
    limit,
    total,
    returned,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1
  };
}

function setPaginationHeaders(res, meta) {
  res.setHeader('X-Pagination-Page', String(meta.page));
  res.setHeader('X-Pagination-Limit', String(meta.limit));
  res.setHeader('X-Pagination-Total', String(meta.total));
  res.setHeader('X-Pagination-Total-Pages', String(meta.totalPages));
  res.setHeader('X-Pagination-Has-Next', String(meta.hasNextPage));
  res.setHeader('X-Pagination-Has-Previous', String(meta.hasPreviousPage));
}

const errorCodesByStatus = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  410: 'GONE',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_SERVER_ERROR'
};

function errorResponse(status, message, code) {
  return {
    error: {
      code: code || errorCodesByStatus[status] || 'API_ERROR',
      message
    }
  };
}

function sendError(res, status, message, code) {
  return res.status(status).json(errorResponse(status, message, code));
}

class ValidationError extends Error {
  constructor(message, code = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.status = 400;
  }
}

function requiredString(source, field, label, maxLength) {
  const value = boundedString(source?.[field], label, maxLength).trim();
  if (!value) {
    throw new ValidationError(`${label} is required.`);
  }
  return value;
}

function optionalString(source, field, label, maxLength, fallback = '') {
  if (!Object.hasOwn(source || {}, field) || source[field] === null || source[field] === undefined) {
    return fallback;
  }
  return boundedString(source[field], label, maxLength);
}

function boundedString(value, label, maxLength) {
  const text = String(value ?? '');
  if (maxLength && text.length > maxLength) {
    throw new ValidationError(`${label} must be ${maxLength} characters or fewer.`);
  }
  return text;
}

function enumValue(value, allowed, label, fallback) {
  const clean = String(value ?? fallback ?? '').trim().toUpperCase();
  if (!allowed.includes(clean)) {
    throw new ValidationError(`${label} must be one of: ${allowed.join(', ')}.`);
  }
  return clean;
}

function optionalEnumValue(source, field, allowed, label) {
  if (typeof source?.[field] !== 'string') {
    return undefined;
  }
  return enumValue(source[field], allowed, label);
}

function optionalBoolean(source, field, label) {
  if (!Object.hasOwn(source || {}, field)) {
    return undefined;
  }
  if (typeof source[field] !== 'boolean') {
    throw new ValidationError(`${label} must be true or false.`);
  }
  return source[field];
}

function booleanValue(source, field, label, fallback = false) {
  const value = optionalBoolean(source, field, label);
  return value === undefined ? fallback : value;
}

function passwordValue(source, field, label, minLength = 8, maxLength = 256) {
  const value = String(source?.[field] || '');
  if (!value || value.length < minLength) {
    throw new ValidationError(`${label} must be at least ${minLength} characters.`);
  }
  if (value.length > maxLength) {
    throw new ValidationError(`${label} must be ${maxLength} characters or fewer.`);
  }
  return value;
}

function usernameValue(source, field = 'username') {
  const username = requiredString(source, field, 'Username', 80).toLowerCase();
  if (!/^[a-z0-9._-]{3,80}$/.test(username)) {
    throw new ValidationError('Username must be 3 to 80 characters and use only letters, numbers, dots, underscores, or hyphens.');
  }
  return username;
}

function optionalDateValue(source, field, label) {
  if (!Object.hasOwn(source || {}, field)) {
    return undefined;
  }
  const value = optionalDate(source[field]);
  if (value === undefined) {
    throw new ValidationError(`${label} is invalid.`);
  }
  return value;
}

function adapterPathValue(value, label = 'File path', { required = false } = {}) {
  const text = String(value ?? '').replaceAll('\\', '/').trim();
  if (!text) {
    if (required) {
      throw new AdapterError(adapterErrorCodes.INVALID_PATH, `${label} is required.`);
    }
    return '';
  }
  if (text.length > 512 || text.includes('\0') || text.split('/').some((part) => part === '..')) {
    throw new AdapterError(adapterErrorCodes.INVALID_PATH, `${label} is invalid.`);
  }
  return text;
}

function searchQueryValue(value, maxLength = 120) {
  return boundedString(value ?? '', 'Search query', maxLength).trim();
}

const rateLimitBuckets = new Map();

function requestRateLimitKey(req) {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwardedFor || req.ip || req.socket.remoteAddress || 'unknown';
}

function createRateLimiter({ keyPrefix, max, windowMs = rateLimitWindowMs, message, key = requestRateLimitKey }) {
  const limit = rateLimitNumber(max, 100);
  const duration = rateLimitNumber(windowMs, 60_000);

  return (req, res, next) => {
    const now = Date.now();
    const bucketKey = `${keyPrefix}:${key(req)}`;
    let bucket = rateLimitBuckets.get(bucketKey);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + duration };
      rateLimitBuckets.set(bucketKey, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(limit - bucket.count, 0);
    res.setHeader('RateLimit-Limit', String(limit));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil((bucket.resetAt - now) / 1000)));

    if (bucket.count > limit) {
      return sendError(res, 429, message);
    }

    if (rateLimitBuckets.size > 5000) {
      for (const [currentKey, currentBucket] of rateLimitBuckets.entries()) {
        if (currentBucket.resetAt <= now) {
          rateLimitBuckets.delete(currentKey);
        }
      }
    }

    next();
  };
}

const apiRateLimiter = createRateLimiter({
  keyPrefix: 'api',
  max: apiRateLimitMax,
  message: 'Too many requests. Please wait a moment and try again.'
});
const authRateLimiter = createRateLimiter({
  keyPrefix: 'auth',
  max: authRateLimitMax,
  message: 'Too many sign-in attempts. Please wait a minute and try again.',
  key: (req) => `${requestRateLimitKey(req)}:${String(req.body?.username || '').trim().toLowerCase()}`
});
const passwordResetRateLimiter = createRateLimiter({
  keyPrefix: 'password-reset',
  max: passwordResetRateLimitMax,
  message: 'Too many password reset attempts. Please wait a minute and try again.',
  key: (req) => `${requestRateLimitKey(req)}:${String(req.body?.username || '').trim().toLowerCase()}`
});
const uploadRateLimiter = createRateLimiter({
  keyPrefix: 'upload',
  max: uploadRateLimitMax,
  message: 'Too many uploads. Please wait a moment and try again.'
});

function uploadMiddleware(singleUpload) {
  return (req, res, next) => {
    singleUpload(req, res, (err) => {
      if (!err) return next();

      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        void logUserAuditEvent('upload.failed', req, {
          reason: 'file_size_limit',
          limitMb: localStorageMaxUploadMb
        });
        return sendError(res, 413, `That file is too large. The current upload limit is ${localStorageMaxUploadMb} MB.`);
      }

      logAuditEvent('error', 'upload.failed', {
        ...requestAuditMetadata(req),
        userId: req.user?.id || 'unknown',
        method: req.method,
        path: req.originalUrl,
        reason: err.message
      });
      return sendError(res, 400, 'The file could not be uploaded. Please try a different file.');
    });
  };
}

const handleLegacyFileUpload = uploadMiddleware(upload.single('file'));
const handlePortalFileUpload = uploadMiddleware(portalUpload.single('file'));

function validateUploadedFile(file) {
  if (!file) {
    throw new AdapterError(adapterErrorCodes.NOT_FOUND, 'A file upload is required.');
  }

  const extension = path.extname(file.originalname || '').slice(1).toLowerCase();
  const mimeType = String(file.mimetype || '').toLowerCase();

  if (!extension) {
    throw new AdapterError(adapterErrorCodes.INVALID_PATH, 'Files need a visible file extension before upload.');
  }

  if (blockedUploadExtensions.includes(extension)) {
    throw new AdapterError(adapterErrorCodes.INVALID_PATH, `.${extension} files are blocked for safety.`);
  }

  if (!allowedUploadExtensions.includes(extension)) {
    throw new AdapterError(adapterErrorCodes.INVALID_PATH, `.${extension} files are not allowed in Equinox uploads yet.`);
  }

  if (!mimeType || !allowedUploadMimeTypes.includes(mimeType)) {
    throw new AdapterError(adapterErrorCodes.INVALID_PATH, `The file type "${mimeType || 'unknown'}" is not allowed for upload.`);
  }
}

app.use(applySecurityHeaders);
app.use(requireHttps);
app.use(cors({ origin: corsOrigin }));
app.use(express.json());
app.use(apiRateLimiter);

async function createSession(user, req, rememberMe = false) {
  const tokenId = randomToken(16);
  const expiresAt = rememberMe ? daysFromNow(rememberSessionTtlDays) : new Date(Date.now() + sessionTtlHours * 60 * 60 * 1000);
  const session = await prisma.userSession.create({
    data: {
      tokenId,
      userId: user.id,
      rememberMe,
      expiresAt,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    }
  });

  return {
    session,
    token: jwt.sign({ id: user.id, role: user.role, sid: session.id, jti: tokenId }, jwtSecret, { expiresIn: rememberMe ? `${rememberSessionTtlDays}d` : `${sessionTtlHours}h` })
  };
}

function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

function tokenHash(token) {
  return createHash('sha256').update(String(token || '')).digest('hex');
}

function minutesFromNow(minutes) {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + minutes);
  return expiresAt;
}

function daysFromNow(days) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt;
}

function permissionsFor(user) {
  const roleDefaults = rolePermissionDefaults[user.role] || defaultPermissions;
  return Object.fromEntries(permissionKeys.map((key) => [key, user[key] ?? roleDefaults[key] ?? false]));
}

function permissionOverridesFor(user) {
  return Object.fromEntries(permissionKeys.map((key) => [key, user[key] ?? null]));
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    permissions: permissionsFor(user),
    permissionOverrides: permissionOverridesFor(user),
    rolePermissions: rolePermissionDefaults[user.role] || defaultPermissions,
    createdAt: user.createdAt
  };
}

function permissionData(source = {}) {
  const incoming = source.permissions && typeof source.permissions === 'object' ? source.permissions : source;
  return Object.fromEntries(
    permissionKeys
      .filter((key) => typeof incoming[key] === 'boolean' || incoming[key] === null)
      .map((key) => [key, incoming[key]])
  );
}

function rolePermissionData(source = {}) {
  return Object.fromEntries(
    permissionKeys
      .filter((key) => typeof source[key] === 'boolean')
      .map((key) => [key, source[key]])
  );
}

function normalizePermissions(source = {}) {
  return Object.fromEntries(permissionKeys.map((key) => [key, source[key] ?? false]));
}

async function loadRolePermissionDefaults() {
  const rows = await prisma.rolePermission.findMany();
  rolePermissionDefaults = {
    ...Object.fromEntries(roleNames.map((role) => [role, { ...rolePermissionSeeds[role] }])),
    ...Object.fromEntries(rows.map((row) => [row.role, normalizePermissions(row)]))
  };
}

async function ensureRolePermissions() {
  await Promise.all(roleNames.map((role) => prisma.rolePermission.upsert({
    where: { role },
    create: { role, ...rolePermissionSeeds[role] },
    update: {}
  })));
  await loadRolePermissionDefaults();
}

function serializeModule(module) {
  const setting = moduleSettingMap[module.key];

  return {
    ...module,
    isEnabled: module.isCore ? true : setting?.isEnabled ?? module.defaultEnabled,
    healthState: setting?.healthState ?? module.healthState
  };
}

async function loadModuleSettings() {
  const rows = await prisma.moduleSetting.findMany();
  moduleSettingMap = Object.fromEntries(rows.map((row) => [row.key, row]));
}

async function ensureModuleSettings() {
  await Promise.all(moduleRegistry.map((module) => prisma.moduleSetting.upsert({
    where: { key: module.key },
    create: {
      key: module.key,
      isEnabled: module.defaultEnabled,
      healthState: module.healthState
    },
    update: {}
  })));
  await loadModuleSettings();
}

async function ensureSettingsFoundation() {
  await Promise.all(Object.entries(systemSettingSeeds).map(([key, value]) => prisma.systemSetting.upsert({
    where: { key },
    create: { key, value },
    update: {}
  })));
  await Promise.all(integrationSettingSeeds.map((integration) => prisma.integrationSetting.upsert({
    where: { key: integration.key },
    create: integration,
    update: {}
  })));
}

async function systemSettings() {
  const rows = await prisma.systemSetting.findMany({ orderBy: { key: 'asc' } });
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

function serializeIntegration(integration, includeConfig = false) {
  const definition = integrationAdapterDefinitions.find((item) => item.key === integration.key);

  return {
    key: integration.key,
    label: integration.label,
    adapterType: integration.adapterType,
    isEnabled: integration.isEnabled,
    healthState: integration.healthState,
    description: definition?.description || '',
    capabilities: definition?.capabilities || [],
    configSchema: definition?.configSchema || {},
    updatedAt: integration.updatedAt,
    ...(includeConfig ? { config: integration.config || {} } : {})
  };
}

async function userPreferences(userId) {
  return prisma.userPreference.upsert({
    where: { userId },
    create: { userId },
    update: {}
  });
}

function isModuleEnabled(key) {
  const module = moduleRegistry.find((item) => item.key === key);
  return module ? serializeModule(module).isEnabled : false;
}

function requireModule(key) {
  return async (req, res, next) => {
    if (isModuleEnabled(key)) {
      return next();
    }

    await logUserAuditEvent('permission.denied', req, { reason: 'module_disabled', module: key });
    return sendError(res, 404, 'This Equinox module is currently disabled.');
  };
}

async function logActivity(action, userId, metadata = undefined, visibility = 'PRIVATE') {
  await prisma.activityLog.create({
    data: {
      action,
      userId,
      metadata: { ...(metadata || {}), visibility }
    }
  });
}

function logAuditEvent(level, event, metadata = {}) {
  const payload = {
    event,
    at: new Date().toISOString(),
    ...metadata
  };
  const logger = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
  logger(JSON.stringify(payload));
}

async function logUserAuditEvent(action, req, metadata = {}, visibility = 'PRIVATE') {
  if (!req.user?.id) return;
  try {
    await logActivity(action, req.user.id, {
      ...metadata,
      ...requestAuditMetadata(req),
      method: req.method,
      path: req.originalUrl
    }, visibility);
  } catch (err) {
    logAuditEvent('error', 'audit_log_failed', {
      action,
      userId: req.user.id,
      error: err.message
    });
  }
}

function requestAuditMetadata(req) {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();

  return {
    ipAddress: forwardedFor || req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: String(req.headers['user-agent'] || 'unknown').slice(0, 180)
  };
}

function serializeActivity(item) {
  const { visibility: _visibility, ...metadata } = item.metadata || {};

  return {
    id: item.id,
    action: item.action,
    metadata,
    createdAt: item.createdAt,
    user: item.user ? publicUser(item.user) : null
  };
}

const adminOnlyActivityActions = new Set([
  'auth.owner_setup',
  'user.login',
  'user.created',
  'user.updated',
  'user.password_reset',
  'user.permissions_updated',
  'role.permissions_updated',
  'module.updated',
  'settings.system_updated',
  'settings.integration_updated'
]);

function canViewActivity(item, user) {
  if (user.role === 'ADMIN') {
    return true;
  }

  if (adminOnlyActivityActions.has(item.action)) {
    return false;
  }

  if (item.action.startsWith('announcement.') && !permissionsFor(user).canViewAnnouncements) {
    return false;
  }

  if (item.userId === user.id) {
    return true;
  }

  return item.metadata?.visibility === 'SHARED';
}

function visibleActivity(items, user, limit) {
  return items.filter((item) => canViewActivity(item, user)).slice(0, limit);
}

async function createNotifications(users, data) {
  if (!users.length) return;

  await prisma.notification.createMany({
    data: users.map((user) => ({
      userId: user.id,
      type: data.type,
      title: data.title,
      body: data.body,
      link: data.link || null,
      sourceId: data.sourceId || null
    }))
  });
}

async function householdUsers(excludeUserId, predicate = () => true) {
  const users = await prisma.user.findMany();
  return users.filter((user) => user.id !== excludeUserId && predicate(user));
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    logAuditEvent('warn', 'auth.missing_token', {
      ...requestAuditMetadata(req),
      method: req.method,
      path: req.originalUrl
    });
    return sendError(res, 401, 'Missing authorization token.');
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    const session = payload.sid ? await prisma.userSession.findFirst({
      where: {
        id: payload.sid,
        tokenId: payload.jti || '',
        userId: payload.id,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      },
      include: { user: true }
    }) : null;

    if (!session || !session.user) {
      logAuditEvent('warn', 'auth.invalid_session', {
        ...requestAuditMetadata(req),
        method: req.method,
        path: req.originalUrl,
        userId: payload.id || 'unknown'
      });
      return sendError(res, 401, 'Session expired. Please sign in again.');
    }

    req.user = { id: session.user.id, role: session.user.role };
    req.session = session;
    await prisma.userSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() }
    });
    return next();
  } catch {
    logAuditEvent('warn', 'auth.invalid_token', {
      ...requestAuditMetadata(req),
      method: req.method,
      path: req.originalUrl
    });
    return sendError(res, 401, 'Invalid or expired token.');
  }
}

async function requireAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN') {
    await logUserAuditEvent('permission.denied', req, { reason: 'admin_required', role: req.user.role });
    return sendError(res, 403, 'Admin access required.');
  }

  return next();
}

async function wouldRemoveLastAdmin(targetUser, nextRole) {
  if (targetUser.role !== 'ADMIN' || nextRole === 'ADMIN') {
    return false;
  }

  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  return adminCount <= 1;
}

function requireCapability(permission) {
  return async (req, res, next) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: Object.fromEntries(['id', 'role', ...permissionKeys].map((key) => [key, true]))
    });

    if (!user) {
      return sendError(res, 401, 'User not found.');
    }

    if (permissionsFor(user)[permission]) {
      return next();
    }

    await logUserAuditEvent('permission.denied', req, { reason: 'capability_required', permission });
    return sendError(res, 403, 'This account does not have permission for that action.');
  };
}

function ownedContentWhere(user) {
  if (user.role === 'ADMIN') {
    return {};
  }

  return { ownerId: user.id };
}

function canEditContent(item, user) {
  return user.role === 'ADMIN' || item.ownerId === user.id;
}

async function sharedFolderTreeIds() {
  const sharedFolders = await prisma.folder.findMany({
    where: { isShared: true },
    select: { id: true }
  });
  const ids = new Set();

  for (const folder of sharedFolders) {
    const folderIds = await collectFolderIds(folder.id);
    folderIds.forEach((id) => ids.add(id));
  }

  return ids;
}

async function accessibleFolderWhere(user) {
  if (user.role === 'ADMIN') {
    return {};
  }

  const sharedIds = [...await sharedFolderTreeIds()];

  return {
    OR: [
      { ownerId: user.id },
      ...(sharedIds.length ? [{ id: { in: sharedIds } }] : [])
    ]
  };
}

async function accessibleFileWhere(user) {
  if (user.role === 'ADMIN') {
    return {};
  }

  const sharedIds = [...await sharedFolderTreeIds()];

  return {
    OR: [
      { ownerId: user.id },
      { isShared: true },
      ...(sharedIds.length ? [{ folderId: { in: sharedIds } }] : [])
    ]
  };
}

async function getAccessibleFolder(folderId, user) {
  if (!folderId) {
    return null;
  }

  return prisma.folder.findFirst({
    where: {
      id: folderId,
      ...await accessibleFolderWhere(user)
    }
  });
}

async function getEditableFolder(folderId, user) {
  if (!folderId) {
    return null;
  }

  return prisma.folder.findFirst({
    where: {
      id: folderId,
      ...ownedContentWhere(user)
    }
  });
}

async function storageBreadcrumb(folder, user) {
  const breadcrumb = [];
  let current = folder;

  while (current) {
    breadcrumb.unshift({ id: current.id, name: current.name });
    current = current.parentId ? await getAccessibleFolder(current.parentId, user) : null;
  }

  return breadcrumb;
}

async function collectFolderIds(folderId) {
  const ids = [folderId];
  const children = await prisma.folder.findMany({
    where: { parentId: folderId },
    select: { id: true }
  });

  for (const child of children) {
    ids.push(...await collectFolderIds(child.id));
  }

  return ids;
}

async function folderPath(folder) {
  if (!folder) {
    return 'Root';
  }

  const parts = [folder.name];
  let current = folder;

  while (current.parentId) {
    current = await prisma.folder.findUnique({ where: { id: current.parentId } });
    if (current) {
      parts.unshift(current.name);
    }
  }

  return parts.join(' / ');
}

function folderShareState(folder, sharedFolderIds) {
  if (folder.isShared) {
    return 'shared';
  }

  if (sharedFolderIds.has(folder.id)) {
    return 'inherited';
  }

  return 'private';
}

function fileShareState(file, sharedFolderIds) {
  if (file.isShared) {
    return 'shared';
  }

  if (file.folderId && sharedFolderIds.has(file.folderId)) {
    return 'inherited';
  }

  return 'private';
}

async function userStorageStats(userId) {
  const [files, storageUsage, folders] = await Promise.all([
    prisma.fileAsset.count({ where: { ownerId: userId } }),
    prisma.fileAsset.aggregate({
      where: { ownerId: userId },
      _sum: { size: true }
    }),
    prisma.folder.count({ where: { ownerId: userId } })
  ]);

  return {
    files,
    folders,
    storageBytes: storageUsage._sum.size || 0
  };
}

function accessibleNoteWhere(user) {
  if (user.role === 'ADMIN') {
    return {};
  }

  return {
    OR: [
      { ownerId: user.id },
      { isShared: true }
    ]
  };
}

function accessibleReminderWhere(user) {
  if (user.role === 'ADMIN') {
    return {};
  }

  return {
    OR: [
      { ownerId: user.id },
      { isShared: true }
    ]
  };
}

function accessibleTaskWhere(user) {
  if (user.role === 'ADMIN') {
    return {};
  }

  return {
    OR: [
      { ownerId: user.id },
      { isShared: true }
    ]
  };
}

function accessibleTagWhere(user) {
  if (user.role === 'ADMIN') {
    return {};
  }

  return {
    OR: [
      { ownerId: user.id },
      { isShared: true }
    ]
  };
}

function accessibleBookmarkWhere(user) {
  if (user.role === 'ADMIN') {
    return {};
  }

  return {
    OR: [
      { ownerId: user.id },
      { isShared: true }
    ]
  };
}

async function editableTagConnections(tagIds, user, operation = 'set') {
  if (tagIds === undefined) {
    return undefined;
  }
  if (!Array.isArray(tagIds)) {
    throw new ValidationError('Tag IDs must be an array.');
  }
  if (tagIds.length > 50) {
    throw new ValidationError('Tag IDs must include 50 items or fewer.');
  }

  const tags = await prisma.tag.findMany({
    where: {
      id: { in: [...new Set(tagIds.map((id) => boundedString(id, 'Tag ID', 120)))] },
      ...ownedContentWhere(user)
    },
    select: { id: true }
  });

  return { [operation]: tags.map((tag) => ({ id: tag.id })) };
}

function serializeTag(tag, user) {
  return {
    ...tag,
    canEdit: canEditContent(tag, user)
  };
}

function adapterMetadataWhere(user) {
  if (user.role === 'ADMIN') {
    return {};
  }

  return { ownerId: user.id };
}

function serializeAdapterMetadata(metadata, user) {
  if (!metadata) {
    return {
      id: null,
      isImportant: false,
    isShared: false,
    sharedWith: [],
    publicLinks: [],
    tags: [],
    canEdit: true
  };
  }

  return {
    id: metadata.id,
    isImportant: metadata.isImportant,
    isShared: metadata.isShared,
    sharedWith: (metadata.userShares || []).map((share) => publicUser(share.user)),
    publicLinks: (metadata.publicLinks || []).map((link) => ({
      id: link.id,
      label: link.label,
      expiresAt: link.expiresAt,
      isRevoked: link.isRevoked,
      downloadCount: link.downloadCount,
      createdAt: link.createdAt
    })),
    tags: (metadata.tags || []).map((tag) => serializeTag(tag, user)),
    canEdit: canEditContent(metadata, user),
    owner: metadata.owner ? publicUser(metadata.owner) : null
  };
}

function formatBytes(bytes = 0) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

async function enrichAdapterItems(items, user, adapterKey = 'local-storage') {
  const fileItems = items.filter((item) => item.type === 'file');
  if (!fileItems.length) return items;

  const metadataRows = await prisma.adapterFileMetadata.findMany({
    where: {
      adapterKey,
      path: { in: fileItems.map((item) => item.path) },
      ...adapterMetadataWhere(user)
    },
    include: { owner: true, tags: true, userShares: { include: { user: true } }, publicLinks: { where: { isRevoked: false }, orderBy: { createdAt: 'desc' } } }
  });
  const ownRows = metadataRows.filter((item) => item.ownerId === user.id);
  const metadataMap = new Map([
    ...metadataRows.map((item) => [item.path, item]),
    ...ownRows.map((item) => [item.path, item])
  ]);

  return items.map((item) => {
    if (item.type !== 'file') return item;
    const metadata = metadataMap.get(item.path);
    return {
      ...item,
      metadata: {
        ...item.metadata,
        app: serializeAdapterMetadata(metadata, user)
      }
    };
  });
}

async function upsertAdapterFileMetadata({ adapterKey = 'local-storage', item, user, data = {} }) {
  const tagConnections = await editableTagConnections(data.tagIds, user);
  const createTagConnections = tagConnections
    ? { connect: tagConnections.set || [] }
    : undefined;

  const updateData = {
    name: item.name,
    size: item.size,
    ...(typeof data.isImportant === 'boolean' ? { isImportant: data.isImportant } : {}),
    ...(typeof data.isShared === 'boolean' ? { isShared: data.isShared } : {}),
    ...(tagConnections ? { tags: tagConnections } : {})
  };

  return prisma.adapterFileMetadata.upsert({
    where: {
      adapterKey_path_ownerId: {
        adapterKey,
        path: item.path,
        ownerId: user.id
      }
    },
    create: {
      adapterKey,
      path: item.path,
      name: item.name,
      size: item.size,
      ownerId: user.id,
      isImportant: typeof data.isImportant === 'boolean' ? data.isImportant : false,
      isShared: typeof data.isShared === 'boolean' ? data.isShared : false,
      ...(createTagConnections ? { tags: createTagConnections } : {})
    },
    update: updateData,
    include: { owner: true, tags: true, userShares: { include: { user: true } }, publicLinks: { where: { isRevoked: false }, orderBy: { createdAt: 'desc' } } }
  });
}

async function ensureOwnedAdapterMetadata(pathValue, user) {
  const target = localStorageAdapter.resolvePath(adapterPathValue(pathValue, 'File path', { required: true }));
  const item = await localStorageAdapter.itemFromPath(target);

  if (item.type !== 'file') {
    throw new AdapterError(adapterErrorCodes.INVALID_PATH, 'Only files can be shared.');
  }

  const metadata = await upsertAdapterFileMetadata({
    adapterKey: localStorageAdapter.key,
    item,
    user,
    data: {}
  });

  if (!canEditContent(metadata, user)) {
    throw new AdapterError(adapterErrorCodes.PERMISSION_DENIED, 'Only the owner can change sharing for this file.');
  }

  return { item, metadata };
}

async function localAdapterMetadataForPath(pathValue) {
  const target = localStorageAdapter.resolvePath(adapterPathValue(pathValue, 'File path', { required: true }));
  const item = await localStorageAdapter.itemFromPath(target);

  if (item.type !== 'file') {
    throw new AdapterError(adapterErrorCodes.INVALID_PATH, 'Only files are supported for this action.');
  }

  const metadata = await prisma.adapterFileMetadata.findFirst({
    where: {
      adapterKey: localStorageAdapter.key,
      path: item.path
    },
    include: { owner: true, tags: true, userShares: { include: { user: true } }, publicLinks: { where: { isRevoked: false }, orderBy: { createdAt: 'desc' } } }
  });

  return { item, metadata };
}

async function requireLocalFileOwner(pathValue, user) {
  const { item, metadata } = await localAdapterMetadataForPath(pathValue);

  if (!metadata) {
    if (user.role === 'ADMIN') return { item, metadata };
    throw new AdapterError(adapterErrorCodes.PERMISSION_DENIED, 'Only an admin can manage unclaimed adapter files.');
  }

  if (user.role !== 'ADMIN' && metadata.ownerId !== user.id) {
    throw new AdapterError(adapterErrorCodes.PERMISSION_DENIED, 'Only the owner can manage this file.');
  }

  return { item, metadata };
}

async function requireLocalFileRead(pathValue, user) {
  const { item, metadata } = await localAdapterMetadataForPath(pathValue);

  if (!metadata) {
    if (user.role === 'ADMIN') return { item, metadata };
    throw new AdapterError(adapterErrorCodes.PERMISSION_DENIED, 'This file has not been shared with this account.');
  }

  const canRead = user.role === 'ADMIN'
    || metadata.ownerId === user.id
    || metadata.isShared
    || metadata.userShares.some((share) => share.userId === user.id);

  if (!canRead) {
    throw new AdapterError(adapterErrorCodes.PERMISSION_DENIED, 'This file has not been shared with this account.');
  }

  return { item, metadata };
}

async function canAccessSharedMetadata(metadataId, user) {
  if (user.role === 'ADMIN') {
    return prisma.adapterFileMetadata.findFirst({
      where: {
        id: metadataId,
        adapterKey: localStorageAdapter.key
      },
      include: { owner: true, tags: true, userShares: { include: { user: true } }, publicLinks: { where: { isRevoked: false }, orderBy: { createdAt: 'desc' } } }
    });
  }

  return prisma.adapterFileMetadata.findFirst({
    where: {
      id: metadataId,
      adapterKey: localStorageAdapter.key,
      OR: [
        { isShared: true },
        { ownerId: user.id },
        { userShares: { some: { userId: user.id } } }
      ]
    },
    include: { owner: true, tags: true, userShares: { include: { user: true } }, publicLinks: { where: { isRevoked: false }, orderBy: { createdAt: 'desc' } } }
  });
}

function cleanUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;

  try {
    const parsed = new URL(normalized);
    return ['http:', 'https:'].includes(parsed.protocol) && parsed.hostname ? parsed.toString() : '';
  } catch {
    return '';
  }
}

const taskPriorities = ['LOW', 'NORMAL', 'HIGH'];
const taskStatuses = ['OPEN', 'WAITING', 'DONE'];
const taskPriorityRank = { HIGH: 0, NORMAL: 1, LOW: 2 };

function compareTasks(left, right) {
  const priorityDifference = (taskPriorityRank[left.priority] ?? 1) - (taskPriorityRank[right.priority] ?? 1);
  if (priorityDifference) return priorityDifference;

  const leftDueAt = left.dueAt ? new Date(left.dueAt).getTime() : Number.POSITIVE_INFINITY;
  const rightDueAt = right.dueAt ? new Date(right.dueAt).getTime() : Number.POSITIVE_INFINITY;
  if (leftDueAt !== rightDueAt) return leftDueAt - rightDueAt;

  return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
}

function previewType(file) {
  const mimeType = file.mimeType || '';
  const extension = path.extname(file.originalName || '').toLowerCase();

  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('text/')) return 'text';
  if (['.csv', '.json', '.md', '.log', '.txt'].includes(extension)) return 'text';

  return null;
}

async function resolveStoredFilePath(file) {
  const candidates = [
    path.resolve(file.path),
    path.join(uploadDir, path.basename(path.dirname(file.path || '')), path.basename(file.path || ''))
  ];

  for (const candidate of [...new Set(candidates)]) {
    try {
      await stat(candidate);
      return candidate;
    } catch {
      // Try the next possible path. Older rows may contain paths from before the Docker volume was normalized.
    }
  }

  return null;
}

async function serializeDocumentRecord(record, user, sharedFolderIds) {
  return {
    ...record,
    canEdit: canEditContent(record, user),
    owner: publicUser(record.owner),
    file: record.file ? {
      ...record.file,
      canEdit: canEditContent(record.file, user),
      owner: publicUser(record.file.owner),
      folderPath: await folderPath(record.file.folder),
      shareState: fileShareState(record.file, sharedFolderIds)
    } : null
  };
}

function optionalAmount(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function activeAnnouncementWhere() {
  return {
    OR: [
      { expiresAt: null },
      { expiresAt: { gte: new Date() } }
    ]
  };
}

function optionalDate(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function serializeAnnouncement(item) {
  return {
    ...item,
    author: publicUser(item.author)
  };
}

async function databaseHealth() {
  const startedAt = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  return {
    status: 'ok',
    latencyMs: Date.now() - startedAt
  };
}

app.get('/health', async (_req, res) => {
  try {
    const database = await databaseHealth();
    res.json({
      status: 'ok',
      service: 'equinox-api',
      database
    });
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      service: 'equinox-api',
      database: {
        status: 'error',
        message: 'Database health check failed.'
      }
    });
  }
});

app.get('/health/db', async (_req, res) => {
  try {
    res.json(await databaseHealth());
  } catch (err) {
    res.status(503).json({
      status: 'error',
      message: 'Database health check failed.'
    });
  }
});

app.get('/auth/status', async (_req, res) => {
  const userCount = await prisma.user.count();
  res.json({
    hasOwner: userCount > 0,
    setupRequired: userCount === 0,
    roles: roleNames
  });
});

app.get('/auth/me', requireAuth, async (req, res) => {
  const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });

  if (!currentUser) {
    return sendError(res, 401, 'User not found.');
  }

  res.json({ user: publicUser(currentUser) });
});

app.post('/auth/setup', authRateLimiter, async (req, res) => {
  const cleanUsername = usernameValue(req.body);
  const cleanDisplayName = requiredString(req.body, 'displayName', 'Display name', 120);
  const password = passwordValue(req.body, 'password', 'Password');

  const userCount = await prisma.user.count();
  if (userCount > 0) {
    return sendError(res, 409, 'Equinox is already set up. Ask an admin to create your account.');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        username: cleanUsername,
        displayName: cleanDisplayName,
        passwordHash,
        role: 'ADMIN'
      }
    });

    const session = await createSession(user, req, Boolean(req.body.rememberMe));
    await logActivity('auth.owner_setup', user.id, { username: user.username });
    res.status(201).json({ token: session.token, user: publicUser(user), session: serializeSession(session.session) });
  } catch (err) {
    if (err.code === 'P2002') {
      return sendError(res, 409, 'Username is already taken.');
    }

    throw err;
  }
});

app.post('/auth/register', async (_req, res) => {
  const userCount = await prisma.user.count();

  if (userCount === 0) {
    return sendError(res, 410, 'Use first-run setup to create the owner account.');
  }

  return sendError(res, 403, 'Public registration is disabled. Ask an admin to create your account.');
});

app.post('/auth/login', authRateLimiter, async (req, res) => {
  const password = String(req.body.password || '');
  const rememberMe = booleanValue(req.body, 'rememberMe', 'Remember me', false);
  const cleanUsername = usernameValue(req.body);
  const user = await prisma.user.findUnique({ where: { username: cleanUsername } });

  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
    const metadata = {
      username: cleanUsername,
      ...requestAuditMetadata(req)
    };
    if (user) {
      await logActivity('user.login_failed', user.id, metadata);
    } else {
      logAuditEvent('warn', 'user.login_failed', metadata);
    }
    return sendError(res, 401, 'Invalid username or password.');
  }

  await logActivity('user.login', user.id, {
    username: user.username,
    ...requestAuditMetadata(req)
  });
  const session = await createSession(user, req, Boolean(rememberMe));
  res.json({ token: session.token, user: publicUser(user), session: serializeSession(session.session) });
});

function serializeSession(session) {
  return {
    id: session.id,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    rememberMe: session.rememberMe,
    createdAt: session.createdAt,
    lastSeenAt: session.lastSeenAt,
    expiresAt: session.expiresAt,
    isCurrent: false
  };
}

app.post('/auth/logout', requireAuth, async (req, res) => {
  await prisma.userSession.update({
    where: { id: req.session.id },
    data: { revokedAt: new Date() }
  });
  await logActivity('user.logout', req.user.id, { sessionId: req.session.id }, 'PRIVATE');
  res.status(204).end();
});

app.post('/auth/logout-all', requireAuth, async (req, res) => {
  await prisma.userSession.updateMany({
    where: { userId: req.user.id, revokedAt: null },
    data: { revokedAt: new Date() }
  });
  await logActivity('user.logout_all', req.user.id, {}, 'PRIVATE');
  res.status(204).end();
});

app.get('/auth/sessions', requireAuth, async (req, res) => {
  const sessions = await prisma.userSession.findMany({
    where: {
      userId: req.user.id,
      revokedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { lastSeenAt: 'desc' }
  });

  res.json(sessions.map((session) => ({
    ...serializeSession(session),
    isCurrent: session.id === req.session.id
  })));
});

app.delete('/auth/sessions/:id', requireAuth, async (req, res) => {
  const session = await prisma.userSession.findFirst({
    where: { id: req.params.id, userId: req.user.id, revokedAt: null }
  });

  if (!session) {
    return sendError(res, 404, 'Session not found.');
  }

  await prisma.userSession.update({
    where: { id: session.id },
    data: { revokedAt: new Date() }
  });
  await logActivity('user.session_revoked', req.user.id, { sessionId: session.id }, 'PRIVATE');
  res.status(204).end();
});

app.post('/auth/password-reset/request', passwordResetRateLimiter, async (req, res) => {
  const username = usernameValue(req.body);
  const user = username ? await prisma.user.findUnique({ where: { username } }) : null;
  let resetCode = null;

  if (user) {
    const rawToken = randomToken(24);
    resetCode = rawToken;

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: tokenHash(rawToken),
        expiresAt: minutesFromNow(resetTokenTtlMinutes)
      }
    });

    await logActivity('auth.password_reset_requested', user.id, { username: user.username }, 'PRIVATE');
  }

  res.json({
    message: 'If that account exists, a password reset code has been created.',
    resetCode: exposeLocalResetCodes ? resetCode : null,
    expiresInMinutes: resetTokenTtlMinutes
  });
});

app.post('/auth/password-reset/confirm', passwordResetRateLimiter, async (req, res) => {
  const username = usernameValue(req.body);
  const code = requiredString(req.body, 'code', 'Reset code', 200);
  const password = passwordValue(req.body, 'password', 'New password');

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return sendError(res, 400, 'Reset code is invalid or expired.');
  }

  const reset = await prisma.passwordResetToken.findFirst({
    where: {
      userId: user.id,
      tokenHash: tokenHash(code),
      usedAt: null,
      expiresAt: { gt: new Date() }
    }
  });

  if (!reset) {
    return sendError(res, 400, 'Reset code is invalid or expired.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null, id: { not: reset.id } },
      data: { usedAt: new Date() }
    })
  ]);

  await logActivity('auth.password_reset_completed', user.id, { username: user.username }, 'PRIVATE');
  res.status(204).end();
});

app.post('/auth/change-password', requireAuth, async (req, res) => {
  const currentPassword = passwordValue(req.body, 'currentPassword', 'Current password', 1);
  const newPassword = passwordValue(req.body, 'newPassword', 'New password');

  const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });

  if (!currentUser || !(await bcrypt.compare(currentPassword, currentUser.passwordHash))) {
    return sendError(res, 401, 'Current password is incorrect.');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: currentUser.id }, data: { passwordHash } });
  await logActivity('auth.password_changed', currentUser.id, { username: currentUser.username });
  res.status(204).end();
});

app.get('/dashboard', requireAuth, async (req, res) => {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const visibleActiveTasks = { ...accessibleTaskWhere(req.user), status: { not: 'DONE' } };
  const [profileUser, notes, tasks, bookmarks, importantFiles, recentImportantFiles, users, overdueTasks, todayTasks, recentTasks, activity] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.user.id } }),
    prisma.note.count({ where: accessibleNoteWhere(req.user) }),
    prisma.task.count({ where: visibleActiveTasks }),
    prisma.bookmark.count({ where: accessibleBookmarkWhere(req.user) }),
    isModuleEnabled('storage') ? prisma.adapterFileMetadata.count({
      where: { isImportant: true, ...adapterMetadataWhere(req.user) }
    }) : 0,
    isModuleEnabled('storage') ? prisma.adapterFileMetadata.findMany({
      where: { isImportant: true, ...adapterMetadataWhere(req.user) },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: { owner: true, tags: true }
    }) : [],
    prisma.user.count(),
    prisma.task.count({ where: { ...visibleActiveTasks, dueAt: { lt: todayStart } } }),
    prisma.task.count({ where: { ...visibleActiveTasks, dueAt: { gte: todayStart, lt: tomorrowStart } } }),
    prisma.task.findMany({
      where: visibleActiveTasks,
      orderBy: { updatedAt: 'desc' },
      include: { owner: true }
    }),
    prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 80, include: { user: true } })
  ]);

  res.json({
    user: profileUser ? publicUser(profileUser) : null,
    totals: { notes, tasks, bookmarks, files: importantFiles, users },
    fileSummary: {
      important: importantFiles,
      recentImportant: recentImportantFiles.map((item) => ({
        id: item.id,
        adapterKey: item.adapterKey,
        name: item.name,
        path: item.path,
        size: item.size,
        isImportant: item.isImportant,
        tags: item.tags.map((tag) => serializeTag(tag, req.user)),
        owner: publicUser(item.owner)
      }))
    },
    taskSummary: {
      overdue: overdueTasks,
      today: todayTasks,
      recent: recentTasks.sort(compareTasks).slice(0, 5).map((task) => ({
        id: task.id,
        title: task.title,
        priority: task.priority,
        status: task.status,
        dueAt: task.dueAt,
        isShared: task.isShared,
        owner: publicUser(task.owner)
      }))
    },
    services: [
      { id: 'api', name: 'Equinox API', detail: 'Application services', status: 'online' },
      { id: 'database', name: 'PostgreSQL', detail: 'Application data', status: 'online' },
      { id: 'storage', name: 'File Portal', detail: 'Local Storage adapter', status: isModuleEnabled('storage') ? 'online' : 'planned' },
      { id: 'photos', name: 'Photos', detail: 'Photo adapter', status: 'planned' },
      { id: 'media', name: 'Media', detail: 'Media adapter', status: 'planned' }
    ],
    activity: visibleActivity(activity, profileUser || req.user, 8).map(serializeActivity)
  });
});

app.get('/modules', requireAuth, (_req, res) => {
  res.json(moduleRegistry.map(serializeModule));
});

app.patch('/modules/:key', requireAuth, requireAdmin, async (req, res) => {
  const module = moduleRegistry.find((item) => item.key === req.params.key);

  if (!module) {
    return sendError(res, 404, 'Module not found.');
  }
  if (!module.isToggleable || module.healthState === 'planned') {
    return sendError(res, 400, 'This module cannot be enabled or disabled.');
  }
  const isEnabled = booleanValue(req.body, 'isEnabled', 'Module enabled');

  await prisma.moduleSetting.update({
    where: { key: module.key },
    data: { isEnabled }
  });
  await loadModuleSettings();
  await logActivity('module.updated', req.user.id, {
    key: module.key,
    label: module.label,
    isEnabled
  });
  res.json(serializeModule(module));
});

app.get('/settings', requireAuth, async (req, res) => {
  const [system, preferences, integrations] = await Promise.all([
    systemSettings(),
    userPreferences(req.user.id),
    prisma.integrationSetting.findMany({ orderBy: { label: 'asc' } })
  ]);

  res.json({
    system,
    preferences,
    integrations: integrations.map((integration) => serializeIntegration(integration, req.user.role === 'ADMIN'))
  });
});

app.get('/integrations/adapters', requireAuth, requireAdmin, async (_req, res) => {
  const settings = await prisma.integrationSetting.findMany();
  const settingMap = Object.fromEntries(settings.map((setting) => [setting.key, setting]));

  res.json({
    adapters: integrationAdapterDefinitions.map((definition) => adapterDescriptor(settingMap[definition.key], definition)),
    errorContract: Object.fromEntries(Object.values(adapterErrorCodes).map((code) => [
      code,
      adapterErrorResponse(new AdapterError(code))
    ]))
  });
});

app.patch('/settings/system', requireAuth, requireAdmin, async (req, res) => {
  const data = {};

  for (const key of Object.keys(systemSettingSeeds)) {
    if (typeof req.body[key] === 'string') {
      const value = optionalString(req.body, key, key, 80).trim();
      if (value) {
        data[key] = value;
      }
    }
  }

  if (!Object.keys(data).length) {
    return sendError(res, 400, 'At least one system setting is required.');
  }

  await Promise.all(Object.entries(data).map(([key, value]) => prisma.systemSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value }
  })));
  await logActivity('settings.system_updated', req.user.id, { keys: Object.keys(data) });
  res.json({ system: await systemSettings() });
});

app.patch('/settings/preferences', requireAuth, async (req, res) => {
  const data = {};

  if (typeof req.body.startPage === 'string') {
    if (!startPages.includes(req.body.startPage)) {
      return sendError(res, 400, 'Choose a supported start page.');
    }
    data.startPage = req.body.startPage;
  }
  if (Object.hasOwn(req.body, 'compactMode')) {
    data.compactMode = booleanValue(req.body, 'compactMode', 'Compact mode');
  }
  if (typeof req.body.dateFormat === 'string') {
    if (!dateFormats.includes(req.body.dateFormat)) {
      return sendError(res, 400, 'Choose a supported date format.');
    }
    data.dateFormat = req.body.dateFormat;
  }

  if (!Object.keys(data).length) {
    return sendError(res, 400, 'At least one preference is required.');
  }

  const preferences = await prisma.userPreference.upsert({
    where: { userId: req.user.id },
    create: { userId: req.user.id, ...data },
    update: data
  });
  await logActivity('settings.preferences_updated', req.user.id, { keys: Object.keys(data) });
  res.json({ preferences });
});

app.patch('/settings/integrations/:key', requireAuth, requireAdmin, async (req, res) => {
  const integration = await prisma.integrationSetting.findUnique({ where: { key: req.params.key } });

  if (!integration) {
    return sendError(res, 404, 'Integration not found.');
  }

  const data = {};
  if (Object.hasOwn(req.body, 'isEnabled')) {
    data.isEnabled = booleanValue(req.body, 'isEnabled', 'Integration enabled');
  }
  if (req.body.config && typeof req.body.config === 'object' && !Array.isArray(req.body.config)) {
    data.config = req.body.config;
  } else if (Object.hasOwn(req.body, 'config') && req.body.config !== undefined && req.body.config !== null) {
    return sendError(res, 400, 'Integration config must be an object.');
  }
  if (!Object.keys(data).length) {
    return sendError(res, 400, 'At least one integration setting is required.');
  }

  const updated = await prisma.integrationSetting.update({ where: { key: integration.key }, data });
  await logActivity('settings.integration_updated', req.user.id, {
    key: integration.key,
    label: integration.label,
    isEnabled: updated.isEnabled
  });
  res.json({ integration: serializeIntegration(updated, true) });
});

app.get('/activity', requireAuth, requireModule('activity'), async (req, res) => {
  const pagination = paginationParams(req.query, { limit: 80, maxLimit: 200 });
  const [viewer, activity] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.user.id } }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min((pagination.skip + pagination.take) * 3, 1000),
      include: { user: true }
    })
  ]);

  if (!viewer) {
    return sendError(res, 401, 'User not found.');
  }

  const visibleItems = activity.filter((item) => canViewActivity(item, viewer));
  const pageItems = visibleItems.slice(pagination.skip, pagination.skip + pagination.take);
  const meta = paginationMeta({
    ...pagination,
    total: visibleItems.length,
    returned: pageItems.length
  });
  setPaginationHeaders(res, meta);
  res.json(pageItems.map(serializeActivity));
});

app.get('/profile', requireAuth, async (req, res) => {
  const [profileUser, notes, sharedNotes, tasks, sharedTasks, bookmarks, sharedBookmarks] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.user.id } }),
    prisma.note.count({ where: { ownerId: req.user.id } }),
    prisma.note.count({
      where: {
        ...accessibleNoteWhere(req.user),
        ownerId: { not: req.user.id }
      }
    }),
    prisma.task.count({ where: { ownerId: req.user.id, status: { not: 'DONE' } } }),
    prisma.task.count({
      where: {
        ...accessibleTaskWhere(req.user),
        ownerId: { not: req.user.id },
        status: { not: 'DONE' }
      }
    }),
    prisma.bookmark.count({ where: { ownerId: req.user.id } }),
    prisma.bookmark.count({
      where: {
        ...accessibleBookmarkWhere(req.user),
        ownerId: { not: req.user.id }
      }
    })
  ]);

  if (!profileUser) {
    return sendError(res, 404, 'User not found.');
  }

  res.json({
    user: publicUser(profileUser),
    own: {
      notes,
      sharedNotes,
      activeTasks: tasks,
      sharedTasks,
      bookmarks,
      sharedBookmarks
    },
    visible: {
      sharedTotal: sharedNotes + sharedTasks + sharedBookmarks
    }
  });
});

app.get('/notifications', requireAuth, async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 80
  });
  const unreadCount = await prisma.notification.count({
    where: { userId: req.user.id, isRead: false }
  });

  res.json({ notifications, unreadCount });
});

app.patch('/notifications/read-all', requireAuth, async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, isRead: false },
    data: { isRead: true }
  });
  res.status(204).end();
});

app.patch('/notifications/:id/read', requireAuth, async (req, res) => {
  const notification = await prisma.notification.findFirst({
    where: { id: req.params.id, userId: req.user.id }
  });

  if (!notification) {
    return sendError(res, 404, 'Notification not found.');
  }

  const updated = await prisma.notification.update({
    where: { id: notification.id },
    data: { isRead: true }
  });
  res.json(updated);
});

app.get('/chat/users', requireAuth, requireModule('chat'), requireCapability('canUseChat'), async (req, res) => {
  const users = await prisma.user.findMany({
    where: { id: { not: req.user.id } },
    orderBy: { displayName: 'asc' }
  });

  res.json(users.filter((user) => permissionsFor(user).canUseChat).map(publicUser));
});

app.get('/chat/messages', requireAuth, requireModule('chat'), requireCapability('canUseChat'), async (req, res) => {
  const recipientId = optionalString(req.query, 'recipientId', 'Recipient', 120).trim();
  const pagination = paginationParams(req.query, { limit: 120, maxLimit: 200 });
  const where = recipientId
    ? {
        OR: [
          { authorId: req.user.id, recipientId },
          { authorId: recipientId, recipientId: req.user.id }
        ]
      }
    : { recipientId: null };
  const [total, messages] = await Promise.all([
    prisma.chatMessage.count({ where }),
    prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
      include: { author: true }
    })
  ]);
  const meta = paginationMeta({
    ...pagination,
    total,
    returned: messages.length
  });
  setPaginationHeaders(res, meta);

  res.json(messages.reverse().map((message) => ({
    ...message,
    author: publicUser(message.author)
  })));
});

app.post('/chat/messages', requireAuth, requireModule('chat'), requireCapability('canUseChat'), async (req, res) => {
  const body = requiredString(req.body, 'body', 'Message', 1200);
  const recipientId = optionalString(req.body, 'recipientId', 'Recipient', 120).trim() || null;
  if (recipientId === req.user.id) {
    return sendError(res, 400, 'Choose another family member for a personal chat.');
  }
  const recipient = recipientId
    ? await prisma.user.findUnique({ where: { id: recipientId } })
    : null;
  if (recipientId && (!recipient || !permissionsFor(recipient).canUseChat)) {
    return sendError(res, 404, 'Chat recipient not found.');
  }

  const message = await prisma.chatMessage.create({
    data: { body, authorId: req.user.id, recipientId },
    include: { author: true }
  });
  const recipients = recipient ? [recipient] : await householdUsers(req.user.id, (user) => permissionsFor(user).canUseChat);
  await createNotifications(recipients, {
    type: 'CHAT',
    title: `New message from ${message.author.displayName}`,
    body: message.body.slice(0, 180),
    link: recipient ? `/chat?user=${message.authorId}` : '/chat',
    sourceId: message.id
  });
  await logActivity('chat.message_sent', req.user.id, {}, recipient ? 'PRIVATE' : 'SHARED');

  res.status(201).json({
    ...message,
    author: publicUser(message.author)
  });
});

app.delete('/chat/messages/:id', requireAuth, requireModule('chat'), requireCapability('canUseChat'), async (req, res) => {
  const message = await prisma.chatMessage.findFirst({
    where: {
      id: req.params.id,
      ...(req.user.role === 'ADMIN' ? {} : { authorId: req.user.id })
    }
  });

  if (!message) {
    return sendError(res, 404, 'Message not found.');
  }

  await prisma.chatMessage.delete({ where: { id: message.id } });
  await prisma.notification.deleteMany({
    where: { type: 'CHAT', sourceId: message.id }
  });
  res.status(204).end();
});

app.patch('/profile', requireAuth, async (req, res) => {
  const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });

  if (!currentUser) {
    return sendError(res, 401, 'User not found.');
  }

  const data = {};
  if (typeof req.body.displayName === 'string') {
    const displayName = optionalString(req.body, 'displayName', 'Display name', 120).trim();
    if (displayName) {
      data.displayName = displayName;
    }
  }
  if (typeof req.body.username === 'string') {
    data.username = usernameValue(req.body);
  }

  if (!Object.keys(data).length) {
    return sendError(res, 400, 'Display name or username is required.');
  }

  try {
    const updated = await prisma.user.update({ where: { id: currentUser.id }, data });
    await logActivity('user.profile_updated', currentUser.id, {
      username: updated.username,
      displayName: updated.displayName
    });
    res.json({ user: publicUser(updated) });
  } catch (err) {
    if (err.code === 'P2002') {
      return sendError(res, 409, 'Username is already taken.');
    }

    throw err;
  }
});

app.get('/users', requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(users.map(publicUser));
});

app.get('/roles/permissions', requireAuth, requireAdmin, async (_req, res) => {
  res.json(roleNames.map((role) => ({
    role,
    permissions: rolePermissionDefaults[role] || defaultPermissions
  })));
});

app.patch('/roles/:role/permissions', requireAuth, requireAdmin, async (req, res) => {
  const role = String(req.params.role || '').toUpperCase();

  if (!roleNames.includes(role)) {
    return sendError(res, 404, 'Role not found.');
  }

  const data = rolePermissionData(req.body);
  if (!Object.keys(data).length) {
    return sendError(res, 400, 'At least one permission value is required.');
  }

  const updated = await prisma.rolePermission.update({ where: { role }, data });
  await loadRolePermissionDefaults();
  await logActivity('role.permissions_updated', req.user.id, { role });
  res.json({ role: updated.role, permissions: rolePermissionDefaults[updated.role] });
});

app.get('/announcements', requireAuth, requireModule('announcements'), async (req, res) => {
  const viewer = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: Object.fromEntries(['id', 'role', ...permissionKeys].map((key) => [key, true]))
  });

  if (!viewer || !permissionsFor(viewer).canViewAnnouncements) {
    return sendError(res, 403, 'This account cannot view family announcements.');
  }

  const includeExpired = req.user.role === 'ADMIN' && req.query.includeExpired === 'true';
  const announcements = await prisma.announcement.findMany({
    where: includeExpired ? {} : activeAnnouncementWhere(),
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    include: { author: true }
  });

  res.json(announcements.map(serializeAnnouncement));
});

app.post('/announcements', requireAuth, requireModule('announcements'), requireAdmin, async (req, res) => {
  const cleanTitle = requiredString(req.body, 'title', 'Title', 160);
  const cleanBody = requiredString(req.body, 'body', 'Message', 2000);
  const cleanExpiresAt = optionalDateValue(req.body, 'expiresAt', 'Announcement expiry date') ?? null;
  const isPinned = booleanValue(req.body, 'isPinned', 'Pinned', false);

  const announcement = await prisma.announcement.create({
    data: {
      title: cleanTitle,
      body: cleanBody,
      isPinned,
      expiresAt: cleanExpiresAt,
      authorId: req.user.id
    }
  });

  await logActivity('announcement.created', req.user.id, { announcementId: announcement.id, title: announcement.title }, 'SHARED');
  const recipients = await householdUsers(req.user.id, (user) => permissionsFor(user).canViewAnnouncements);
  await createNotifications(recipients, {
    type: 'ANNOUNCEMENT',
    title: announcement.title,
    body: announcement.body.slice(0, 180),
    link: '/dashboard#announcements'
  });
  res.status(201).json(announcement);
});

app.patch('/announcements/:id', requireAuth, requireModule('announcements'), requireAdmin, async (req, res) => {
  const announcement = await prisma.announcement.findUnique({ where: { id: req.params.id } });

  if (!announcement) {
    return sendError(res, 404, 'Announcement not found.');
  }

  const data = {};
  if (typeof req.body.title === 'string') {
    const title = optionalString(req.body, 'title', 'Title', 160).trim();
    if (title) {
      data.title = title;
    }
  }
  if (typeof req.body.body === 'string') {
    const body = optionalString(req.body, 'body', 'Message', 2000).trim();
    if (body) {
      data.body = body;
    }
  }
  if (Object.hasOwn(req.body, 'isPinned')) {
    data.isPinned = booleanValue(req.body, 'isPinned', 'Pinned');
  }
  if (Object.hasOwn(req.body, 'expiresAt')) {
    data.expiresAt = optionalDateValue(req.body, 'expiresAt', 'Announcement expiry date');
  }

  const updated = await prisma.announcement.update({ where: { id: announcement.id }, data });
  await logActivity('announcement.updated', req.user.id, { announcementId: updated.id, title: updated.title }, 'SHARED');
  res.json(updated);
});

app.delete('/announcements/:id', requireAuth, requireModule('announcements'), requireAdmin, async (req, res) => {
  const announcement = await prisma.announcement.findUnique({ where: { id: req.params.id } });

  if (!announcement) {
    return sendError(res, 404, 'Announcement not found.');
  }

  await prisma.announcement.delete({ where: { id: announcement.id } });
  await logActivity('announcement.deleted', req.user.id, { announcementId: announcement.id, title: announcement.title }, 'SHARED');
  res.status(204).end();
});

app.post('/users', requireAuth, requireAdmin, async (req, res) => {
  const cleanUsername = usernameValue(req.body);
  const cleanDisplayName = requiredString(req.body, 'displayName', 'Display name', 120);
  const password = passwordValue(req.body, 'password', 'Temporary password');
  const cleanRole = enumValue(req.body.role, roleNames, 'Role', 'FAMILY');

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        username: cleanUsername,
        displayName: cleanDisplayName,
        passwordHash,
        role: cleanRole,
        ...permissionData(req.body)
      }
    });
    await logActivity('user.created', req.user.id, {
      createdUserId: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role
    });
    res.status(201).json(publicUser(user));
  } catch (err) {
    if (err.code === 'P2002') {
      return sendError(res, 409, 'Username is already taken.');
    }

    throw err;
  }
});

app.patch('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });

  if (!target) {
    return sendError(res, 404, 'User not found.');
  }

  const data = {};
  if (typeof req.body.displayName === 'string') {
    const displayName = optionalString(req.body, 'displayName', 'Display name', 120).trim();
    if (displayName) {
      data.displayName = displayName;
    }
  }
  if (typeof req.body.username === 'string') {
    data.username = usernameValue(req.body);
  }
  if (typeof req.body.role === 'string') {
    const role = enumValue(req.body.role, roleNames, 'Role');
    if (target.id === req.user.id && role !== 'ADMIN') {
      return sendError(res, 400, 'You cannot remove your own admin role.');
    }
    if (await wouldRemoveLastAdmin(target, role)) {
      return sendError(res, 400, 'At least one admin account is required.');
    }
    data.role = role;
  }

  if (!Object.keys(data).length) {
    return sendError(res, 400, 'Nothing to update.');
  }

  try {
    const updated = await prisma.user.update({ where: { id: target.id }, data });
    await logActivity('user.updated', req.user.id, {
      updatedUserId: updated.id,
      username: updated.username,
      displayName: updated.displayName,
      role: updated.role
    });
    res.json(publicUser(updated));
  } catch (err) {
    if (err.code === 'P2002') {
      return sendError(res, 409, 'Username is already taken.');
    }

    throw err;
  }
});

app.post('/users/:id/password', requireAuth, requireAdmin, async (req, res) => {
  const password = passwordValue(req.body, 'password', 'Temporary password');

  const target = await prisma.user.findUnique({ where: { id: req.params.id } });

  if (!target) {
    return sendError(res, 404, 'User not found.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: target.id }, data: { passwordHash } });
  await logActivity('user.password_reset', req.user.id, {
    updatedUserId: target.id,
    username: target.username,
    displayName: target.displayName
  });
  res.status(204).end();
});

app.patch('/users/:id/permissions', requireAuth, requireAdmin, async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });

  if (!target) {
    return sendError(res, 404, 'User not found.');
  }

  const data = permissionData(req.body);
  if (!Object.keys(data).length) {
    return sendError(res, 400, 'At least one permission value is required.');
  }

  const updated = await prisma.user.update({ where: { id: target.id }, data });
  await logActivity('user.permissions_updated', req.user.id, {
    updatedUserId: updated.id,
    username: updated.username,
    displayName: updated.displayName,
    changedPermissions: Object.keys(data)
  });
  res.json(publicUser(updated));
});

app.get('/tags', requireAuth, requireModule('tags'), async (req, res) => {
  const tags = await prisma.tag.findMany({
    where: accessibleTagWhere(req.user),
    orderBy: { name: 'asc' },
    include: { owner: true }
  });

  res.json(tags.map((tag) => ({
    ...serializeTag(tag, req.user),
    owner: publicUser(tag.owner)
  })));
});

app.post('/tags', requireAuth, requireModule('tags'), requireCapability('canCreateTags'), async (req, res) => {
  const name = requiredString(req.body, 'name', 'Tag name', 60);
  const color = optionalString(req.body, 'color', 'Tag color', 24, '#7c3aed').trim() || '#7c3aed';

  try {
    const tag = await prisma.tag.create({
      data: {
        name,
        color,
        isShared: booleanValue(req.body, 'isShared', 'Shared tag', false),
        ownerId: req.user.id
      }
    });
    await logActivity('tag.created', req.user.id, { tagId: tag.id, name: tag.name }, tag.isShared ? 'SHARED' : 'PRIVATE');
    res.status(201).json(serializeTag(tag, req.user));
  } catch (err) {
    if (err.code === 'P2002') {
      return sendError(res, 409, 'A tag with that name already exists.');
    }

    throw err;
  }
});

app.patch('/tags/:id', requireAuth, requireModule('tags'), async (req, res) => {
  const tag = await prisma.tag.findFirst({
    where: { id: req.params.id, ...ownedContentWhere(req.user) }
  });

  if (!tag) {
    return sendError(res, 404, 'Tag not found.');
  }

  const data = {};
  if (typeof req.body.name === 'string') {
    const name = optionalString(req.body, 'name', 'Tag name', 60).trim();
    if (name) {
      data.name = name;
    }
  }
  if (typeof req.body.color === 'string') {
    data.color = optionalString(req.body, 'color', 'Tag color', 24).trim();
  }
  if (Object.hasOwn(req.body, 'isShared')) {
    data.isShared = booleanValue(req.body, 'isShared', 'Shared tag');
  }

  try {
    const updated = await prisma.tag.update({ where: { id: tag.id }, data });
    await logActivity('tag.updated', req.user.id, { tagId: updated.id, name: updated.name }, updated.isShared ? 'SHARED' : 'PRIVATE');
    res.json(serializeTag(updated, req.user));
  } catch (err) {
    if (err.code === 'P2002') {
      return sendError(res, 409, 'A tag with that name already exists.');
    }

    throw err;
  }
});

app.delete('/tags/:id', requireAuth, requireModule('tags'), async (req, res) => {
  const tag = await prisma.tag.findFirst({
    where: { id: req.params.id, ...ownedContentWhere(req.user) }
  });

  if (!tag) {
    return sendError(res, 404, 'Tag not found.');
  }

  await prisma.tag.delete({ where: { id: tag.id } });
  await logActivity('tag.deleted', req.user.id, { tagId: tag.id, name: tag.name }, tag.isShared ? 'SHARED' : 'PRIVATE');
  res.status(204).end();
});

app.get('/bookmarks', requireAuth, requireModule('bookmarks'), async (req, res) => {
  const bookmarks = await prisma.bookmark.findMany({
    where: accessibleBookmarkWhere(req.user),
    orderBy: { updatedAt: 'desc' },
    include: { owner: true, tags: true }
  });

  res.json(bookmarks.map((item) => ({
    ...item,
    canEdit: canEditContent(item, req.user),
    owner: publicUser(item.owner)
  })));
});

app.post('/bookmarks', requireAuth, requireModule('bookmarks'), requireCapability('canCreateBookmarks'), async (req, res) => {
  const title = requiredString(req.body, 'title', 'Title', 160);
  const url = cleanUrl(req.body.url);

  if (!url) {
    return sendError(res, 400, 'URL is required.');
  }

  const bookmark = await prisma.bookmark.create({
    data: {
      title,
      url,
      notes: optionalString(req.body, 'notes', 'Notes', 2000),
      isShared: booleanValue(req.body, 'isShared', 'Shared bookmark', false),
      ownerId: req.user.id,
      tags: await editableTagConnections(req.body.tagIds, req.user, 'connect')
    }
  });
  await logActivity('bookmark.created', req.user.id, { bookmarkId: bookmark.id, title: bookmark.title }, bookmark.isShared ? 'SHARED' : 'PRIVATE');
  res.status(201).json(bookmark);
});

app.patch('/bookmarks/:id', requireAuth, requireModule('bookmarks'), async (req, res) => {
  const bookmark = await prisma.bookmark.findFirst({
    where: { id: req.params.id, ...ownedContentWhere(req.user) }
  });

  if (!bookmark) {
    return sendError(res, 404, 'Bookmark not found.');
  }

  const data = {};
  if (typeof req.body.title === 'string') {
    const title = optionalString(req.body, 'title', 'Title', 160).trim();
    if (title) {
      data.title = title;
    }
  }
  if (Object.hasOwn(req.body, 'url')) {
    const url = cleanUrl(req.body.url);
    if (!url) {
      return sendError(res, 400, 'URL is required.');
    }
    data.url = url;
  }
  if (typeof req.body.notes === 'string') {
    data.notes = optionalString(req.body, 'notes', 'Notes', 2000);
  }
  if (Object.hasOwn(req.body, 'isShared')) {
    data.isShared = booleanValue(req.body, 'isShared', 'Shared bookmark');
  }
  const tags = await editableTagConnections(req.body.tagIds, req.user);
  if (tags) {
    data.tags = tags;
  }

  const updated = await prisma.bookmark.update({ where: { id: bookmark.id }, data });
  await logActivity('bookmark.updated', req.user.id, { bookmarkId: updated.id, title: updated.title }, updated.isShared ? 'SHARED' : 'PRIVATE');
  res.json(updated);
});

app.delete('/bookmarks/:id', requireAuth, requireModule('bookmarks'), async (req, res) => {
  const bookmark = await prisma.bookmark.findFirst({
    where: { id: req.params.id, ...ownedContentWhere(req.user) }
  });

  if (!bookmark) {
    return sendError(res, 404, 'Bookmark not found.');
  }

  await prisma.bookmark.delete({ where: { id: bookmark.id } });
  await logActivity('bookmark.deleted', req.user.id, { bookmarkId: bookmark.id, title: bookmark.title }, bookmark.isShared ? 'SHARED' : 'PRIVATE');
  res.status(204).end();
});

app.get('/search', requireAuth, requireModule('search'), async (req, res) => {
  const query = searchQueryValue(req.query.q);
  const pagination = paginationParams(req.query, { limit: 12, maxLimit: 50 });
  const viewer = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: Object.fromEntries(['id', 'role', ...permissionKeys].map((key) => [key, true]))
  });
  const adapterSources = moduleRegistry
    .filter((module) => ['storage', 'photos', 'media'].includes(module.key))
    .map((module) => {
      const serialized = serializeModule(module);
      return {
        key: serialized.key,
        label: serialized.label,
        isEnabled: serialized.isEnabled,
        healthState: serialized.healthState
      };
    });

  if (!query) {
    return res.json({
      query,
      notes: [],
      tasks: [],
      bookmarks: [],
      announcements: [],
      tags: [],
      adapterResults: [],
      adapterSources,
      pagination: paginationMeta({ ...pagination, total: 0, returned: 0 })
    });
  }

  const noteMatch = {
    OR: [
      { title: { contains: query, mode: 'insensitive' } },
      { body: { contains: query, mode: 'insensitive' } },
      { tags: { some: { name: { contains: query, mode: 'insensitive' } } } }
    ]
  };
  const taskMatch = {
    OR: [
      { title: { contains: query, mode: 'insensitive' } },
      { details: { contains: query, mode: 'insensitive' } },
      { priority: { contains: query, mode: 'insensitive' } },
      { status: { contains: query, mode: 'insensitive' } },
      { tags: { some: { name: { contains: query, mode: 'insensitive' } } } }
    ]
  };
  const bookmarkMatch = {
    OR: [
      { title: { contains: query, mode: 'insensitive' } },
      { url: { contains: query, mode: 'insensitive' } },
      { notes: { contains: query, mode: 'insensitive' } },
      { tags: { some: { name: { contains: query, mode: 'insensitive' } } } }
    ]
  };
  const announcementMatch = {
    OR: [
      { title: { contains: query, mode: 'insensitive' } },
      { body: { contains: query, mode: 'insensitive' } }
    ]
  };
  const tagMatch = {
    name: { contains: query, mode: 'insensitive' }
  };
  const canSearchAnnouncements = Boolean(
    viewer
    && permissionsFor(viewer).canViewAnnouncements
    && isModuleEnabled('announcements')
  );

  const [notes, tasks, bookmarks, announcements, tags, adapterResults] = await Promise.all([
    isModuleEnabled('notes') ? prisma.note.findMany({
      where: { AND: [accessibleNoteWhere(req.user), noteMatch] },
      orderBy: { updatedAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
      include: { owner: true, tags: true }
    }) : [],
    isModuleEnabled('tasks') ? prisma.task.findMany({
      where: { AND: [accessibleTaskWhere(req.user), taskMatch] },
      orderBy: [{ status: 'asc' }, { dueAt: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
      include: { owner: true, tags: true }
    }) : [],
    isModuleEnabled('bookmarks') ? prisma.bookmark.findMany({
      where: { AND: [accessibleBookmarkWhere(req.user), bookmarkMatch] },
      orderBy: { updatedAt: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
      include: { owner: true, tags: true }
    }) : [],
    canSearchAnnouncements ? prisma.announcement.findMany({
      where: { AND: [activeAnnouncementWhere(), announcementMatch] },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
      include: { author: true }
    }) : [],
    isModuleEnabled('tags') ? prisma.tag.findMany({
      where: { AND: [accessibleTagWhere(req.user), tagMatch] },
      orderBy: { name: 'asc' },
      skip: pagination.skip,
      take: pagination.take,
      include: { owner: true }
    }) : [],
    isModuleEnabled('storage') ? localAdapterSearchResults(query, req.user, pagination) : []
  ]);
  const returned = notes.length + tasks.length + bookmarks.length + announcements.length + tags.length + adapterResults.length;

  res.json({
    query,
    notes: notes.map((item) => ({
      ...item,
      canEdit: canEditContent(item, req.user),
      owner: publicUser(item.owner)
    })),
    tasks: tasks.map((item) => ({
      ...item,
      canEdit: canEditContent(item, req.user),
      owner: publicUser(item.owner)
    })),
    bookmarks: bookmarks.map((item) => ({
      ...item,
      canEdit: canEditContent(item, req.user),
      owner: publicUser(item.owner)
    })),
    announcements: announcements.map(serializeAnnouncement),
    tags: tags.map((item) => ({
      ...serializeTag(item, req.user),
      owner: publicUser(item.owner)
    })),
    adapterResults,
    adapterSources,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      returned
    }
  });
});

async function localAdapterSearchResults(query, user, pagination = { skip: 0, take: 12 }) {
  const metadataRows = await prisma.adapterFileMetadata.findMany({
    where: {
      adapterKey: 'local-storage',
      AND: [
        user.role === 'ADMIN' ? {} : { OR: [{ ownerId: user.id }, { isShared: true }] },
        {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { path: { contains: query, mode: 'insensitive' } },
            { tags: { some: { name: { contains: query, mode: 'insensitive' } } } }
          ]
        }
      ]
    },
    orderBy: { updatedAt: 'desc' },
    skip: pagination.skip,
    take: pagination.take,
    include: { owner: true, tags: true }
  });

  const liveItems = await localStorageAdapter.search(query);
  const byPath = new Map();

  for (const item of liveItems.filter((entry) => entry.type === 'file')) {
    byPath.set(item.path, item);
  }

  for (const row of metadataRows) {
    if (!byPath.has(row.path)) {
      try {
        byPath.set(row.path, await localStorageAdapter.itemFromPath(localStorageAdapter.resolvePath(row.path)));
      } catch {
        // Skip metadata rows for files that no longer exist in the adapter.
      }
    }
  }

  const metadataByPath = new Map(metadataRows.map((item) => [item.path, item]));
  const enriched = await enrichAdapterItems([...byPath.values()].slice(pagination.skip, pagination.skip + pagination.take), user, 'local-storage');
  return enriched.map((item) => ({
    id: item.id,
    sourceKey: 'storage',
    name: item.name,
    title: item.name,
    path: item.path,
    tags: (metadataByPath.get(item.path) ? serializeAdapterMetadata(metadataByPath.get(item.path), user) : item.metadata.app).tags,
    meta: `${formatBytes(item.size)} / ${item.metadata.displayPath}`,
    summary: (metadataByPath.get(item.path) || item.metadata.app).isShared
      ? 'Shared file in Local Storage.'
      : item.metadata.app.isImportant ? 'Important file in Local Storage.' : 'File in Local Storage.',
    href: '/files'
  }));
}

async function sharedLocalAdapterFiles(user) {
  const rows = await prisma.adapterFileMetadata.findMany({
    where: {
      adapterKey: localStorageAdapter.key,
      ...(user.role === 'ADMIN'
        ? { OR: [{ isShared: true }, { userShares: { some: {} } }] }
        : {
            ownerId: { not: user.id },
            OR: [
              { isShared: true },
              { userShares: { some: { userId: user.id } } }
            ]
          })
    },
    orderBy: { updatedAt: 'desc' },
    take: 80,
    include: { owner: true, tags: true, userShares: { include: { user: true } }, publicLinks: { where: { isRevoked: false }, orderBy: { createdAt: 'desc' } } }
  });

  const files = [];
  for (const row of rows) {
    try {
      const item = await localStorageAdapter.itemFromPath(localStorageAdapter.resolvePath(row.path));
      if (item.type === 'file') {
        files.push({
          ...item,
          metadata: {
            ...item.metadata,
            app: serializeAdapterMetadata(row, user)
          }
        });
      }
    } catch {
      // Hide shared metadata for files no longer present in the adapter.
    }
  }

  return files;
}

function sendAdapterError(res, error, req = null) {
  if (error instanceof ValidationError) {
    return sendError(res, error.status, error.message, error.code);
  }

  const response = adapterErrorResponse(error);
  const status = response.code === adapterErrorCodes.NOT_FOUND ? 404
    : response.code === adapterErrorCodes.CONFLICT ? 409
      : response.code === adapterErrorCodes.PERMISSION_DENIED ? 403
        : response.code === adapterErrorCodes.INVALID_PATH ? 400
          : 500;

  if (req) {
    const event = req.method === 'POST' && req.originalUrl.includes('/files') ? 'upload.failed' : 'api.error';
    logAuditEvent(status >= 500 ? 'error' : 'warn', event, {
      ...requestAuditMetadata(req),
      userId: req.user?.id || 'unknown',
      method: req.method,
      path: req.originalUrl,
      status,
      code: response.code
    });
  }

  return sendError(res, status, response.message, response.code);
}

app.get('/file-portal/local', requireAuth, requireModule('storage'), async (req, res) => {
  try {
    const pagination = paginationParams(req.query, { limit: 80, maxLimit: 200 });
    const currentPath = adapterPathValue(req.query.path, 'Folder path');
    const query = searchQueryValue(req.query.q);
    const [listing, health] = await Promise.all([
      localStorageAdapter.list(currentPath, query),
      localStorageAdapter.health()
    ]);
    const [allFolders, allFiles] = await Promise.all([
      enrichAdapterItems(listing.folders, req.user, localStorageAdapter.key),
      enrichAdapterItems(listing.files, req.user, localStorageAdapter.key)
    ]);
    const allItems = [...allFolders, ...allFiles];
    const pageItems = allItems.slice(pagination.skip, pagination.skip + pagination.take);
    const folders = pageItems.filter((item) => item.type === 'folder');
    const files = pageItems.filter((item) => item.type === 'file');

    res.json({
      adapter: {
        key: localStorageAdapter.key,
        label: 'Local Storage',
        health,
        capabilities: localStorageAdapter.capabilities()
      },
      ...listing,
      folders,
      files,
      pagination: paginationMeta({
        ...pagination,
        total: allItems.length,
        returned: pageItems.length
      })
    });
  } catch (err) {
    return sendAdapterError(res, err, req);
  }
});

app.post('/file-portal/local/folders', requireAuth, requireModule('storage'), async (req, res) => {
  try {
    const folderPath = adapterPathValue(req.body.path, 'Folder path');
    const name = requiredString(req.body, 'name', 'Folder name', 160);
    const folder = await localStorageAdapter.createFolder(folderPath, name);
    await logActivity('file_portal.folder_created', req.user.id, { name: folder.name }, 'PRIVATE');
    res.status(201).json(folder);
  } catch (err) {
    return sendAdapterError(res, err, req);
  }
});

app.post('/file-portal/local/files', requireAuth, requireModule('storage'), uploadRateLimiter, handlePortalFileUpload, async (req, res) => {
  try {
    validateUploadedFile(req.file);
    const uploadPath = adapterPathValue(req.body.path, 'Upload path');
    const file = await localStorageAdapter.upload(uploadPath, req.file);
    try {
      await upsertAdapterFileMetadata({
        adapterKey: localStorageAdapter.key,
        item: file,
        user: req.user,
        data: {}
      });
    } catch (err) {
      await localStorageAdapter.delete(file.path).catch(() => undefined);
      throw err;
    }
    await logActivity('file_portal.file_uploaded', req.user.id, { name: file.name }, 'PRIVATE');
    const [enrichedFile] = await enrichAdapterItems([file], req.user, localStorageAdapter.key);
    res.status(201).json(enrichedFile);
  } catch (err) {
    return sendAdapterError(res, err, req);
  }
});

app.patch('/file-portal/local/metadata', requireAuth, requireModule('storage'), async (req, res) => {
  try {
    const { item } = await requireLocalFileOwner(adapterPathValue(req.body.path, 'File path', { required: true }), req.user);

    const metadata = await upsertAdapterFileMetadata({
      adapterKey: localStorageAdapter.key,
      item,
      user: req.user,
      data: {
        isImportant: optionalBoolean(req.body, 'isImportant', 'Important file'),
        isShared: optionalBoolean(req.body, 'isShared', 'Shared file'),
        tagIds: req.body.tagIds
      }
    });

    await logActivity('file_portal.metadata_updated', req.user.id, {
      name: item.name,
      path: item.path,
      isShared: metadata.isShared
    }, metadata.isShared ? 'SHARED' : 'PRIVATE');
    res.json(serializeAdapterMetadata(metadata, req.user));
  } catch (err) {
    return sendAdapterError(res, err, req);
  }
});

app.patch('/file-portal/local/share-users', requireAuth, requireModule('storage'), async (req, res) => {
  try {
    const { item, metadata } = await ensureOwnedAdapterMetadata(adapterPathValue(req.body.path, 'File path', { required: true }), req.user);
    if (!Array.isArray(req.body.userIds)) {
      throw new ValidationError('Shared user IDs must be an array.');
    }
    if (req.body.userIds.length > 100) {
      throw new ValidationError('Shared user IDs must include 100 items or fewer.');
    }
    const userIds = [...new Set(req.body.userIds.map((id) => boundedString(id, 'Shared user ID', 120)))];
    const recipients = await prisma.user.findMany({
      where: {
        AND: [
          { id: { in: userIds } },
          { id: { not: req.user.id } }
        ]
      }
    });

    const updated = await prisma.adapterFileMetadata.update({
      where: { id: metadata.id },
      data: {
        name: item.name,
        size: item.size,
        userShares: {
          deleteMany: {},
          createMany: {
            data: recipients.map((user) => ({ userId: user.id }))
          }
        }
      },
      include: { owner: true, tags: true, userShares: { include: { user: true } }, publicLinks: { where: { isRevoked: false }, orderBy: { createdAt: 'desc' } } }
    });

    await createNotifications(recipients, {
      type: 'FILE_SHARE',
      title: `${req.user.displayName || 'Family'} shared a file`,
      body: item.name,
      link: '/files',
      sourceId: metadata.id
    });
    await logActivity('file_portal.user_share_updated', req.user.id, {
      name: item.name,
      path: item.path,
      users: recipients.map((user) => user.displayName)
    }, recipients.length ? 'SHARED' : 'PRIVATE');

    res.json(serializeAdapterMetadata(updated, req.user));
  } catch (err) {
    return sendAdapterError(res, err, req);
  }
});

app.post('/file-portal/local/public-links', requireAuth, requireModule('storage'), async (req, res) => {
  try {
    const { item, metadata } = await ensureOwnedAdapterMetadata(adapterPathValue(req.body.path, 'File path', { required: true }), req.user);
    const rawToken = randomToken(32);
    const days = Number(req.body.expiresInDays || publicShareTtlDays);
    if (!Number.isFinite(days) || days <= 0 || days > 30) {
      throw new ValidationError('Public link expiry must be between 1 and 30 days.');
    }
    const expiresAt = daysFromNow(Number.isFinite(days) && days > 0 ? Math.min(days, 30) : publicShareTtlDays);
    const link = await prisma.publicFileShareLink.create({
      data: {
        metadataId: metadata.id,
        tokenHash: tokenHash(rawToken),
        label: optionalString(req.body, 'label', 'Public link label', 80).trim(),
        expiresAt
      }
    });

    await logActivity('file_portal.public_link_created', req.user.id, {
      name: item.name,
      path: item.path,
      expiresAt
    }, 'PRIVATE');

    res.status(201).json({
      id: link.id,
      token: rawToken,
      url: `/api/public/file/${rawToken}`,
      label: link.label,
      expiresAt: link.expiresAt,
      isRevoked: link.isRevoked,
      downloadCount: link.downloadCount
    });
  } catch (err) {
    return sendAdapterError(res, err, req);
  }
});

app.delete('/file-portal/local/public-links/:id', requireAuth, requireModule('storage'), async (req, res) => {
  try {
    const link = await prisma.publicFileShareLink.findFirst({
      where: {
        id: req.params.id,
        metadata: {
          ownerId: req.user.id,
          adapterKey: localStorageAdapter.key
        }
      }
    });

    if (!link && req.user.role !== 'ADMIN') {
      return sendError(res, 404, 'Public link not found.');
    }

    const target = link || await prisma.publicFileShareLink.findUnique({ where: { id: req.params.id } });
    if (!target) {
      return sendError(res, 404, 'Public link not found.');
    }

    await prisma.publicFileShareLink.update({
      where: { id: target.id },
      data: { isRevoked: true }
    });
    await logActivity('file_portal.public_link_revoked', req.user.id, { linkId: target.id }, 'PRIVATE');
    res.status(204).end();
  } catch (err) {
    return sendAdapterError(res, err, req);
  }
});

app.get('/public/file/:token', async (req, res) => {
  try {
    const token = boundedString(req.params.token, 'Public file token', 200);
    const link = await prisma.publicFileShareLink.findFirst({
      where: {
        tokenHash: tokenHash(token),
        isRevoked: false,
        expiresAt: { gt: new Date() }
      },
      include: { metadata: true }
    });

    if (!link || link.metadata.adapterKey !== localStorageAdapter.key) {
      return sendError(res, 404, 'Public link not found or expired.');
    }

    const file = await localStorageAdapter.download(link.metadata.path);
    await prisma.publicFileShareLink.update({
      where: { id: link.id },
      data: { downloadCount: { increment: 1 } }
    });
    await logActivity('file_portal.public_file_downloaded', link.metadata.ownerId, {
      metadataId: link.metadata.id,
      path: link.metadata.path,
      linkId: link.id
    }, 'PRIVATE');
    res.setHeader('Content-Length', file.size);
    res.download(localStorageAdapter.resolvePath(link.metadata.path), file.name);
  } catch (err) {
    return sendAdapterError(res, err, req);
  }
});

app.get('/file-portal/shared', requireAuth, requireModule('storage'), async (req, res) => {
  try {
    const pagination = paginationParams(req.query, { limit: 80, maxLimit: 200 });
    const allFiles = await sharedLocalAdapterFiles(req.user);
    const files = allFiles.slice(pagination.skip, pagination.skip + pagination.take);
    res.json({
      adapter: {
        key: localStorageAdapter.key,
        label: 'Local Storage'
      },
      files,
      summary: {
        files: allFiles.length,
        visibleSize: allFiles.reduce((total, item) => total + (item.size || 0), 0)
      },
      pagination: paginationMeta({
        ...pagination,
        total: allFiles.length,
        returned: files.length
      })
    });
  } catch (err) {
    return sendAdapterError(res, err, req);
  }
});

app.get('/file-portal/share-users', requireAuth, requireModule('storage'), async (req, res) => {
  const users = await householdUsers(req.user.id);
  res.json(users.map(publicUser));
});

app.get('/file-portal/shared/download', requireAuth, requireModule('storage'), async (req, res) => {
  try {
    const metadata = await canAccessSharedMetadata(requiredString(req.query, 'id', 'Shared file ID', 120), req.user);

    if (!metadata) {
      throw new AdapterError(adapterErrorCodes.NOT_FOUND, 'Shared file not found.');
    }

    const file = await localStorageAdapter.download(metadata.path);
    await logActivity('file_portal.shared_file_downloaded', req.user.id, {
      metadataId: metadata.id,
      ownerId: metadata.ownerId,
      path: metadata.path,
      name: metadata.name
    }, 'PRIVATE');
    res.setHeader('Content-Length', file.size);
    res.download(localStorageAdapter.resolvePath(metadata.path), file.name);
  } catch (err) {
    return sendAdapterError(res, err, req);
  }
});

app.get('/file-portal/local/download', requireAuth, requireModule('storage'), async (req, res) => {
  try {
    const filePath = adapterPathValue(req.query.path, 'File path', { required: true });
    const { metadata } = await requireLocalFileRead(filePath, req.user);
    const file = await localStorageAdapter.download(filePath);
    if (metadata && metadata.ownerId !== req.user.id) {
      await logActivity('file_portal.shared_file_downloaded', req.user.id, {
        metadataId: metadata.id,
        ownerId: metadata.ownerId,
        path: metadata.path,
        name: metadata.name
      }, 'PRIVATE');
    }
    res.setHeader('Content-Length', file.size);
    res.download(localStorageAdapter.resolvePath(filePath), file.name);
  } catch (err) {
    return sendAdapterError(res, err, req);
  }
});

app.delete('/file-portal/local/items', requireAuth, requireModule('storage'), async (req, res) => {
  try {
    const itemPath = adapterPathValue(req.query.path || req.body.path, 'Item path', { required: true });
    const target = localStorageAdapter.resolvePath(itemPath);
    const item = await localStorageAdapter.itemFromPath(target);
    if (item.type === 'file') {
      await requireLocalFileOwner(itemPath, req.user);
    } else if (req.user.role !== 'ADMIN') {
      throw new AdapterError(adapterErrorCodes.PERMISSION_DENIED, 'Only admins can delete folders in the local adapter.');
    }
    await localStorageAdapter.delete(itemPath);
    await prisma.adapterFileMetadata.deleteMany({
      where: {
        adapterKey: localStorageAdapter.key,
        OR: [
          { path: String(itemPath || '') },
          { path: { startsWith: `${String(itemPath || '').replace(/\/+$/, '')}/` } }
        ]
      }
    });
    await prisma.notification.deleteMany({
      where: { type: 'FILE_PORTAL', sourceId: String(itemPath || '') }
    });
    await logActivity('file_portal.item_deleted', req.user.id, { path: itemPath }, 'PRIVATE');
    res.status(204).end();
  } catch (err) {
    return sendAdapterError(res, err, req);
  }
});

app.use(['/reminders', '/files', '/storage', '/folders', '/documents', '/document-records'], requireAuth, (_req, res) => {
  sendError(res, 410, 'This legacy Equinox 1.x feature is disabled in Equinox 2.0.');
});

app.get('/notes', requireAuth, requireModule('notes'), async (req, res) => {
  const notes = await prisma.note.findMany({
    where: accessibleNoteWhere(req.user),
    orderBy: { updatedAt: 'desc' },
    include: { owner: true, tags: true }
  });
  res.json(notes.map((item) => ({
    ...item,
    canEdit: canEditContent(item, req.user),
    owner: publicUser(item.owner)
  })));
});

app.post('/notes', requireAuth, requireModule('notes'), requireCapability('canCreateNotes'), async (req, res) => {
  const cleanTitle = requiredString(req.body, 'title', 'Title', 160);
  const body = optionalString(req.body, 'body', 'Body', 10000);
  const isShared = booleanValue(req.body, 'isShared', 'Shared note', false);

  const note = await prisma.note.create({
    data: {
      title: cleanTitle,
      body,
      isShared,
      ownerId: req.user.id,
      tags: await editableTagConnections(req.body.tagIds, req.user, 'connect')
    }
  });
  await logActivity('note.created', req.user.id, { noteId: note.id, title: note.title }, note.isShared ? 'SHARED' : 'PRIVATE');
  res.status(201).json(note);
});

app.patch('/notes/:id', requireAuth, requireModule('notes'), async (req, res) => {
  const note = await prisma.note.findFirst({
    where: { id: req.params.id, ...ownedContentWhere(req.user) }
  });

  if (!note) {
    return sendError(res, 404, 'Note not found.');
  }

  const data = {};
  if (typeof req.body.title === 'string') {
    const title = optionalString(req.body, 'title', 'Title', 160).trim();
    if (title) {
      data.title = title;
    }
  }
  if (typeof req.body.body === 'string') {
    data.body = optionalString(req.body, 'body', 'Body', 10000);
  }
  if (Object.hasOwn(req.body, 'isShared')) {
    data.isShared = booleanValue(req.body, 'isShared', 'Shared note');
  }
  const tags = await editableTagConnections(req.body.tagIds, req.user);
  if (tags) {
    data.tags = tags;
  }

  const updated = await prisma.note.update({ where: { id: note.id }, data });
  await logActivity('note.updated', req.user.id, { noteId: updated.id, title: updated.title }, updated.isShared ? 'SHARED' : 'PRIVATE');
  res.json(updated);
});

app.delete('/notes/:id', requireAuth, requireModule('notes'), async (req, res) => {
  const note = await prisma.note.findFirst({
    where: { id: req.params.id, ...ownedContentWhere(req.user) }
  });

  if (!note) {
    return sendError(res, 404, 'Note not found.');
  }

  await prisma.note.delete({ where: { id: note.id } });
  await logActivity('note.deleted', req.user.id, { noteId: note.id, title: note.title }, note.isShared ? 'SHARED' : 'PRIVATE');
  res.status(204).end();
});

app.get('/reminders', requireAuth, async (req, res) => {
  const reminders = await prisma.reminder.findMany({
    where: accessibleReminderWhere(req.user),
    orderBy: [{ isCompleted: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
    include: { owner: true }
  });
  res.json(reminders.map((item) => ({
    ...item,
    canEdit: canEditContent(item, req.user),
    owner: publicUser(item.owner)
  })));
});

app.post('/reminders', requireAuth, requireCapability('canCreateReminders'), async (req, res) => {
  const { title, dueAt, isShared = false } = req.body;

  if (!title) {
    return sendError(res, 400, 'Title is required.');
  }

  const reminder = await prisma.reminder.create({
    data: {
      title,
      dueAt: dueAt ? new Date(dueAt) : null,
      isShared: Boolean(isShared),
      ownerId: req.user.id
    }
  });
  await logActivity('reminder.created', req.user.id, { reminderId: reminder.id, title: reminder.title }, reminder.isShared ? 'SHARED' : 'PRIVATE');
  res.status(201).json(reminder);
});

app.patch('/reminders/:id', requireAuth, async (req, res) => {
  const reminder = await prisma.reminder.findFirst({
    where: { id: req.params.id, ...ownedContentWhere(req.user) }
  });

  if (!reminder) {
    return sendError(res, 404, 'Reminder not found.');
  }

  const data = {};
  if (typeof req.body.title === 'string' && req.body.title.trim()) {
    data.title = req.body.title.trim();
  }
  if (Object.hasOwn(req.body, 'dueAt')) {
    data.dueAt = req.body.dueAt ? new Date(req.body.dueAt) : null;
  }
  if (typeof req.body.isCompleted === 'boolean') {
    data.isCompleted = req.body.isCompleted;
  }
  if (typeof req.body.isShared === 'boolean') {
    data.isShared = req.body.isShared;
  }

  const updated = await prisma.reminder.update({ where: { id: reminder.id }, data });
  await logActivity('reminder.updated', req.user.id, { reminderId: updated.id, title: updated.title }, updated.isShared ? 'SHARED' : 'PRIVATE');
  res.json(updated);
});

app.delete('/reminders/:id', requireAuth, async (req, res) => {
  const reminder = await prisma.reminder.findFirst({
    where: { id: req.params.id, ...ownedContentWhere(req.user) }
  });

  if (!reminder) {
    return sendError(res, 404, 'Reminder not found.');
  }

  await prisma.reminder.delete({ where: { id: reminder.id } });
  await logActivity('reminder.deleted', req.user.id, { reminderId: reminder.id, title: reminder.title }, reminder.isShared ? 'SHARED' : 'PRIVATE');
  res.status(204).end();
});

app.get('/tasks', requireAuth, requireModule('tasks'), async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: accessibleTaskWhere(req.user),
    orderBy: { updatedAt: 'desc' },
    include: { owner: true, tags: true }
  });
  res.json(tasks.sort(compareTasks).map((item) => ({
    ...item,
    canEdit: canEditContent(item, req.user),
    owner: publicUser(item.owner)
  })));
});

app.post('/tasks', requireAuth, requireModule('tasks'), requireCapability('canCreateTasks'), async (req, res) => {
  const cleanTitle = requiredString(req.body, 'title', 'Title', 160);
  const details = optionalString(req.body, 'details', 'Details', 4000);
  const cleanPriority = enumValue(req.body.priority, taskPriorities, 'Task priority', 'NORMAL');
  const cleanStatus = enumValue(req.body.status, taskStatuses, 'Task status', 'OPEN');
  const cleanDueAt = optionalDateValue(req.body, 'dueAt', 'Task due date') ?? null;
  const isShared = booleanValue(req.body, 'isShared', 'Shared task', false);

  const task = await prisma.task.create({
    data: {
      title: cleanTitle,
      details,
      priority: cleanPriority,
      status: cleanStatus,
      dueAt: cleanDueAt,
      isShared,
      ownerId: req.user.id,
      tags: await editableTagConnections(req.body.tagIds, req.user, 'connect')
    }
  });
  await logActivity('task.created', req.user.id, { taskId: task.id, title: task.title }, task.isShared ? 'SHARED' : 'PRIVATE');
  res.status(201).json(task);
});

app.patch('/tasks/:id', requireAuth, requireModule('tasks'), async (req, res) => {
  const task = await prisma.task.findFirst({
    where: { id: req.params.id, ...ownedContentWhere(req.user) }
  });

  if (!task) {
    return sendError(res, 404, 'Task not found.');
  }

  const data = {};
  if (typeof req.body.title === 'string') {
    const title = optionalString(req.body, 'title', 'Title', 160).trim();
    if (title) {
      data.title = title;
    }
  }
  if (typeof req.body.details === 'string') {
    data.details = optionalString(req.body, 'details', 'Details', 4000);
  }
  if (typeof req.body.priority === 'string') {
    data.priority = enumValue(req.body.priority, taskPriorities, 'Task priority');
  }
  if (typeof req.body.status === 'string') {
    data.status = enumValue(req.body.status, taskStatuses, 'Task status');
  }
  if (Object.hasOwn(req.body, 'dueAt')) {
    data.dueAt = optionalDateValue(req.body, 'dueAt', 'Task due date');
  }
  if (Object.hasOwn(req.body, 'isShared')) {
    data.isShared = booleanValue(req.body, 'isShared', 'Shared task');
  }
  const tags = await editableTagConnections(req.body.tagIds, req.user);
  if (tags) {
    data.tags = tags;
  }

  const updated = await prisma.task.update({ where: { id: task.id }, data });
  await logActivity('task.updated', req.user.id, { taskId: updated.id, title: updated.title }, updated.isShared ? 'SHARED' : 'PRIVATE');
  res.json(updated);
});

app.delete('/tasks/:id', requireAuth, requireModule('tasks'), async (req, res) => {
  const task = await prisma.task.findFirst({
    where: { id: req.params.id, ...ownedContentWhere(req.user) }
  });

  if (!task) {
    return sendError(res, 404, 'Task not found.');
  }

  await prisma.task.delete({ where: { id: task.id } });
  await logActivity('task.deleted', req.user.id, { taskId: task.id, title: task.title }, task.isShared ? 'SHARED' : 'PRIVATE');
  res.status(204).end();
});

app.get('/files', requireAuth, async (req, res) => {
  const files = await prisma.fileAsset.findMany({
    where: {
      ...await accessibleFileWhere(req.user),
      folderId: req.query.folderId || null
    },
    orderBy: { uploadedAt: 'desc' },
    include: { tags: true }
  });
  res.json(files);
});

app.get('/storage', requireAuth, async (req, res) => {
  const folderId = req.query.folderId || null;
  const search = String(req.query.q || '').trim();
  const folder = await getAccessibleFolder(folderId, req.user);
  const [folderWhere, fileWhere, inheritedSharedFolderIds] = await Promise.all([
    accessibleFolderWhere(req.user),
    accessibleFileWhere(req.user),
    sharedFolderTreeIds()
  ]);

  if (folderId && !folder && !search) {
    return sendError(res, 404, 'Folder not found.');
  }

  const [folders, files, storageUsage, allFiles, allFolders] = await Promise.all([
    prisma.folder.findMany({
      where: {
        ...folderWhere,
        ...(search
          ? { name: { contains: search, mode: 'insensitive' } }
          : { parentId: folderId })
      },
      orderBy: { name: 'asc' },
      include: { owner: true }
    }),
    prisma.fileAsset.findMany({
      where: {
        ...fileWhere,
        ...(search
          ? { originalName: { contains: search, mode: 'insensitive' } }
          : { folderId })
      },
      orderBy: { uploadedAt: 'desc' },
      include: { owner: true, folder: true, tags: true }
    }),
    prisma.fileAsset.aggregate({
      where: fileWhere,
      _sum: { size: true },
      _count: { id: true }
    }),
    prisma.fileAsset.findMany({
      where: fileWhere,
      select: { folderId: true, isShared: true, isImportant: true, ownerId: true, size: true }
    }),
    prisma.folder.count({ where: folderWhere })
  ]);

  res.json({
    currentFolder: search || !folder ? null : {
      ...folder,
      canEdit: canEditContent(folder, req.user),
      shareState: folderShareState(folder, inheritedSharedFolderIds)
    },
    breadcrumb: search ? [] : await storageBreadcrumb(folder, req.user),
    summary: {
      folders: allFolders,
      files: storageUsage._count.id,
      storageBytes: storageUsage._sum.size || 0,
      sharedFiles: allFiles.filter((item) => fileShareState(item, inheritedSharedFolderIds) !== 'private').length,
      privateFiles: allFiles.filter((item) => fileShareState(item, inheritedSharedFolderIds) === 'private').length,
      importantFiles: allFiles.filter((item) => item.isImportant).length,
      owners: Object.values(allFiles.reduce((owners, item) => {
        owners[item.ownerId] ||= { ownerId: item.ownerId, files: 0, storageBytes: 0 };
        owners[item.ownerId].files += 1;
        owners[item.ownerId].storageBytes += item.size;
        return owners;
      }, {}))
    },
    folders: folders.map((item) => ({
      ...item,
      canEdit: canEditContent(item, req.user),
      owner: publicUser(item.owner),
      shareState: folderShareState(item, inheritedSharedFolderIds)
    })),
    files: await Promise.all(files.map(async (item) => ({
      ...item,
      canEdit: canEditContent(item, req.user),
      owner: publicUser(item.owner),
      folderPath: await folderPath(item.folder),
      shareState: fileShareState(item, inheritedSharedFolderIds)
    })))
  });
});

app.get('/folders', requireAuth, async (req, res) => {
  const folders = await prisma.folder.findMany({
    where: ownedContentWhere(req.user),
    orderBy: { name: 'asc' },
    include: { owner: true, parent: true }
  });

  res.json(await Promise.all(folders.map(async (item) => ({
    ...item,
    owner: publicUser(item.owner),
    path: await folderPath(item)
  }))));
});

app.get('/documents', requireAuth, async (req, res) => {
  const [fileWhere, inheritedSharedFolderIds] = await Promise.all([
    accessibleFileWhere(req.user),
    sharedFolderTreeIds()
  ]);

  const documents = await prisma.fileAsset.findMany({
    where: {
      ...fileWhere,
      isImportant: true
    },
    orderBy: { uploadedAt: 'desc' },
    include: { owner: true, folder: true, tags: true }
  });

  res.json(await Promise.all(documents.map(async (item) => ({
    ...item,
    canEdit: canEditContent(item, req.user),
    owner: publicUser(item.owner),
    folderPath: await folderPath(item.folder),
    shareState: fileShareState(item, inheritedSharedFolderIds)
  }))));
});

app.get('/document-records', requireAuth, async (req, res) => {
  const sharedFolderIds = await sharedFolderTreeIds();
  const records = await prisma.documentRecord.findMany({
    where: ownedContentWhere(req.user),
    orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
    include: { owner: true, file: { include: { owner: true, folder: true, tags: true } } }
  });

  res.json(await Promise.all(records.map((record) => serializeDocumentRecord(record, req.user, sharedFolderIds))));
});

app.post('/document-records', requireAuth, requireCapability('canCreateDocumentRecords'), async (req, res) => {
  const { title, category = 'GENERAL', status = 'OPEN', amount = null, notes = '', dueAt = null, fileId = null } = req.body;
  const cleanTitle = String(title || '').trim();

  if (!cleanTitle) {
    return sendError(res, 400, 'Title is required.');
  }

  if (fileId) {
    const file = await prisma.fileAsset.findFirst({
      where: { id: fileId, ...await accessibleFileWhere(req.user) }
    });

    if (!file) {
      return sendError(res, 404, 'Linked file not found.');
    }
  }

  const record = await prisma.documentRecord.create({
    data: {
      title: cleanTitle,
      category: String(category || 'GENERAL').trim() || 'GENERAL',
      status: String(status || 'OPEN').trim() || 'OPEN',
      amount: optionalAmount(amount),
      notes: String(notes || ''),
      dueAt: dueAt ? new Date(dueAt) : null,
      fileId: fileId || null,
      ownerId: req.user.id
    }
  });

  await logActivity('document_record.created', req.user.id, { recordId: record.id, title: record.title });
  res.status(201).json(record);
});

app.patch('/document-records/:id', requireAuth, async (req, res) => {
  const record = await prisma.documentRecord.findFirst({
    where: { id: req.params.id, ...ownedContentWhere(req.user) }
  });

  if (!record) {
    return sendError(res, 404, 'Document tracker item not found.');
  }

  const data = {};
  if (typeof req.body.title === 'string' && req.body.title.trim()) {
    data.title = req.body.title.trim();
  }
  if (typeof req.body.category === 'string') {
    data.category = req.body.category.trim() || 'GENERAL';
  }
  if (typeof req.body.status === 'string') {
    data.status = req.body.status.trim() || 'OPEN';
  }
  if (Object.hasOwn(req.body, 'amount')) {
    data.amount = optionalAmount(req.body.amount);
  }
  if (typeof req.body.notes === 'string') {
    data.notes = req.body.notes;
  }
  if (Object.hasOwn(req.body, 'dueAt')) {
    data.dueAt = req.body.dueAt ? new Date(req.body.dueAt) : null;
  }
  if (Object.hasOwn(req.body, 'fileId')) {
    if (req.body.fileId) {
      const file = await prisma.fileAsset.findFirst({
        where: { id: req.body.fileId, ...await accessibleFileWhere(req.user) }
      });

      if (!file) {
        return sendError(res, 404, 'Linked file not found.');
      }
    }
    data.fileId = req.body.fileId || null;
  }

  const updated = await prisma.documentRecord.update({ where: { id: record.id }, data });
  await logActivity('document_record.updated', req.user.id, { recordId: updated.id, title: updated.title });
  res.json(updated);
});

app.delete('/document-records/:id', requireAuth, async (req, res) => {
  const record = await prisma.documentRecord.findFirst({
    where: { id: req.params.id, ...ownedContentWhere(req.user) }
  });

  if (!record) {
    return sendError(res, 404, 'Document tracker item not found.');
  }

  await prisma.documentRecord.delete({ where: { id: record.id } });
  await logActivity('document_record.deleted', req.user.id, { recordId: record.id, title: record.title });
  res.status(204).end();
});

app.post('/folders', requireAuth, requireCapability('canCreateFolders'), async (req, res) => {
  const { name, parentId = null, isShared = false } = req.body;
  const cleanName = String(name || '').trim();

  if (!cleanName) {
    return sendError(res, 400, 'Folder name is required.');
  }

  if (parentId && !(await getEditableFolder(parentId, req.user))) {
    return sendError(res, 404, 'Parent folder not found.');
  }

  const folder = await prisma.folder.create({
    data: {
      name: cleanName,
      isShared: Boolean(isShared),
      parentId,
      ownerId: req.user.id
    }
  });

  await logActivity('folder.created', req.user.id, { folderId: folder.id, name: folder.name });
  res.status(201).json(folder);
});

app.patch('/folders/:id', requireAuth, async (req, res) => {
  const folder = await getEditableFolder(req.params.id, req.user);

  if (!folder) {
    return sendError(res, 404, 'Folder not found.');
  }

  const data = {};
  if (typeof req.body.name === 'string' && req.body.name.trim()) {
    data.name = req.body.name.trim();
  }
  if (typeof req.body.isShared === 'boolean') {
    data.isShared = req.body.isShared;
  }

  const updated = await prisma.folder.update({ where: { id: folder.id }, data });
  await logActivity('folder.updated', req.user.id, { folderId: updated.id, name: updated.name });
  res.json(updated);
});

app.delete('/folders/:id', requireAuth, async (req, res) => {
  const folder = await getEditableFolder(req.params.id, req.user);

  if (!folder) {
    return sendError(res, 404, 'Folder not found.');
  }

  const folderIds = await collectFolderIds(folder.id);
  const files = await prisma.fileAsset.findMany({
    where: {
      folderId: { in: folderIds },
      ...ownedContentWhere(req.user)
    }
  });

  await prisma.folder.delete({ where: { id: folder.id } });
  await Promise.all(files.map((file) => unlink(file.path).catch(() => undefined)));
  await logActivity('folder.deleted', req.user.id, { folderId: folder.id, name: folder.name });
  res.status(204).end();
});

app.post('/files', requireAuth, requireCapability('canUploadFiles'), uploadRateLimiter, handleLegacyFileUpload, async (req, res) => {
  try {
    validateUploadedFile(req.file);
  } catch (err) {
    if (req.file?.path) {
      await unlink(req.file.path).catch(() => undefined);
    }
    return sendAdapterError(res, err, req);
  }

  const folderId = req.body.folderId || null;

  if (folderId && !(await getEditableFolder(folderId, req.user))) {
    await unlink(req.file.path).catch(() => undefined);
    return sendError(res, 404, 'Folder not found.');
  }

  let asset;
  try {
    asset = await prisma.fileAsset.create({
      data: {
        originalName: req.file.originalname,
        storedName: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        isShared: req.body.isShared === 'true',
        folderId,
        ownerId: req.user.id
      }
    });
  } catch (err) {
    await unlink(req.file.path).catch(() => undefined);
    throw err;
  }
  await logActivity('file.uploaded', req.user.id, { fileId: asset.id });
  res.status(201).json(asset);
});

app.patch('/files/:id', requireAuth, async (req, res) => {
  const file = await prisma.fileAsset.findFirst({
    where: { id: req.params.id, ...ownedContentWhere(req.user) }
  });

  if (!file) {
    return sendError(res, 404, 'File not found.');
  }

  const data = {};
  if (typeof req.body.isShared === 'boolean') {
    data.isShared = req.body.isShared;
  }
  if (typeof req.body.isImportant === 'boolean') {
    data.isImportant = req.body.isImportant;
  }
  if (typeof req.body.originalName === 'string' && req.body.originalName.trim()) {
    data.originalName = req.body.originalName.trim();
  }
  if (Object.hasOwn(req.body, 'folderId')) {
    if (req.body.folderId && !(await getEditableFolder(req.body.folderId, req.user))) {
      return sendError(res, 404, 'Folder not found.');
    }
    data.folderId = req.body.folderId || null;
  }
  const tags = await editableTagConnections(req.body.tagIds, req.user);
  if (tags) {
    data.tags = tags;
  }

  const updated = await prisma.fileAsset.update({ where: { id: file.id }, data });
  await logActivity('file.updated', req.user.id, { fileId: updated.id, name: updated.originalName });
  res.json(updated);
});

app.get('/files/:id/download', requireAuth, async (req, res) => {
  const file = await prisma.fileAsset.findFirst({
    where: { id: req.params.id, ...await accessibleFileWhere(req.user) }
  });

  if (!file) {
    return sendError(res, 404, 'File not found.');
  }

  const storedPath = await resolveStoredFilePath(file);
  if (!storedPath) {
    return sendError(res, 404, 'Stored file is missing. Please upload it again.');
  }

  await logActivity('file.downloaded', req.user.id, { fileId: file.id });
  res.download(storedPath, file.originalName);
});

app.get('/files/:id/preview', requireAuth, async (req, res) => {
  const file = await prisma.fileAsset.findFirst({
    where: { id: req.params.id, ...await accessibleFileWhere(req.user) }
  });

  if (!file) {
    return sendError(res, 404, 'File not found.');
  }

  if (!previewType(file)) {
    return sendError(res, 415, 'Preview is not available for this file type.');
  }

  const storedPath = await resolveStoredFilePath(file);
  if (!storedPath) {
    return sendError(res, 404, 'Stored file is missing. Please upload it again.');
  }

  await logActivity('file.previewed', req.user.id, { fileId: file.id });
  res.setHeader('Content-Disposition', `inline; filename="${file.originalName.replace(/"/g, '')}"`);
  res.type(file.mimeType || 'application/octet-stream');
  res.sendFile(storedPath);
});

app.delete('/files/:id', requireAuth, async (req, res) => {
  const file = await prisma.fileAsset.findFirst({
    where: { id: req.params.id, ...ownedContentWhere(req.user) }
  });

  if (!file) {
    return sendError(res, 404, 'File not found.');
  }

  await prisma.fileAsset.delete({ where: { id: file.id } });
  const storedPath = await resolveStoredFilePath(file);
  if (storedPath) {
    await unlink(storedPath).catch(() => undefined);
  }
  await logActivity('file.deleted', req.user.id, { fileId: file.id, name: file.originalName });
  res.status(204).end();
});

app.use((err, req, res, _next) => {
  if (err instanceof ValidationError) {
    return sendError(res, err.status, err.message, err.code);
  }

  logAuditEvent('error', 'api.error', {
    ...requestAuditMetadata(req),
    userId: req.user?.id || 'unknown',
    method: req.method,
    path: req.originalUrl,
    status: 500,
    error: err.message
  });
  sendError(res, 500, 'Something went wrong.');
});

await ensureRolePermissions();
await ensureModuleSettings();
await ensureSettingsFoundation();

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Equinox API listening on http://localhost:${port}`);
  });
}

export { app, prisma };
