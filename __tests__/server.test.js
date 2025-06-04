process.env.GOOGLE_CLIENT_ID='x';
process.env.GOOGLE_CLIENT_SECRET='x';
process.env.STRIPE_SECRET_KEY='sk_test';
process.env.STRIPE_PRICE_ID='price_test';
process.env.SESSION_SECRET='0123456789abcdef0123456789abcdef';
process.env.STRIPE_WEBHOOK_SECRET='whsec_test';
process.env.ENCRYPTION_KEY='0123456789abcdef0123456789abcdef0123456789abcdef';
const request = require('supertest');
const app = require('../server');

describe('auth requirement', ()=>{
  it('GET /api/stats requires authentication', async ()=>{
    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(401);
  });
});
