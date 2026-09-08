import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { WhatsAppSignatureService } from './whatsapp-signature.service.js';

describe('WhatsAppSignatureService', () => {
  const originalSecret = process.env.META_APP_SECRET;
  const service = new WhatsAppSignatureService();

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.META_APP_SECRET;
    } else {
      process.env.META_APP_SECRET = originalSecret;
    }
  });

  it('accepts a signature generated from the exact raw body', () => {
    process.env.META_APP_SECRET = 'test-meta-app-secret';
    const rawBody = Buffer.from('{"message":"hello"}');
    const signature =
      'sha256=' +
      createHmac('sha256', process.env.META_APP_SECRET)
        .update(rawBody)
        .digest('hex');

    expect(service.verify(rawBody, signature)).toBe(true);
  });

  it('rejects missing and invalid signatures', () => {
    process.env.META_APP_SECRET = 'test-meta-app-secret';
    const rawBody = Buffer.from('{"message":"hello"}');

    expect(service.verify(rawBody)).toBe(false);
    expect(service.verify(rawBody, 'sha256=invalid')).toBe(false);
  });
});
