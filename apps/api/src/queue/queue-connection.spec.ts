import { afterEach, describe, expect, it } from 'vitest';
import { getRedisConnectionOptions } from './queue-connection.js';

describe('getRedisConnectionOptions', () => {
  const original = {
    nodeEnv: process.env.NODE_ENV,
    redisUrl: process.env.REDIS_URL,
  };

  afterEach(() => {
    if (original.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = original.nodeEnv;
    if (original.redisUrl === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = original.redisUrl;
  });

  it('uses local Redis defaults in development', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.REDIS_URL;

    expect(getRedisConnectionOptions()).toMatchObject({
      host: 'localhost',
      port: 6379,
      db: 0,
      maxRetriesPerRequest: null,
    });
  });

  it('supports authenticated Redis TLS URLs', () => {
    process.env.NODE_ENV = 'production';
    process.env.REDIS_URL = 'rediss://queue-user:secret@redis.example:6380/2';

    expect(getRedisConnectionOptions()).toMatchObject({
      host: 'redis.example',
      port: 6380,
      username: 'queue-user',
      password: 'secret',
      db: 2,
      tls: {},
      maxRetriesPerRequest: null,
    });
  });

  it('requires an explicit Redis URL in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.REDIS_URL;

    expect(() => getRedisConnectionOptions()).toThrow('REDIS_URL is required');
  });
});
