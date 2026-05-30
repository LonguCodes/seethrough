import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { AlertsService } from './alerts.service.js';
import { Alert } from './alert.entity.js';
import { AlertStatus } from './alert.enums.js';
import { GetAlertsQueryDto } from './dto/get-alerts-query.dto.js';
import { CreateTriggerDto, UpdateTriggerDto } from './dto/create-trigger.dto.js';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) { }

  // Target schemas (replaces old GET /strategies)
  @Get('targets')
  getTargetSchemas() {
    return this.alertsService.getTargetSchemas();
  }

  // Triggers
  @Post('triggers')
  createTrigger(@Body() dto: CreateTriggerDto) {
    return this.alertsService.createTrigger(dto);
  }

  @Get('triggers')
  findAllTriggers() {
    return this.alertsService.findAllTriggers();
  }

  @Get('triggers/:id')
  findOneTrigger(@Param('id') id: string) {
    return this.alertsService.findOneTrigger(id);
  }

  @Patch('triggers/:id')
  updateTrigger(@Param('id') id: string, @Body() dto: UpdateTriggerDto) {
    return this.alertsService.updateTrigger(id, dto);
  }

  @Delete('triggers/:id')
  deleteTrigger(@Param('id') id: string) {
    return this.alertsService.deleteTrigger(id);
  }

  // Alerts
  @Get()
  findAllAlerts(@Query() query: GetAlertsQueryDto) {
    return this.alertsService.findAllAlerts(query.status, query.target);
  }

  @Post(':id/resolve')
  resolveAlert(@Param('id') id: string) {
    return this.alertsService.resolveAlert(id);
  }
}