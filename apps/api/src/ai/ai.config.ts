const DEFAULT_AI_REQUEST_TIMEOUT_MS = 12_000;

export function getAIRequestTimeoutMs(): number {
  const configuredTimeout = Number(process.env.AI_REQUEST_TIMEOUT_MS);

  if (!Number.isFinite(configuredTimeout) || configuredTimeout <= 0) {
    return DEFAULT_AI_REQUEST_TIMEOUT_MS;
  }

  return configuredTimeout;
}
