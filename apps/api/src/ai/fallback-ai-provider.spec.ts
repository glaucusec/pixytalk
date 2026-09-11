import { describe, expect, it, vi } from 'vitest';
import { AIProvidersUnavailableError } from './ai.errors.js';
import { FallbackAIProvider } from './fallback-ai-provider.js';
import { OpenAIProvider } from './openai-provider.js';
import { SarvamProvider } from './sarvam-provider.js';

describe('FallbackAIProvider', () => {
  const input = { messages: [{ role: 'user' as const, content: 'Hello' }] };
  const sarvamResponse = {
    message: 'Namaste',
    intent: 'greeting',
    requiresHuman: false,
  };
  const openAIResponse = {
    message: 'Hello',
    intent: 'greeting',
    requiresHuman: false,
  };

  function createProvider() {
    const sarvam = { generate: vi.fn() };
    const openAI = { generate: vi.fn() };
    const provider = new FallbackAIProvider(
      sarvam as unknown as SarvamProvider,
      openAI as unknown as OpenAIProvider,
    );

    return { provider, sarvam, openAI };
  }

  it('uses Sarvam without calling OpenAI when the primary succeeds', async () => {
    const { provider, sarvam, openAI } = createProvider();
    sarvam.generate.mockResolvedValue(sarvamResponse);

    await expect(provider.generate(input)).resolves.toEqual(sarvamResponse);
    expect(sarvam.generate).toHaveBeenCalledWith(input);
    expect(openAI.generate).not.toHaveBeenCalled();
  });

  it('uses OpenAI when Sarvam fails', async () => {
    const { provider, sarvam, openAI } = createProvider();
    sarvam.generate.mockRejectedValue(new Error('Sarvam unavailable'));
    openAI.generate.mockResolvedValue(openAIResponse);

    await expect(provider.generate(input)).resolves.toEqual(openAIResponse);
    expect(openAI.generate).toHaveBeenCalledWith(input);
  });

  it('returns a sanitized error when both providers fail', async () => {
    const { provider, sarvam, openAI } = createProvider();
    sarvam.generate.mockRejectedValue(
      new Error('secret-sarvam-key was rejected'),
    );
    openAI.generate.mockRejectedValue(
      new Error('secret-openai-key was rejected'),
    );

    const result = provider.generate(input);
    await expect(result).rejects.toBeInstanceOf(AIProvidersUnavailableError);
    await expect(result).rejects.not.toThrow(/secret-(sarvam|openai)-key/);
  });
});
