import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('Tenant Isolation & Multi-Tenancy Boundary Enforcement', () => {
  it('should prevent access to arbitrary organization without membership', async () => {
    // 1. Login as standard agent
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'alex.rep@swordnex.com',
        password: 'SwordNex2026!',
      });

    const token = loginRes.body.data.token;
    expect(token).toBeDefined();

    // 2. Attempt to inject a fake organization header that does not belong to user
    const res = await request(app)
      .get('/api/v1/leads')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organization-id', '00000000-0000-0000-0000-000000000000');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
