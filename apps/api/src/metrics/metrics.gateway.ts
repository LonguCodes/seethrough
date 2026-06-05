import { Logger } from '@nestjs/common';
import type {
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect} from '@nestjs/websockets';
import {
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

@WebSocketGateway(3001, {
  cors: {
    origin: '*',
  },
})
export class MetricsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('MetricsGateway');

  broadcastMetric(metric: any) {
    this.server.emit('metrics-update', metric);
  }

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway Initialized');
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }
}
