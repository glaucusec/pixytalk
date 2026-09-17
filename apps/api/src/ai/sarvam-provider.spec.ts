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
    process.env.SARVAM_BASE_URL = 'https://sarvam.test';
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
      max_tokens: 1024,
      reasoning_effort: 'low',
      temperature: 0.2,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'pixytalk_agent_schema', strict: true },
      },
    });
  });

  it('retries malformed structured output once', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
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
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'chatcmpl-2',
            object: 'chat.completion',
            created: 2,
            model: 'sarvam-105b-conversations',
            choices: [
              {
                index: 0,
                finish_reason: 'stop',
                message: {
                  role: 'assistant',
                  content: JSON.stringify({
                    message: 'Hello!',
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

    await expect(
      new SarvamProvider().generate({
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    ).resolves.toMatchObject({ message: 'Hello!' });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [, retryRequest] = fetchMock.mock.calls[1] as [string, RequestInit];
    const retryBody = JSON.parse(String(retryRequest.body)) as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(retryBody.messages.at(-1)).toMatchObject({
      role: 'system',
    });
  });

  it('accepts a handoff response without a message or tool call', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'chatcmpl-handoff',
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
                  message: null,
                  intent: 'connect_to_agent',
                  requiresHuman: true,
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

    await expect(
      new SarvamProvider().generate({
        messages: [{ role: 'user', content: 'Connect me to an agent' }],
      }),
    ).resolves.toEqual({
      message: null,
      intent: 'connect_to_agent',
      requiresHuman: true,
      toolCall: null,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects structured output that remains malformed after retry', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
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
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      new SarvamProvider().generate({
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    ).rejects.toBeInstanceOf(AIProviderResponseError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
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
