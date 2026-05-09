import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { AlertsService } from './alerts.service.js';
import { AlertTrigger } from './alert-trigger.entity.js';
import { Alert } from './alert.entity.js';
import { AlertStatus } from './alert.enums.js';
import { GetAlertsQueryDto } from './dto/get-alerts-query.dto.js';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) { }

  // Triggers
  @Get('strategies')
  getStrategies() {
    return this.alertsService.getStrategies();
  }

  @Post('triggers')
  createTrigger(@Body() data: Partial<AlertTrigger>) {
    return this.alertsService.createTrigger(data);
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
  updateTrigger(@Param('id') id: string, @Body() data: Partial<AlertTrigger>) {
    return this.alertsService.updateTrigger(id, data);
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
