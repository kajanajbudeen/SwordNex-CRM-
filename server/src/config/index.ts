import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

/**
 * Helper to safely read configuration values from either environment variables
 * or secret files (Docker Secrets / Kubernetes Secrets).
 */
const readSecret = (envVar: string, fileVar: string, fallback: string = ''): string => {
  const filePath = process.env[fileVar];
  if (filePath && fs.existsSync(filePath)) {
    try {
      return fs.readFileSync(filePath, 'utf8').trim();
    } catch {
      // Fall through to environment variable
    }
  }
  return process.env[envVar] || fallback;
};

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  corsAllowedOrigins: process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
    : [],
  trustedProxy: process.env.TRUSTED_PROXY || 'loopback,linklocal,uniquelocal',
  databaseUrl: readSecret('DATABASE_URL', 'DATABASE_URL_FILE', 'postgresql://postgres:postgres@localhost:5432/swordnex_crm?schema=public'),

  jwt: {
    secret: readSecret('JWT_SECRET', 'JWT_SECRET_FILE', 'swordnex_jwt_secret_key_minimum_32_characters_for_prod'),
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    refreshSecret: readSecret('JWT_REFRESH_SECRET', 'JWT_REFRESH_SECRET_FILE', 'swordnex_jwt_refresh_secret_key_32_chars'),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: 'swordnex-ai-crm',
    audience: 'swordnex-api',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '1000', 10),
  },

  razorpay: {
    keyId: readSecret('RAZORPAY_KEY_ID', 'RAZORPAY_KEY_ID_FILE', ''),
    keySecret: readSecret('RAZORPAY_KEY_SECRET', 'RAZORPAY_KEY_SECRET_FILE', ''),
    webhookSecret: readSecret('RAZORPAY_WEBHOOK_SECRET', 'RAZORPAY_WEBHOOK_SECRET_FILE', ''),
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    user: readSecret('SMTP_USER', 'SMTP_USER_FILE', ''),
    pass: readSecret('SMTP_PASS', 'SMTP_PASS_FILE', '') || readSecret('SMTP_PASSWORD', 'SMTP_PASSWORD_FILE', ''),
    from: process.env.SMTP_FROM || 'SwordNex CRM <no-reply@swordnex.com>',
  },

  ai: {
    provider: process.env.AI_PROVIDER || 'mock',
    geminiApiKey: readSecret('GEMINI_API_KEY', 'GEMINI_API_KEY_FILE', ''),
    openAiApiKey: readSecret('OPENAI_API_KEY', 'OPENAI_API_KEY_FILE', ''),
    anthropicApiKey: readSecret('ANTHROPIC_API_KEY', 'ANTHROPIC_API_KEY_FILE', ''),
    defaultModel: process.env.DEFAULT_AI_MODEL || 'gemini-1.5-pro',
  },
};

// Ensure DATABASE_URL is available on process.env for Prisma runtime and CLI utilities
if (config.databaseUrl) {
  process.env.DATABASE_URL = config.databaseUrl;
}

/**
 * Validates configuration and fails fast if critical security parameters are missing or unsafe in production.
 */
export const validateConfig = (): { valid: boolean; errors: string[]; warnings: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProd = config.nodeEnv === 'production';

  const defaultSecret = 'swordnex_jwt_secret_key_minimum_32_characters_for_prod';
  const defaultRefresh = 'swordnex_jwt_refresh_secret_key_32_chars';

  if (isProd) {
    if (!config.jwt.secret || config.jwt.secret === defaultSecret) {
      errors.push('CRITICAL: JWT_SECRET must be set to a unique, non-default secret in production (minimum 32 characters).');
    } else if (config.jwt.secret.length < 32) {
      errors.push('CRITICAL: JWT_SECRET must be at least 32 characters in production for cryptographic strength.');
    }

    if (!config.jwt.refreshSecret || config.jwt.refreshSecret === defaultRefresh) {
      errors.push('CRITICAL: JWT_REFRESH_SECRET must be set to a unique, non-default secret in production (minimum 32 characters).');
    } else if (config.jwt.refreshSecret.length < 32) {
      errors.push('CRITICAL: JWT_REFRESH_SECRET must be at least 32 characters in production.');
    }

    if (config.jwt.secret && config.jwt.refreshSecret && config.jwt.secret === config.jwt.refreshSecret) {
      errors.push('CRITICAL: JWT_SECRET and JWT_REFRESH_SECRET must be independent, distinct keys.');
    }

    if (config.trustedProxy === 'true' || config.trustedProxy === '*') {
      warnings.push('WARNING: TRUSTED_PROXY is set too broadly. Recommend pinning to specific reverse proxy IP or "loopback,linklocal,uniquelocal".');
    }

    if (!config.databaseUrl || config.databaseUrl.includes('postgres:postgres@')) {
      warnings.push('WARNING: Default database credentials detected in DATABASE_URL.');
    }

    if (!config.razorpay.keySecret) {
      warnings.push('WARNING: RAZORPAY_KEY_SECRET is unconfigured. Payment settlements will reject live transactions.');
    }

    if (!config.smtp.host) {
      warnings.push('WARNING: SMTP_HOST is unconfigured. Password reset emails will log to console instead of dispatching.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};
