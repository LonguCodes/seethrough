import { Controller, Post, Body, Get, Param } from '@nestjs/common';

import type { ClusterService } from './cluster.service.js';

@Controller('cluster-info')
export class ClusterController {
  constructor(
    private readonly clusterService: ClusterService,
  ) { }

  @Post()
  async updateClusterInfo(@Body() data: any) {
    return this.clusterService.saveClusterInfo(data);
  }

  @Get()
  async getClusterInfo() {
    return this.clusterService.getClusterInfo();
  }

  @Get('pods/:namespace/:name')
  async getPodInfo(@Param('namespace') namespace: string, @Param('name') name: string) {
    return this.clusterService.getPodInfo(namespace, name);
  }
}
