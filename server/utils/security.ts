import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

export function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

export function signValue(value: string, secret: string): string {
  const encoded = Buffer.from(value, 'utf8').toString('base64url');
  const signature = createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifySignedValue(signedValue: string | undefined, secret: string): string | null {
  if (!signedValue) {
    return null;
  }

  const [encoded, signature] = signedValue.split('.');
  if (!encoded || !signature) {
    return null;
  }

  const expected = createHmac('sha256', secret).update(encoded).digest('base64url');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  try {
    return Buffer.from(encoded, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

export function encryptSecret(value: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, encrypted].map((part) => part.toString('base64url')).join('.');
}

export function decryptSecret(value: string, secret: string): string {
  const [ivEncoded, authTagEncoded, encryptedEncoded] = value.split('.');
  if (!ivEncoded || !authTagEncoded || !encryptedEncoded) {
    throw new Error('Invalid encrypted secret format');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    deriveKey(secret),
    Buffer.from(ivEncoded, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(authTagEncoded, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedEncoded, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
