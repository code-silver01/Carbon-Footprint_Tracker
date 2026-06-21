import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  GOOGLE_CLOUD_PROJECT: z.string().default('carbonwise-dev'),
  GEMINI_API_KEY: z.string().optional(),
  JWT_SECRET: z.string().min(32).default('dev-jwt-secret-change-in-production-min32chars!!'),
  JWT_REFRESH_SECRET: z.string().min(32).default('dev-refresh-secret-change-in-prod-min32chars!!'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
});

export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  logLevel: string;
  googleCloudProject: string;
  firestoreEmulatorHost: string | undefined;
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtExpiresIn: number;
  jwtRefreshExpiresIn: number;
  geminiApiKey: string;
  geminiModel: string;
  frontendUrl: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
}

function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

export function loadConfig(): AppConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.warn('Environment variable validation warnings:', parsed.error.format());
  }

  return {
    port: parseInt(getEnvOrDefault('PORT', '3001'), 10),
    nodeEnv: (getEnvOrDefault('NODE_ENV', 'development') as AppConfig['nodeEnv']),
    logLevel: getEnvOrDefault('LOG_LEVEL', 'info'),

    googleCloudProject: getEnvOrDefault('GOOGLE_CLOUD_PROJECT', 'carbonwise-dev'),
    firestoreEmulatorHost: process.env.FIRESTORE_EMULATOR_HOST,

    jwtSecret: getEnvOrDefault('JWT_SECRET', 'dev-jwt-secret-change-in-production-min32chars!!'),
    jwtRefreshSecret: getEnvOrDefault('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-in-prod-min32chars!!'),
    jwtExpiresIn: parseInt(getEnvOrDefault('JWT_EXPIRES_IN', '86400'), 10), // 24 hours
    jwtRefreshExpiresIn: parseInt(getEnvOrDefault('JWT_REFRESH_EXPIRES_IN', '604800'), 10), // 7 days

    geminiApiKey: getEnvOrDefault('GEMINI_API_KEY', ''),
    geminiModel: getEnvOrDefault('GEMINI_MODEL', 'gemini-2.0-flash'),

    frontendUrl: getEnvOrDefault('FRONTEND_URL', 'http://localhost:5173'),

    rateLimitWindowMs: parseInt(getEnvOrDefault('RATE_LIMIT_WINDOW_MS', '900000'), 10), // 15 min
    rateLimitMax: parseInt(getEnvOrDefault('RATE_LIMIT_MAX', '100'), 10),
  };
}
