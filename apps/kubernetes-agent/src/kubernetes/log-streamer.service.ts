import { PassThrough } from 'stream';

import * as k8s from '@kubernetes/client-node';
import { ConfigToken } from '@longucodes/config';
import type { OnModuleInit} from '@nestjs/common';
import { Injectable, Inject, Logger } from '@nestjs/common';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

import type { AppConfig } from '../config/app.config.js';



@Injectable()
export class LogStreamerService implements OnModuleInit {
  private readonly logger = new Logger(LogStreamerService.name);
  private socket: Socket;
  private readonly kc: k8s.KubeConfig;
  private readonly k8sLog: k8s.Log;
  private activeStreams: Map<string, { abort: () => void }> = new Map();

  constructor(@Inject(ConfigToken) private readonly config: AppConfig) {
    this.kc = new k8s.KubeConfig();
    try {
      this.kc.loadFromDefault();
    } catch (e) {
      try {
        this.kc.loadFromCluster();
      } catch (e2) {
        this.logger.error('Failed to load kubernetes config');
      }
    }
    this.k8sLog = new k8s.Log(this.kc);
  }

  onModuleInit() {
    // Connect to the API websocket gateway (same as metrics/cluster-info but as client)
    // We assume the API_URL environment variable is provided
    const apiUrl = this.config.apiUrl.replace('http', 'ws');
    // Using port 3001 as defined in API's WebSocketGateway
    const socketUrl = apiUrl.includes(':3000') 
      ? apiUrl.replace(':3000', ':3001')
      : `${apiUrl}:3001`;

    this.logger.log(`Connecting to API WebSocket at ${socketUrl}`);
    this.socket = io(socketUrl);

    this.socket.on('connect', () => {
      this.logger.log('Connected to API WebSocket');
      this.socket.emit('register-agent');
    });

    this.socket.on('request-logs', (data) => this.handleLogRequest(data));
    this.socket.on('stop-logs', (data) => this.handleStopLogs(data));
  }

  private async handleLogRequest(data: { namespace: string; podName: string; containerName?: string; browserId: string }) {
    const { namespace, podName, containerName, browserId } = data;
    const streamKey = `${browserId}-${podName}`;
    
    this.logger.log(`Starting log stream for ${podName} (browser: ${browserId})`);

    const logStream = new PassThrough();
    logStream.on('data', (chunk) => {
      this.socket.emit('log-chunk', {
        browserId,
        podName,
        data: chunk.toString(),
      });
    });

    try {
      const request = await this.k8sLog.log(
        namespace,
        podName,
        containerName || '',
        logStream,
        { follow: true, tailLines: 100, pretty: false }
      );

      this.activeStreams.set(streamKey, { abort: () => request.abort() });

    } catch (err) {
      this.logger.error(`Failed to stream logs: ${err.message}`);
      this.socket.emit('agent-log-error', { browserId, message: `Failed to stream logs: ${err.message}` });
    }
  }

  private handleStopLogs(data: { podName: string; browserId: string }) {
    const streamKey = `${data.browserId}-${data.podName}`;
    const stream = this.activeStreams.get(streamKey);
    if (stream) {
      this.logger.log(`Stopping log stream for ${data.podName}`);
      stream.abort();
      this.activeStreams.delete(streamKey);
    }
  }
}
