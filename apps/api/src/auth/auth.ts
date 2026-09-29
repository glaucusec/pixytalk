import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '../database/prisma.instance.js';
import { organization } from 'better-auth/plugins';
import {
  adminRole,
  ownerRole,
  agentRole,
  organizationAccessControl,
} from './permissions.js';

function requiredEnvironment(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function getCookieSameSite(): 'lax' | 'strict' | 'none' {
  const value = process.env.AUTH_COOKIE_SAME_SITE ?? 'lax';
  if (value === 'lax' || value === 'strict' || value === 'none') return value;
  throw new Error('AUTH_COOKIE_SAME_SITE must be lax, strict, or none');
}

const betterAuthUrl = requiredEnvironment('BETTER_AUTH_URL');
const webUrl = requiredEnvironment('WEB_URL');
if (
  process.env.NODE_ENV === 'production' &&
  (!betterAuthUrl.startsWith('https://') || !webUrl.startsWith('https://'))
) {
  throw new Error('BETTER_AUTH_URL and WEB_URL must use HTTPS in production');
}

export const auth = betterAuth({
  appName: 'Pixytalk',

  baseURL: betterAuthUrl,
  basePath: '/api/auth',
  secret: requiredEnvironment('BETTER_AUTH_SECRET'),

  trustedOrigins: [webUrl],

  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },

  advanced: {
    database: { generateId: 'uuid', joins: true },
    useSecureCookies: process.env.NODE_ENV === 'production',
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: getCookieSameSite(),
      secure: process.env.NODE_ENV === 'production',
    },
  },

  plugins: [
    organization({
      ac: organizationAccessControl,
      roles: { owner: ownerRole, admin: adminRole, agent: agentRole },
      creatorRole: 'owner',
      allowUserToCreateOrganization: true,
    }),
  ],
});
