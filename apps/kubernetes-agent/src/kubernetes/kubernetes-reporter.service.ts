import { ConfigToken } from "@longucodes/config";
import { HttpService } from "@nestjs/axios";
import { Injectable, Inject, Logger } from "@nestjs/common";
import type { OnModuleInit } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { interval, firstValueFrom } from "rxjs";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { KubernetesService } from "./kubernetes.service.js";
import type { AppConfig } from "../config/app.config.js";

@Injectable()
export class KubernetesReporterService implements OnModuleInit {
  private readonly logger = new Logger(KubernetesReporterService.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(ConfigToken) private readonly config: AppConfig,
    private readonly jwtService: JwtService,
    private readonly kubernetesService: KubernetesService,
  ) {}

  onModuleInit() {
    this.logger.log("Kubernetes Reporter Service started");
    // Collect and report cluster info based on configured interval
    interval(this.config.reportInterval).subscribe(() => this.collectAndReport());
    // Initial collection
    this.collectAndReport();
  }

  private async collectAndReport() {
    try {
      const clusterInfo = await this.kubernetesService.getClusterInfo();
      await this.reportClusterInfo(clusterInfo);
      this.logger.debug("Cluster info reported successfully");
    } catch (error) {
      this.logger.error("Failed to collect or report cluster info");
      this.logger.debug(error.stack);
    }
  }

  private async reportClusterInfo(data: unknown) {
    const token = this.jwtService.sign({
      role: "kubernetes-agent",
    });

    const url = `${this.config.apiUrl}/api/cluster-info`;

    await firstValueFrom(
      this.httpService.post(url, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    );
  }
}
