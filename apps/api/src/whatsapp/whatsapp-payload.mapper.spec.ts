import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { WhatsAppPayloadMapper } from './whatsapp-payload.mapper.js';

describe('WhatsAppPayloadMapper', () => {
  const mapper = new WhatsAppPayloadMapper();

  it('normalizes every inbound message in the payload', () => {
    const result = mapper.map({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'waba-1',
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: 'phone-1' },
                contacts: [{ wa_id: 'customer-1', profile: { name: 'Ada' } }],
                messages: [
                  {
                    id: 'wamid-1',
                    from: 'customer-1',
                    timestamp: '1603059201',
                    type: 'text',
                    text: { body: 'Hello' },
                  },
                  {
                    id: 'wamid-2',
                    from: 'customer-1',
                    timestamp: '1603059202',
                    type: 'image',
                    image: { id: 'media-1' },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      wabaId: 'waba-1',
      phoneNumberId: 'phone-1',
      waId: 'customer-1',
      displayName: 'Ada',
      providerMessageId: 'wamid-1',
      providerTimestamp: new Date('2020-10-18T22:13:21.000Z'),
      type: 'TEXT',
      text: 'Hello',
    });
    expect(result[1]).toMatchObject({
      providerMessageId: 'wamid-2',
      type: 'IMAGE',
      content: { id: 'media-1' },
    });
  });

  it('acknowledges status-only events without producing messages', () => {
    expect(
      mapper.map({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'waba-1',
            changes: [
              {
                field: 'messages',
                value: { statuses: [{ id: 'wamid-1', status: 'read' }] },
              },
            ],
          },
        ],
      }),
    ).toEqual([]);
  });

  it('normalizes outbound delivery statuses', () => {
    expect(
      mapper.mapStatuses({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'waba-1',
            changes: [
              {
                field: 'messages',
                value: {
                  metadata: { phone_number_id: 'phone-1' },
                  statuses: [
                    {
                      id: 'wamid-1',
                      status: 'delivered',
                      timestamp: '1603059201',
                    },
                  ],
                },
              },
            ],
          },
        ],
      }),
    ).toEqual([
      expect.objectContaining({
        wabaId: 'waba-1',
        phoneNumberId: 'phone-1',
        providerMessageId: 'wamid-1',
        status: 'DELIVERED',
        providerTimestamp: new Date('2020-10-18T22:13:21.000Z'),
      }),
    ]);
  });

  it('keeps unsupported message content and labels it unknown', () => {
    const [message] = mapper.map({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'waba-1',
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: 'phone-1' },
                messages: [
                  {
                    id: 'wamid-1',
                    from: 'customer-1',
                    timestamp: '1603059201',
                    type: 'reaction',
                    reaction: { emoji: '👍' },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(message.type).toBe('UNKNOWN');
    expect(message.content).toEqual({ emoji: '👍' });
  });

  it('rejects malformed message events', () => {
    expect(() =>
      mapper.map({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'waba-1',
            changes: [
              {
                field: 'messages',
                value: {
                  metadata: { phone_number_id: 'phone-1' },
                  messages: [{ type: 'text' }],
                },
              },
            ],
          },
        ],
      }),
    ).toThrow(BadRequestException);
  });
});
