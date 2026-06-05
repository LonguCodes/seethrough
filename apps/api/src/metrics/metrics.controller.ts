import { Controller, Post, Body, Get, Param, Request } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsArray, ValidateNested, IsString } from 'class-validator';
import type { Request as ExpressRequest } from 'express';

import { MetricsGateway } from './metrics.gateway.js';
import { MetricsService } from './metrics.service.js';
import type { AuthenticatedMachine } from '../auth/guards/jwt-auth.guard.js';

type AuthenticatedMachineRequest = ExpressRequest & { user: AuthenticatedMachine };

class PvcUsageDto {
  @IsString()
  name: string;

  @IsString()
  mount: string;

  @IsNumber()
  used: number;
}

class CreateMetricDto {
  @IsNumber()
  cpuUsage: number;

  @IsNumber()
  ramUsage: number;

  @IsNumber()
  diskUsage: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PvcUsageDto)
  pvcUsage?: PvcUsageDto[];
}

@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly metricsGateway: MetricsGateway,
  ) { }

  @Post()
  async createMetric(@Body() dto: CreateMetricDto, @Request() req: AuthenticatedMachineRequest) {
    if (dto.pvcUsage && dto.pvcUsage.length > 0) {
      console.log(`Received ${dto.pvcUsage.length} PVC usage entries from ${req.user.machineId}`);
    }

    const metric = await this.metricsService.saveMetric(
      req.user.machineId,
      dto.cpuUsage,
      dto.ramUsage,
      dto.diskUsage,
      dto.pvcUsage || [],
    );

    console.log(`Saved metric for ${req.user.machineId}, pvcUsage count: ${metric.pvcUsage?.length || 0}`);

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
