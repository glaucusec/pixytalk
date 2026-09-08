import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

@Injectable()
export class WhatsAppSignatureService {
  verify(rawBody: Buffer, signature?: string): boolean {
    if (!signature || !process.env.META_APP_SECRET) {
      return false;
    }

    const expected =
      'sha256=' +
      createHmac('sha256', process.env.META_APP_SECRET)
        .update(rawBody)
        .digest('hex');

    const receivedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    return (
      receivedBuffer.length === expectedBuffer.length &&
      timingSafeEqual(receivedBuffer, expectedBuffer)
    );
  }
}
