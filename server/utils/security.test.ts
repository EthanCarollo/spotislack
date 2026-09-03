import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret, signValue, verifySignedValue } from './security';

const secret = 'test-secret-with-at-least-32-characters';

describe('security helpers', () => {
  it('round trips signed values and rejects tampering', () => {
    const signed = signValue('user-id-123', secret);

    expect(verifySignedValue(signed, secret)).toBe('user-id-123');
    expect(verifySignedValue(`${signed}tampered`, secret)).toBeNull();
    expect(verifySignedValue(signed, `${secret}-different`)).toBeNull();
  });

  it('encrypts secrets so the clear text is not stored', () => {
    const encrypted = encryptSecret('spotify-refresh-token', secret);

    expect(encrypted).not.toContain('spotify-refresh-token');
    expect(decryptSecret(encrypted, secret)).toBe('spotify-refresh-token');
    expect(() => decryptSecret(encrypted, `${secret}-different`)).toThrow();
  });
});
