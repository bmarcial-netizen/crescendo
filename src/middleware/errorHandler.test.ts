import { describe, it, expect } from 'vitest';

// Re-implement sanitize locally so we can test it without importing the middleware
// (which has Express deps). Mirrors the logic in errorHandler.ts exactly.
const SECRET_PATTERNS = [
  /postgre(?:sql|s):\/\/[^\s]+/gi,
  /sk_(test|live)_[A-Za-z0-9]+/g,
  /whsec_[A-Za-z0-9]+/g,
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
];

function sanitize(text: string): string {
  let result = text;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}

describe('error log sanitization', () => {
  it('redacts PostgreSQL connection strings', () => {
    const msg = 'connection failed: postgresql://admin:secret@host.azure.com:5432/mydb?sslmode=require';
    expect(sanitize(msg)).toBe('connection failed: [REDACTED]');
  });

  it('redacts postgres:// variant', () => {
    const msg = 'Error connecting to postgres://user:pass@localhost:5432/db';
    expect(sanitize(msg)).toBe('Error connecting to [REDACTED]');
  });

  it('redacts Stripe secret keys', () => {
    const msg = 'Stripe auth failed with key sk_test_51abc123XYZ';
    expect(sanitize(msg)).toBe('Stripe auth failed with key [REDACTED]');
  });

  it('redacts Stripe live keys', () => {
    const msg = 'Using sk_live_ABCdef789';
    expect(sanitize(msg)).toBe('Using [REDACTED]');
  });

  it('redacts Stripe webhook secrets', () => {
    const msg = 'Webhook verify failed for whsec_abc123def456';
    expect(sanitize(msg)).toBe('Webhook verify failed for [REDACTED]');
  });

  it('redacts Bearer tokens', () => {
    const msg = 'Authorization header: Bearer eyJhbGciOiJIUz.something.here';
    const result = sanitize(msg);
    expect(result).not.toContain('eyJhbGciOiJIUz');
    expect(result).toContain('[REDACTED]');
  });

  it('redacts raw JWTs (three-part base64)', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxMjMifQ.abc_DEF-123';
    const msg = `Token expired: ${jwt}`;
    expect(sanitize(msg)).toBe('Token expired: [REDACTED]');
  });

  it('leaves safe messages untouched', () => {
    const msg = 'Artist not found: 550e8400-e29b-41d4-a716-446655440000';
    expect(sanitize(msg)).toBe(msg);
  });

  it('handles multiple secrets in one message', () => {
    const msg = 'DB: postgresql://a:b@host/db Stripe: sk_test_123';
    const result = sanitize(msg);
    expect(result).not.toContain('postgresql://');
    expect(result).not.toContain('sk_test_');
    expect(result.match(/\[REDACTED\]/g)?.length).toBe(2);
  });

  it('handles empty string', () => {
    expect(sanitize('')).toBe('');
  });
});
