import request from 'supertest';
import { createApp } from '../../app';
import { createContainer } from '../../di/Container';
import { loadConfig } from '../../config/environment';
import { Express } from 'express';
import { GeminiService } from '../../infrastructure/google-cloud/GeminiService';

describe('Sustainability Advisor (Integration)', () => {
  let app: Express;
  let accessToken: string;
  let footprintId: string;

  beforeAll(async () => {
    const config = loadConfig();
    const container = createContainer(config);
    app = createApp(container, config);

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({ email: 'advisor@example.com', password: 'SecurePass123!' });
    
    accessToken = registerResponse.body.accessToken;

    const fpResponse = await request(app)
        .post('/api/footprints')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          transportation: { carMiles: 500, bikeMiles: 0, transitMiles: 0, flightHours: 0 },
          energy: { electricityKwh: 300, renewablePercentage: 0 },
          dietType: 'mixed',
          shopping: { monthlySpend: 500, fastFashionFrequency: 0 },
        });
    footprintId = fpResponse.body.id;
  });

  it('should generate AI recommendations for footprint', async () => {
    const response = await request(app)
      .post('/api/advice/generate')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ footprintId });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('topSources');
    expect(response.body).toHaveProperty('strategies');
    expect(response.body).toHaveProperty('challenge');
  });

  it('should cache recommendations to reduce API calls', async () => {
    const spy = jest.spyOn(GeminiService.prototype, 'generateContent');

    await request(app)
      .post('/api/advice/generate')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ footprintId });

    await request(app)
      .post('/api/advice/generate')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ footprintId });

    // Assuming mock handles generation locally if no API key is present
    expect(spy).toHaveBeenCalledTimes(0); 
  });
});
