import { createAccessControl } from 'better-auth/plugins/access';

const statement = {
  organization: ['update', 'delete'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
  conversation: ['read', 'reply', 'takeover'],
  knowledge: ['read', 'manage'],
} as const;

export const organizationAccessControl = createAccessControl(statement);

export const ownerRole = organizationAccessControl.newRole({
  organization: ['update', 'delete'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
  conversation: ['read', 'reply', 'takeover'],
  knowledge: ['read', 'manage'],
});

export const adminRole = organizationAccessControl.newRole({
  organization: ['update'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
  conversation: ['read', 'reply', 'takeover'],
  knowledge: ['read', 'manage'],
});

export const agentRole = organizationAccessControl.newRole({
  conversation: ['read', 'reply', 'takeover'],
  knowledge: ['read'],
});
