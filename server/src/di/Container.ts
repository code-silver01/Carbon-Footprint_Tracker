import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Firestore } from '@google-cloud/firestore';

import { AppConfig } from '../config/environment';

// Infrastructure
import { createFirestoreClient } from '../infrastructure/firestore/FirestoreConfig';
import { FirestoreUserRepository } from '../infrastructure/firestore/FirestoreUserRepository';
import { FirestoreFootprintRepository } from '../infrastructure/firestore/FirestoreFootprintRepository';
import { FirestoreEmissionsRepository } from '../infrastructure/firestore/FirestoreEmissionsRepository';
import { FirestoreAdviceRepository } from '../infrastructure/firestore/FirestoreAdviceRepository';
import { FirestoreRoadmapRepository } from '../infrastructure/firestore/FirestoreRoadmapRepository';
import { FirestoreProgressRepository } from '../infrastructure/firestore/FirestoreProgressRepository';
import { GeminiService, MockGeminiService } from '../infrastructure/google-cloud/GeminiService';
import { CloudLoggingService } from '../infrastructure/google-cloud/CloudLoggingService';

import { InMemoryCacheService } from '../infrastructure/cache/CacheService';

// Domain Services
import { AuthService, IPasswordHasher, ITokenService, AuthTokenPair, IRateLimiter } from '../domain/services/AuthService';
import { EmissionsCalculator } from '../domain/services/EmissionsCalculator';
import { SustainabilityAdvisor, IGeminiService } from '../domain/services/SustainabilityAdvisor';
import { RoadmapService, MilestoneCalculator, StrategyAllocator } from '../domain/services/roadmap';
import { ProgressTracker } from '../domain/services/ProgressTracker';

// Controllers
import { AuthController } from '../presentation/controllers/AuthController';
import { FootprintController } from '../presentation/controllers/FootprintController';
import { AdvisorController } from '../presentation/controllers/AdvisorController';
import { RoadmapController } from '../presentation/controllers/RoadmapController';
import { ProgressController } from '../presentation/controllers/ProgressController';

/**
 * BcryptPasswordHasher — bcrypt implementation of IPasswordHasher.
 */
class BcryptPasswordHasher implements IPasswordHasher {
  async generateSalt(rounds: number): Promise<string> {
    return bcrypt.genSalt(rounds);
  }

  async hash(password: string, salt: string): Promise<string> {
    return bcrypt.hash(password, salt);
  }

  async compare(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}

/**
 * JwtTokenService — JWT implementation of ITokenService.
 */
class JwtTokenService implements ITokenService {
  constructor(
    private readonly secret: string,
    private readonly refreshSecret: string,
    private readonly expiresIn: number,
    private readonly refreshExpiresIn: number,
  ) {}

  generateTokenPair(userId: string): AuthTokenPair {
    const accessToken = jwt.sign({ userId }, this.secret, {
      expiresIn: this.expiresIn,
    });

    const refreshToken = jwt.sign({ userId }, this.refreshSecret, {
      expiresIn: this.refreshExpiresIn,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.expiresIn,
    };
  }

  verifyAccessToken(token: string): { userId: string } {
    return jwt.verify(token, this.secret) as { userId: string };
  }

  verifyRefreshToken(token: string): { userId: string } {
    return jwt.verify(token, this.refreshSecret) as { userId: string };
  }
}

/**
 * InMemoryRateLimiter — simple rate limiter using Map (production would use Redis).
 */
class InMemoryRateLimiter implements IRateLimiter {
  private readonly store: Map<string, { count: number; expiresAt: number }> = new Map();

  async increment(key: string, windowSeconds: number): Promise<number> {
    const now = Date.now();
    const existing = this.store.get(key);

    if (existing && existing.expiresAt > now) {
      existing.count++;
      return existing.count;
    }

    this.store.set(key, {
      count: 1,
      expiresAt: now + windowSeconds * 1000,
    });
    return 1;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

/**
 * DI Container — wires all dependencies together.
 * Single source of truth for the dependency graph.
 */
export interface AppContainer {
  // Infrastructure
  db: Firestore;
  logger: CloudLoggingService;
  cache: InMemoryCacheService;

  // Domain Services
  authService: AuthService;
  emissionsCalculator: EmissionsCalculator;
  sustainabilityAdvisor: SustainabilityAdvisor;
  roadmapService: RoadmapService;
  progressTracker: ProgressTracker;

  // Controllers
  authController: AuthController;
  footprintController: FootprintController;
  advisorController: AdvisorController;
  roadmapController: RoadmapController;
  progressController: ProgressController;
}

/**
 * Creates the application DI container.
 * All dependencies are resolved here, not scattered across the codebase.
 */
export function createContainer(config: AppConfig): AppContainer {
  // --- Infrastructure ---
  const logger = new CloudLoggingService('carbonwise-ai', config.logLevel);
  const db = createFirestoreClient(config);
  const cache = new InMemoryCacheService(3600);

  // Repositories
  const userRepository = new FirestoreUserRepository(db);
  const footprintRepository = new FirestoreFootprintRepository(db);
  const emissionsRepository = new FirestoreEmissionsRepository(db);
  const adviceRepository = new FirestoreAdviceRepository(db);
  const roadmapRepository = new FirestoreRoadmapRepository(db);
  const progressRepository = new FirestoreProgressRepository(db);

  // Auth infrastructure
  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = new JwtTokenService(
    config.jwtSecret,
    config.jwtRefreshSecret,
    config.jwtExpiresIn,
    config.jwtRefreshExpiresIn,
  );
  const rateLimiter = new InMemoryRateLimiter();

  // Gemini — use mock if no API key
  const geminiService: IGeminiService = config.geminiApiKey
    ? new GeminiService(config.geminiApiKey, config.geminiModel, logger)
    : new MockGeminiService(logger);

  if (!config.geminiApiKey) {
    logger.warn('No Gemini API key configured — using mock AI service');
  }

  // --- Domain Services ---
  const authService = new AuthService(
    userRepository,
    passwordHasher,
    tokenService,
    rateLimiter,
    logger,
  );

  const emissionsCalculator = new EmissionsCalculator(emissionsRepository);

  const sustainabilityAdvisor = new SustainabilityAdvisor(
    geminiService,
    adviceRepository,
    cache,
    logger,
  );

  const milestoneCalculator = new MilestoneCalculator();
  const strategyAllocator = new StrategyAllocator();
  const roadmapService = new RoadmapService(
    roadmapRepository,
    milestoneCalculator,
    strategyAllocator,
    logger,
  );

  const progressTracker = new ProgressTracker(
    footprintRepository,
    progressRepository,
    logger,
  );

  // --- Controllers ---
  const authController = new AuthController(authService);
  const footprintController = new FootprintController(
    emissionsCalculator,
    footprintRepository,
    progressTracker,
  );
  const advisorController = new AdvisorController(sustainabilityAdvisor, footprintRepository);
  const roadmapController = new RoadmapController(roadmapService, footprintRepository);
  const progressController = new ProgressController(progressTracker);

  return {
    db,
    logger,
    cache,
    authService,
    emissionsCalculator,
    sustainabilityAdvisor,
    roadmapService,
    progressTracker,
    authController,
    footprintController,
    advisorController,
    roadmapController,
    progressController,
  };
}
