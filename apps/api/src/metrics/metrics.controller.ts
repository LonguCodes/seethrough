import { Controller, Post, Body, Get, UseGuards, Request, Param } from '@nestjs/common';
import { MetricsService } from './metrics.service.js';
import { AuthGuard } from '@nestjs/passport';
import { MetricsGateway } from './metrics.gateway.js';
import { IsNumber, IsOptional, IsArray, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';

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

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async createMetric(@Body() dto: CreateMetricDto, @Request() req) {
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

