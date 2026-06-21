import request from 'supertest';
import { createApp } from '../../app';
import { createContainer } from '../../di/Container';
import { loadConfig } from '../../config/environment';
import { Express } from 'express';

describe('Roadmaps API (Integration)', () => {
  let app: Express;
  let accessToken: string;
  let footprintId: string;

  beforeAll(async () => {
    const config = loadConfig();
    const container = createContainer(config);
    app = createApp(container, config);

    // Register user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({ email: 'roadmap@example.com', password: 'SecurePass123!' });
    
    accessToken = registerResponse.body.accessToken;

    // Create a footprint first
    const fpResponse = await request(app)
      .post('/api/footprints')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        transportation: { carMiles: 500, bikeMiles: 0, transitMiles: 100, flightHours: 2 },
        energy: { electricityKwh: 300, renewablePercentage: 25 },
        dietType: 'mixed',
        shopping: { monthlySpend: 500, fastFashionFrequency: 2 },
      });
      
    footprintId = fpResponse.body.id;
  });

  describe('POST /api/roadmaps/generate', () => {
    it('should generate a roadmap successfully', async () => {
      const response = await request(app)
        .post('/api/roadmaps/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ strategyIds: ['s1', 's2', 's3'] });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.milestones).toHaveLength(3);
      expect(response.body.milestones[0].strategies.length).toBeGreaterThan(0);
    });

    it('should reject when no strategyIds provided', async () => {
      const response = await request(app)
        .post('/api/roadmaps/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ strategyIds: [] });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/roadmaps/generate')
        .send({ strategyIds: ['s1', 's2', 's3'] });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/roadmaps/active', () => {
    it('should retrieve the active roadmap', async () => {
      const response = await request(app)
        .get('/api/roadmaps/active')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body.milestones).toBeDefined();
    });
  });

  describe('PATCH /api/roadmaps/:id/milestones/:milestoneId', () => {
    let roadmapId: string;
    let milestoneId: string;

    beforeAll(async () => {
      const response = await request(app)
        .get('/api/roadmaps/active')
        .set('Authorization', `Bearer ${accessToken}`);
      roadmapId = response.body.id;
      milestoneId = response.body.milestones[0].id;
    });

    it('should update milestone status', async () => {
      const response = await request(app)
        .patch(`/api/roadmaps/${roadmapId}/milestones/${milestoneId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'in_progress' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Milestone updated successfully');
    });

    it('should reject invalid status', async () => {
      const response = await request(app)
        .patch(`/api/roadmaps/${roadmapId}/milestones/${milestoneId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'invalid_status' });

      expect(response.status).toBe(400);
    });
  });
});
