/**
 * Application configuration — all settings derived from environment variables.
 * Centralized, validated on startup.
 */
export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  logLevel: string;

  // Google Cloud
  googleCloudProject: string;
  firestoreEmulatorHost: string | undefined;

  // Auth
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtExpiresIn: number; // seconds
  jwtRefreshExpiresIn: number; // seconds

  // Gemini
  geminiApiKey: string;
  geminiModel: string;

  // CORS
  frontendUrl: string;

  // Rate Limiting
  rateLimitWindowMs: number;
  rateLimitMax: number;
}

function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

/**
 * Load and validate configuration from environment variables.
 */
export function loadConfig(): AppConfig {
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
