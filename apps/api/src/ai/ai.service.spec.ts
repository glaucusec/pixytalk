import { describe, expect, it, vi } from 'vitest';
import type { AIProvider } from './ai.provider.js';
import { AIService } from './ai.service.js';

describe('AIService', () => {
  it('delegates generation to the configured provider', async () => {
    const provider: AIProvider = {
      generate: vi.fn().mockResolvedValue({
        message: 'Hello',
        intent: null,
        requiresHuman: false,
      }),
    };
    const service = new AIService(provider);
    const request = { messages: [{ role: 'user' as const, content: 'Hi' }] };

    await expect(service.generate(request)).resolves.toEqual({
      message: 'Hello',
      intent: null,
      requiresHuman: false,
    });
    expect(provider.generate).toHaveBeenCalledWith(request);
  });
});
