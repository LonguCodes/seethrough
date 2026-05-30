import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { AlertsService } from './alerts.service.js';
import { AlertStatus } from './alert.enums.js';
import { GetAlertsQueryDto } from './dto/get-alerts-query.dto.js';
import { CreateTriggerDto, UpdateTriggerDto } from './dto/create-trigger.dto.js';
import { CreateIntegrationDto, UpdateIntegrationDto } from './dto/integration.dto.js';
import { IntegrationService } from './integrations/integration.service.js';

@Controller('alerts')
export class AlertsController {
  constructor(
    private readonly alertsService: AlertsService,
    private readonly integrationService: IntegrationService,
  ) { }

  // === Target schemas ===

  @Get('targets')
  getTargetSchemas() {
    return this.alertsService.getTargetSchemas();
  }

  // === Triggers ===

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

  // === Alert instances ===

  @Get()
  findAllAlerts(@Query() query: GetAlertsQueryDto) {
    return this.alertsService.findAllAlerts(query.status, query.target);
  }

  @Post(':id/resolve')
  resolveAlert(@Param('id') id: string) {
    return this.alertsService.resolveAlert(id);
  }

  // === Integrations ===

  @Get('integrations')
  findAllIntegrations() {
    return this.integrationService.findAll();
  }

  @Get('integrations/:id')
  findOneIntegration(@Param('id') id: string) {
    return this.integrationService.findOne(id);
  }

  @Post('integrations')
  createIntegration(@Body() dto: CreateIntegrationDto) {
    return this.integrationService.create(dto);
  }

  @Patch('integrations/:id')
  updateIntegration(@Param('id') id: string, @Body() dto: UpdateIntegrationDto) {
    return this.integrationService.update(id, dto);
  }

  @Delete('integrations/:id')
  deleteIntegration(@Param('id') id: string) {
    return this.integrationService.delete(id);
  }
}