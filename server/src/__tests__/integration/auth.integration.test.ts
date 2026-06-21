import request from 'supertest';
import { createApp } from '../../app';
import { createContainer, AppContainer } from '../../di/Container';
import { loadConfig } from '../../config/environment';
import { Express } from 'express';

describe('Authentication Flow (Integration)', () => {
  let app: Express;
  let container: AppContainer;

  beforeAll(async () => {
    const config = loadConfig();
    container = createContainer(config);
    app = createApp(container, config);
  });

  describe('POST /api/auth/register', () => {
    it('should register user and return token pair', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePass123!',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.expiresIn).toBe(86400);
    });

    it('should reject duplicate email registration', async () => {
      const email = 'duplicate@example.com';
      
      await request(app)
        .post('/api/auth/register')
        .send({ email, password: 'SecurePass123!' });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ email, password: 'SecurePass456!' });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
    });

    it('should enforce rate limiting on failed login attempts', async () => {
      const email = 'ratelimit@example.com';
      await request(app)
        .post('/api/auth/register')
        .send({ email, password: 'SecurePass123!' });

      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ email, password: 'WrongPassword' });
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'WrongPassword' });

      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login and return tokens', async () => {
      const email = 'login@example.com';
      const password = 'SecurePass123!';

      await request(app)
        .post('/api/auth/register')
        .send({ email, password });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email, password });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
    });

    it('should reject invalid credentials without user enumeration', async () => {
      const wrongEmailResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password' });

      const wrongPasswordResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@example.com', password: 'WrongPassword' });

      expect(wrongEmailResponse.status).toBe(401);
      expect(wrongPasswordResponse.status).toBe(401);
      expect(wrongEmailResponse.body.error).toBe(wrongPasswordResponse.body.error);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token using refresh token', async () => {
      const email = 'refresh@example.com';
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({ email, password: 'SecurePass123!' });

      const refreshToken = registerResponse.body.refreshToken;

      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.accessToken).toBeDefined();
    });
  });
});
