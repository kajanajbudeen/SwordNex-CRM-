import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('Auth & Security API', () => {
  it('should reject login with invalid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'nonexistent@swordnex.com',
        password: 'WrongPassword123!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should authenticate seeded admin user and return JWT tokens', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@swordnex.com',
        password: 'SwordNex2026!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('admin@swordnex.com');
  });

  it('should block unauthenticated access to protected routes', async () => {
    const res = await request(app).get('/api/v1/leads');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
