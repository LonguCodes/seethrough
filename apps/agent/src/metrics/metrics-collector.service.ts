import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigToken } from '@longucodes/config';
import type { AppConfig } from '../config/app.config.js';
import { JwtService } from '@nestjs/jwt';
import * as si from 'systeminformation';
import { interval } from 'rxjs';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MetricsCollectorService implements OnModuleInit {
  private readonly logger = new Logger(MetricsCollectorService.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(ConfigToken) private readonly config: AppConfig,
    private readonly jwtService: JwtService,
  ) { }

  onModuleInit() {
    this.logger.log('Metrics Collector Service started');
    // Collect and report metrics every 10 seconds
    interval(1000).subscribe(() => this.collectAndReport());
  }

  private async collectAndReport() {
    try {
      const metrics = await this.collectMetrics();
      await this.reportMetrics(metrics);
      this.logger.debug('Metrics reported successfully');
    } catch (error) {
      this.logger.error('Failed to collect or report metrics');
      this.logger.debug(error.stack)
    }
  }

  private async collectMetrics() {
    const [cpu, mem, fs] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
    ]);

    // Simple disk usage: average of all mounted disks
    const diskUsage = fs.reduce((acc, curr) => acc + curr.use, 0) / fs.length;

    return {
      cpuUsage: cpu.currentLoad,
      ramUsage: (mem.active / mem.total) * 100,
      diskUsage: diskUsage,
    };
  }

  private async reportMetrics(metrics: any) {
    const token = this.jwtService.sign({
      machineId: this.config.machineId,
      role: 'agent',
    });

    const url = `${this.config.apiUrl}/metrics`;

    await firstValueFrom(
      this.httpService.post(url, metrics, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    );
  }
}
