import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { fromNodeHeaders } from 'better-auth/node';
import type { Server, Socket } from 'socket.io';
import { auth } from '../auth/auth.js';
import { PrismaService } from '../database/prisma.service.js';
import type {
  ConversationChangeReason,
  ConversationEventTransport,
} from './conversation-event-transport.js';

@WebSocketGateway({
  namespace: '/conversations',
  cors: {
    origin: process.env.WEB_URL ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class ConversationsGateway
  implements OnGatewayConnection, ConversationEventTransport
{
  private readonly logger = new Logger(ConversationsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly prisma: PrismaService) {}

  async handleConnection(client: Socket) {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(client.handshake.headers),
      });
      const organizationId = session?.session.activeOrganizationId;
      const userId = session?.user.id;

      if (!organizationId || !userId) {
        client.disconnect(true);
        return;
      }

      const membership = await this.prisma.member.findFirst({
        where: { organizationId, userId },
        select: { id: true },
      });

      if (!membership) {
        client.disconnect(true);
        return;
      }

      client.data.userId = userId;
      client.data.organizationId = organizationId;
      await client.join(this.organizationRoom(organizationId));
    } catch (error) {
      const errorName = error instanceof Error ? error.name : 'UnknownError';
      this.logger.warn(`Rejected realtime connection (${errorName})`);
      client.disconnect(true);
    }
  }

  emitConversationChanged(
    organizationId: string,
    conversationId: string,
    reason: ConversationChangeReason,
  ) {
    this.server
      .to(this.organizationRoom(organizationId))
      .emit('conversation.changed', { conversationId, reason });
  }

  private organizationRoom(organizationId: string) {
    return `organization:${organizationId}`;
  }
}
