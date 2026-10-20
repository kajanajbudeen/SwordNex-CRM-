import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/swordnex_crm?schema=public',
  jwt: {
    secret: process.env.JWT_SECRET || 'swordnex_jwt_secret_key_minimum_32_characters_for_prod',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'swordnex_jwt_refresh_secret_key_32_chars',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '1000', 10),
  },
  ai: {
    provider: process.env.AI_PROVIDER || 'mock',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    openAiApiKey: process.env.OPENAI_API_KEY || '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    defaultModel: process.env.DEFAULT_AI_MODEL || 'gemini-1.5-pro',
  },
};
