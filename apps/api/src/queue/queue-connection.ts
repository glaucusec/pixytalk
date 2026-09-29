export function getRedisConnectionOptions() {
  const configuredUrl = process.env.REDIS_URL;
  if (process.env.NODE_ENV === 'production' && !configuredUrl) {
    throw new Error('REDIS_URL is required in production');
  }

  const url = new URL(configuredUrl ?? 'redis://localhost:6379/0');
  if (!['redis:', 'rediss:'].includes(url.protocol)) {
    throw new Error('REDIS_URL must use redis:// or rediss://');
  }

  const database = Number(url.pathname.slice(1) || '0');
  if (!Number.isInteger(database) || database < 0) {
    throw new Error('REDIS_URL must include a valid Redis database number');
  }

  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    db: database,
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
    maxRetriesPerRequest: null,
  };
}
