import type { Server, Socket } from 'socket.io';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '../auth/auth.js';
import { PrismaService } from '../database/prisma.service.js';
import { ConversationsGateway } from './conversations.gateway.js';

vi.mock('../auth/auth.js', () => ({
  auth: { api: { getSession: vi.fn() } },
}));

describe('ConversationsGateway', () => {
  const prisma = { member: { findFirst: vi.fn() } };
  const gateway = new ConversationsGateway(
    prisma as unknown as PrismaService,
  );
  const getSession = vi.mocked(auth.api.getSession);

  function socket() {
    return {
      handshake: { headers: {} },
      data: {},
      join: vi.fn(),
      disconnect: vi.fn(),
    } as unknown as Socket;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('joins only the active organization verified by membership', async () => {
    getSession.mockResolvedValue({
      session: { activeOrganizationId: 'organization-1' },
      user: { id: 'user-1' },
    } as never);
    prisma.member.findFirst.mockResolvedValue({ id: 'member-1' });
    const client = socket();

    await gateway.handleConnection(client);

    expect(prisma.member.findFirst).toHaveBeenCalledWith({
      where: { organizationId: 'organization-1', userId: 'user-1' },
      select: { id: true },
    });
    expect(client.join).toHaveBeenCalledWith('organization:organization-1');
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('disconnects an unauthenticated socket', async () => {
    getSession.mockResolvedValue(null);
    const client = socket();

    await gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
  });

  it('disconnects a user without membership in the active organization', async () => {
    getSession.mockResolvedValue({
      session: { activeOrganizationId: 'organization-1' },
      user: { id: 'user-1' },
    } as never);
    prisma.member.findFirst.mockResolvedValue(null);
    const client = socket();

    await gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
  });

  it('emits changes only to the tenant organization room', () => {
    const emit = vi.fn();
    const to = vi.fn().mockReturnValue({ emit });
    gateway.server = { to } as unknown as Server;

    gateway.emitConversationChanged(
      'organization-1',
      'conversation-1',
      'mode-changed',
    );

    expect(to).toHaveBeenCalledWith('organization:organization-1');
    expect(emit).toHaveBeenCalledWith('conversation.changed', {
      conversationId: 'conversation-1',
      reason: 'mode-changed',
    });
  });
});
