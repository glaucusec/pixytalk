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

export const auth = betterAuth({
  appName: 'Pixytalk',

  baseURL: requiredEnvironment('BETTER_AUTH_URL'),
  basePath: '/api/auth',
  secret: requiredEnvironment('BETTER_AUTH_SECRET'),

  trustedOrigins: [requiredEnvironment('WEB_URL')],

  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },

  advanced: {
    database: { generateId: 'uuid', joins: true },
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
