import { BadGatewayException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WhatsAppCloudProvider } from './whatsapp-cloud.provider.js';

describe('WhatsAppCloudProvider', () => {
  const provider = new WhatsAppCloudProvider();

  beforeEach(() => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'test-access-token';
    process.env.META_GRAPH_API_VERSION = 'v26.0';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends a text message through the configured phone number', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ messages: [{ id: 'wamid-outbound-1' }] }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      provider.sendText({
        phoneNumberId: 'phone-1',
        recipientWaId: 'customer-1',
        text: 'Hello from PixyTalk',
      }),
    ).resolves.toMatchObject({ providerMessageId: 'wamid-outbound-1' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://graph.facebook.com/v26.0/phone-1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-access-token',
        }),
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: 'customer-1',
          type: 'text',
          text: { body: 'Hello from PixyTalk', preview_url: false },
        }),
      }),
    );
  });

  it('returns a safe application error when Meta rejects a message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: 131047, message: 'Re-engagement message required' },
          }),
          { status: 400, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );

    await expect(
      provider.sendText({
        phoneNumberId: 'phone-1',
        recipientWaId: 'customer-1',
        text: 'Hello',
      }),
    ).rejects.toThrow(BadGatewayException);
  });
});
