import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigToken } from '@longucodes/config';
import type { AppConfig } from '../config/app.config.js';
import { JwtService } from '@nestjs/jwt';
import * as si from 'systeminformation';
import { interval } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import * as fileSystem from 'fs/promises'
import fastFolderSize from 'fast-folder-size/sync.js';

@Injectable()
export class MetricsCollectorService implements OnModuleInit {
  private readonly logger = new Logger(MetricsCollectorService.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(ConfigToken) private readonly config: AppConfig,
    private readonly jwtService: JwtService,
  ) { }

  onModuleInit() {
    this.logger.log(`Metrics Collector Service started with interval: ${this.config.reportInterval}ms`);
    // Collect and report metrics
    interval(this.config.reportInterval).subscribe(() => this.collectAndReport());
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


    this.logger.debug(`Found ${fs.length} filesystems`);

    // Simple disk usage: average of all mounted disks
    const diskUsage = fs.length > 0 ? fs.reduce((acc, curr) => acc + curr.use, 0) / fs.length : 0;

    // Detect PVC mounts (standard K8s paths)
    const pvcUsage = await this.collectPvcMetrics();

    return {
      cpuUsage: cpu.currentLoad,
      ramUsage: (mem.active / mem.total) * 100,
      diskUsage: diskUsage,
      pvcUsage: pvcUsage,
    };
  }

  private async collectPvcMetrics() {
    const pvcUsage = [];
    const podsPath = '/var/lib/kubelet/pods';

    try {
      const podUids = await fileSystem.readdir(podsPath);
      this.logger.debug(`Found ${podUids.length} pods`);
      for (const podUid of podUids) {
        const volumesPath = `${podsPath}/${podUid}/volumes`;
        try {
          const plugins = await fileSystem.readdir(volumesPath);
          for (const plugin of plugins) {
            // Skip system/projected volumes
            if (
              plugin.includes('projected') ||
              plugin.includes('secret') ||
              plugin.includes('configmap') ||
              plugin.includes('kube-api-access')
            )
              continue;

            const pluginPath = `${volumesPath}/${plugin}`;
            const volumes = await fileSystem.readdir(pluginPath);
            for (const volumeName of volumes) {
              this.logger.debug(`Found volume: ${volumeName} in ${plugin}`);
              const volumePath = `${pluginPath}/${volumeName}`;
              // For CSI, the actual mount is often in a 'mount' subdirectory
              let targetPath = volumePath;
              try {
                const subDirs = await fileSystem.readdir(volumePath);
                if (subDirs.includes('mount')) {
                  targetPath = `${volumePath}/mount`;
                }
              } catch (e) {
                // Not a directory or not readable, stay with volumePath
              }

              try {
                const bytesUsed = fastFolderSize(targetPath);

                pvcUsage.push({
                  name: volumeName,
                  mount: targetPath,
                  used: bytesUsed,
                });
              } catch (e) {
                // Skip if cannot assess
              }
            }
          }
        } catch (e) {
          // Skip pods without volumes
        }
      }
    } catch (e) {
      this.logger.error('Failed to scan /var/lib/kubelet/pods');
      this.logger.debug(e.message);
    }
    return pvcUsage;
  }

  private async reportMetrics(metrics: any) {
    this.logger.debug(`Reporting metrics: ${JSON.stringify(metrics)}`);
    const token = this.jwtService.sign({
      machineId: this.config.machineId,
      role: 'agent',
    });

    const url = `${this.config.apiUrl}/api/metrics`;

    await firstValueFrom(
      this.httpService.post(url, metrics, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    );
  }
}
