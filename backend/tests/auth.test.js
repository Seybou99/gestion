const request = require('supertest');
const app = require('../server');

describe('Auth Routes', () => {
  describe('POST /api/auth/register', () => {
    test('should register user successfully with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.token).toBeDefined();
    });

    test('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email invalide');
    });

    test('should reject registration with short password', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('6 caractères');
    });

    test('should reject registration with missing required fields', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123'
        // Missing firstName and lastName
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    test('should reject login with invalid email', async () => {
      const loginData = {
        email: 'invalid-email',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email invalide');
    });

    test('should reject login with missing password', async () => {
      const loginData = {
        email: 'test@example.com'
        // Missing password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      // Rate limiting might return 429, so we check for either 400 or 429
      expect([400, 429]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/verify-token', () => {
    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/verify-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Token d\'accès requis');
    });

    test('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify-token')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Token invalide');
    });
  });
});

describe('Health Check', () => {
  test('should return health status', async () => {
    const response = await request(app)
      .get('/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.status).toBe('OK');
  });
});
