import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import type { Socket } from 'socket.io';
import { Injectable, Logger, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';

import { ConfigService } from '@nestjs/config';

interface EventPayload {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  occurredAt: Date;
}

interface SubscriptionData {
  channel: string;
}

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
@WebSocketGateway({
  namespace: '/events',
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
    ],
    credentials: true,
  },
})
@Injectable()
export class EventWebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(EventWebsocketGateway.name);
  private subClient: Redis;
  private subscribedChannels = new Set<string>();
  private readonly maxChannelsPerClient = 50;
  private readonly allowedChannelPattern =
    /^(events:|streams:)[a-zA-Z0-9._-]+$/;
  private clientChannels = new Map<string, Set<string>>();

  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject('Redis') private readonly redisClient: Redis,
    private readonly configService: ConfigService,
  ) {
    this.subClient = new Redis(redisClient.options);
  }

  afterInit() {
    this.logger.log('Event WebSocket gateway initialized');
    // Bridge Redis subscriber channels to WebSocket rooms
    this.subClient.on('message', (channel: string, message: string) => {
      try {
        if (message.length > 1024 * 1024) {
          // 1MB limit
          this.logger.warn(`Message too large for channel ${channel}`);
          return;
        }
        const payload: EventPayload = JSON.parse(message) as EventPayload;
        // emit to room named by channel
        this.server.to(channel).emit('event', payload);
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        this.logger.error(`WS emit error: ${error}`);
      }
    });

    this.subClient.on('error', (err: Error) => {
      this.logger.error(`Redis subscription error: ${err.message}`);
    });
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected ${client.id}`);
    this.clientChannels.set(client.id, new Set());

    // Set connection timeout
    setTimeout(() => {
      if (client.connected && this.clientChannels.get(client.id)?.size === 0) {
        client.disconnect(true);
        this.logger.warn(`Disconnected idle client ${client.id}`);
      }
    }, 30000); // 30 seconds
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected ${client.id}`);
    const channels = this.clientChannels.get(client.id);
    if (channels) {
      channels.forEach((channel) => {
        this.cleanupChannel(channel);
      });
      this.clientChannels.delete(client.id);
    }
  }

  private validateChannel(channel: string): boolean {
    if (!channel || typeof channel !== 'string') return false;
    if (channel.length > 100) return false;
    return this.allowedChannelPattern.test(channel);
  }

  private cleanupChannel(channel: string) {
    // Check if any other clients are still subscribed
    let hasSubscribers = false;
    for (const [, channels] of this.clientChannels) {
      if (channels.has(channel)) {
        hasSubscribers = true;
        break;
      }
    }

    if (!hasSubscribers && this.subscribedChannels.has(channel)) {
      void this.subClient
        .unsubscribe(channel)
        .catch((err) =>
          this.logger.error(
            `Failed to unsubscribe from ${channel}: ${String(err)}`,
          ),
        );
      this.subscribedChannels.delete(channel);
    }
  }

  // Client asks to subscribe to an event type
  @SubscribeMessage('subscribe')
  async subscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SubscriptionData,
  ) {
    try {
      const channel = data?.channel;
      if (!this.validateChannel(channel)) {
        return { ok: false, error: 'Invalid channel format' };
      }

      const clientChannels = this.clientChannels.get(client.id) || new Set();
      if (clientChannels.size >= this.maxChannelsPerClient) {
        return { ok: false, error: 'Maximum channels exceeded' };
      }

      if (clientChannels.has(channel)) {
        return { ok: true, message: 'Already subscribed' };
      }

      await client.join(channel);
      clientChannels.add(channel);
      this.clientChannels.set(client.id, clientChannels);

      if (!this.subscribedChannels.has(channel)) {
        await this.subClient.subscribe(channel);
        this.subscribedChannels.add(channel);
      }

      return { ok: true };
    } catch (err) {
      this.logger.error(
        `Subscribe error for client ${client.id}: ${String(err)}`,
      );
      return { ok: false, error: 'Subscription failed' };
    }
  }

  // Unsubscribe
  @SubscribeMessage('unsubscribe')
  unsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SubscriptionData,
  ) {
    try {
      const channel = data?.channel;
      if (!this.validateChannel(channel)) {
        return { ok: false, error: 'Invalid channel format' };
      }

      const clientChannels = this.clientChannels.get(client.id);
      if (clientChannels?.has(channel)) {
        void client.leave(channel);
        clientChannels.delete(channel);
        this.cleanupChannel(channel);
      }

      return { ok: true };
    } catch (err) {
      this.logger.error(
        `Unsubscribe error for client ${client.id}: ${String(err)}`,
      );
      return { ok: false, error: 'Unsubscribe failed' };
    }
  }
}
