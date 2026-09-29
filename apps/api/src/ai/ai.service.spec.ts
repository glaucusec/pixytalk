import { describe, expect, it, vi } from 'vitest';
import type { AIProvider } from './ai.provider.js';
import { AIService } from './ai.service.js';

describe('AIService', () => {
  it('delegates generation to the configured provider', async () => {
    const provider: AIProvider = {
      generate: vi.fn().mockResolvedValue({
        action: 'REPLY',
        message: 'Hello',
        intent: null,
        handoffReason: null,
        toolCall: null,
      }),
    };
    const service = new AIService(provider);
    const request = {
      messages: [{ role: 'user' as const, content: 'Hi' }],
      tools: [],
    };

    await expect(service.generate(request)).resolves.toEqual({
      action: 'REPLY',
      message: 'Hello',
      intent: null,
      handoffReason: null,
      toolCall: null,
    });
    expect(provider.generate).toHaveBeenCalledWith(request);
  });
});
