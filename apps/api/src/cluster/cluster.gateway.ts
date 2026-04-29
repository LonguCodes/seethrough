import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway(3001, {
  cors: {
    origin: '*',
  },
})
export class ClusterGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ClusterGateway.name);
  private agentSocket: Socket | null = null;

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    if (this.agentSocket?.id === client.id) {
      this.agentSocket = null;
      this.logger.log('Kubernetes Agent disconnected');
    }
  }

  @SubscribeMessage('register-agent')
  handleRegisterAgent(@ConnectedSocket() client: Socket) {
    this.agentSocket = client;
    this.logger.log(`Kubernetes Agent registered: ${client.id}`);
    return { status: 'registered' };
  }

  @SubscribeMessage('stream-logs')
  handleStreamLogs(
    @MessageBody() data: { namespace: string; podName: string; containerName?: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!this.agentSocket) {
      client.emit('log-error', { message: 'Kubernetes Agent not connected' });
      return;
    }

    this.logger.log(`Relaying log request for ${data.podName} to agent`);
    // Relay to agent, including browser client ID to know where to send chunks back
    this.agentSocket.emit('request-logs', { ...data, browserId: client.id });
  }

  @SubscribeMessage('stop-logs')
  handleStopLogs(
    @MessageBody() data: { podName: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (this.agentSocket) {
      this.agentSocket.emit('stop-logs', { podName: data.podName, browserId: client.id });
    }
  }

  @SubscribeMessage('log-chunk')
  handleLogChunk(@MessageBody() data: { browserId: string; podName: string; data: string }) {
    // Relay chunk back to the specific browser client
    this.server.to(data.browserId).emit('log-data', {
      podName: data.podName,
      data: data.data,
    });
  }

  @SubscribeMessage('agent-log-error')
  handleAgentError(@MessageBody() data: { browserId: string; message: string }) {
    this.server.to(data.browserId).emit('log-error', { message: data.message });
  }
}
