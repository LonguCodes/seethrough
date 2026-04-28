import { Controller, Post, Body, Get, UseGuards, Request, Param } from '@nestjs/common';
import { MetricsService } from './metrics.service.js';
import { AuthGuard } from '@nestjs/passport';
import { MetricsGateway } from './metrics.gateway.js';
import { IsNumber } from 'class-validator';

class CreateMetricDto {
  @IsNumber()
  cpuUsage: number;
  @IsNumber()
  ramUsage: number;
  @IsNumber()
  diskUsage: number;
}

@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly metricsGateway: MetricsGateway,
  ) { }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async createMetric(@Body() dto: CreateMetricDto, @Request() req) {
    const metric = await this.metricsService.saveMetric(
      req.user.machineId,
      dto.cpuUsage,
      dto.ramUsage,
      dto.diskUsage,
    );

    this.metricsGateway.broadcastMetric(metric);

    return metric;
  }


  @Get('latest')
  async getLatestMetrics() {
    return this.metricsService.getLatestMetrics();
  }

  @Get(':machineId/history')
  async getMachineHistory(@Param('machineId') machineId: string) {
    return this.metricsService.getMachineHistory(machineId);
  }
}

