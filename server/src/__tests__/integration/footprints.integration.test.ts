import request from 'supertest';
import { createApp } from '../../app';
import { createContainer } from '../../di/Container';
import { loadConfig } from '../../config/environment';
import { Express } from 'express';

describe('Footprint API (Integration)', () => {
  let app: Express;
  let accessToken: string;

  beforeAll(async () => {
    const config = loadConfig();
    const container = createContainer(config);
    app = createApp(container, config);

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({ email: 'footprint@example.com', password: 'SecurePass123!' });
    
    accessToken = registerResponse.body.accessToken;
  });

  describe('POST /api/footprints', () => {
    it('should create footprint and update progress', async () => {
      const response = await request(app)
        .post('/api/footprints')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          transportation: { carMiles: 500, bikeMiles: 0, transitMiles: 100, flightHours: 2 },
          energy: { electricityKwh: 300, renewablePercentage: 25 },
          dietType: 'mixed',
          shopping: { monthlySpend: 500, fastFashionFrequency: 2 },
        });

      expect(response.status).toBe(201);
      expect(response.body.total).toBeGreaterThan(0);
      expect(response.body.breakdown.transportation).toBeGreaterThan(0);
    });

    it('should reject invalid input', async () => {
      const response = await request(app)
        .post('/api/footprints')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          transportation: { carMiles: -100, bikeMiles: 0, transitMiles: 0, flightHours: 0 },
          energy: { electricityKwh: 300, renewablePercentage: 0 },
          dietType: 'mixed',
          shopping: { monthlySpend: 500, fastFashionFrequency: 0 },
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/footprints')
        .send({
          transportation: { carMiles: 500, bikeMiles: 0, transitMiles: 0, flightHours: 0 },
          energy: { electricityKwh: 300, renewablePercentage: 0 },
          dietType: 'mixed',
          shopping: { monthlySpend: 500, fastFashionFrequency: 0 },
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/footprints/history', () => {
    it('should return user footprint history', async () => {
      await request(app)
        .post('/api/footprints')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          transportation: { carMiles: 500, bikeMiles: 0, transitMiles: 0, flightHours: 0 },
          energy: { electricityKwh: 300, renewablePercentage: 0 },
          dietType: 'mixed',
          shopping: { monthlySpend: 500, fastFashionFrequency: 0 },
        });

      const response = await request(app)
        .get('/api/footprints/history')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should respect pagination limits', async () => {
      const response = await request(app)
        .get('/api/footprints/history?limit=5')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.body.length).toBeLessThanOrEqual(5);
    });
  });
});
