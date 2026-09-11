export class AIProviderConfigurationError extends Error {
  constructor(provider: string) {
    super(`${provider} API key is not configured`);
    this.name = 'AIProviderConfigurationError';
  }
}

export class AIProviderResponseError extends Error {
  constructor(provider: string) {
    super(`${provider} returned an invalid structured response`);
    this.name = 'AIProviderResponseError';
  }
}

export class AIProvidersUnavailableError extends Error {
  constructor() {
    super('AI providers failed: Sarvam (primary) and OpenAI (fallback)');
    this.name = 'AIProvidersUnavailableError';
  }
}
