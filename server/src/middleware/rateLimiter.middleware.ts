import rateLimit from 'express-rate-limit';

/**
 * Authentication Rate Limiter
 * Protects login and register endpoints against credential stuffing and brute-force attacks.
 * Limit: 15 attempts per 15 minutes per IP (disabled in test suite for automated test throughput).
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
  },
});

/**
 * Password Reset Rate Limiter
 * Protects forgot-password and reset-password against spam and enumeration.
 * Limit: 5 attempts per 15 minutes per IP.
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many password recovery attempts. Please try again after 15 minutes.',
  },
});

/**
 * AI Endpoints Rate Limiter
 * Protects LLM gateways (Gemini, OpenAI, Heuristics) against quota exhaustion and DoS.
 * Limit: 60 requests per minute per IP.
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'AI generation quota rate limit reached. Please wait a moment before initiating another prompt.',
  },
});

/**
 * Public Webhook Rate Limiter
 * Protects public integration webhooks against flooding and replay attacks.
 * Limit: 120 calls per minute per IP.
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Webhook dispatch rate limit exceeded.',
  },
});
