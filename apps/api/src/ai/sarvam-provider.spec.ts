import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AIProviderConfigurationError,
  AIProviderResponseError,
} from './ai.errors.js';
import { SarvamProvider } from './sarvam-provider.js';

describe('SarvamProvider', () => {
  const previousApiKey = process.env.SARVAM_API_KEY;
  const previousModel = process.env.SARVAM_MODEL;
  const previousBaseUrl = process.env.SARVAM_BASE_URL;

  beforeEach(() => {
    process.env.SARVAM_API_KEY = 'sarvam-test-key';
    process.env.SARVAM_MODEL = 'sarvam-105b-conversations';
    process.env.SARVAM_BASE_URL = 'https://sarvam.test/v1';
  });

  afterEach(() => {
    vi.unstubAllGlobals();

    if (previousApiKey === undefined) delete process.env.SARVAM_API_KEY;
    else process.env.SARVAM_API_KEY = previousApiKey;

    if (previousModel === undefined) delete process.env.SARVAM_MODEL;
    else process.env.SARVAM_MODEL = previousModel;

    if (previousBaseUrl === undefined) delete process.env.SARVAM_BASE_URL;
    else process.env.SARVAM_BASE_URL = previousBaseUrl;
  });

  it('requests and validates a structured Sarvam response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'chatcmpl-1',
          object: 'chat.completion',
          created: 1,
          model: 'sarvam-105b-conversations',
          choices: [
            {
              index: 0,
              finish_reason: 'stop',
              message: {
                role: 'assistant',
                content: JSON.stringify({
                  message: 'Namaste!',
                  intent: 'greeting',
                  requiresHuman: false,
                  toolCall: null,
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const provider = new SarvamProvider();

    await expect(
      provider.generate({
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    ).resolves.toEqual({
      message: 'Namaste!',
      intent: 'greeting',
      requiresHuman: false,
      toolCall: null,
    });

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(request.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      model: 'sarvam-105b-conversations',
      messages: [{ role: 'user', content: 'Hello' }],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'pixytalk_agent_schema', strict: true },
      },
    });
  });

  it('rejects malformed structured output', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: 'chatcmpl-1',
            object: 'chat.completion',
            created: 1,
            model: 'sarvam-105b-conversations',
            choices: [
              {
                index: 0,
                finish_reason: 'stop',
                message: { role: 'assistant', content: 'not-json' },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    await expect(
      new SarvamProvider().generate({
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    ).rejects.toBeInstanceOf(AIProviderResponseError);
  });

  it('reports a missing API key without making a request', async () => {
    delete process.env.SARVAM_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      new SarvamProvider().generate({
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    ).rejects.toBeInstanceOf(AIProviderConfigurationError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
