// Configuration des tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.FIREBASE_PRIVATE_KEY = 'test-private-key';
process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
process.env.FIREBASE_CLIENT_ID = 'test-client-id';

// Mock Firebase Admin
jest.mock('../config/firebase', () => ({
  auth: {
    createUser: jest.fn().mockResolvedValue({
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'John Doe',
      emailVerified: false
    }),
    getUserByEmail: jest.fn().mockResolvedValue({
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'John Doe',
      emailVerified: false
    }),
    getUser: jest.fn().mockResolvedValue({
      uid: 'test-uid',
      email: 'test@example.com',
      emailVerified: false
    }),
    updateUser: jest.fn().mockResolvedValue({}),
    deleteUser: jest.fn().mockResolvedValue({}),
    generateEmailVerificationLink: jest.fn().mockResolvedValue('http://test.com')
  },
  db: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        set: jest.fn().mockResolvedValue({}),
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            uid: 'test-uid',
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe'
          })
        }),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({})
      }))
    }))
  }
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));
