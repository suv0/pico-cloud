// Global test setup — runs before each test file
// Add global mocks, env vars for tests here

process.env['DATABASE_URL'] = 'postgresql://pico:pico@localhost:5432/pico_test';
process.env['SESSION_SECRET'] = 'test-secret-32-chars-minimum-ok!';
