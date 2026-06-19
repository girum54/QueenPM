import { Controller, Get, Query, Param } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats(@Query('projectId') projectId?: string) {
    return this.dashboardService.getStats(projectId);
  }

  @Get('sprint/:sprintId')
  getSprintStats(@Param('sprintId') sprintId: string) {
    return this.dashboardService.getSprintStats(sprintId);
  }

  @Get('user/:userId')
  getUserStats(@Param('userId') userId: string) {
    return this.dashboardService.getUserStats(userId);
  }

  @Get('breakdown')
  getTaskBreakdown(@Query('projectId') projectId?: string) {
    return this.dashboardService.getTaskBreakdown(projectId);
  }

  @Get('trends')
  getTrendAnalysis(@Query('projectId') projectId?: string, @Query('days') days: string = '30') {
    return this.dashboardService.getTrendAnalysis(projectId, parseInt(days, 10));
  }

  @Get('team')
  getTeamOverview(@Query('projectId') projectId?: string) {
    return this.dashboardService.getTeamOverview(projectId);
  }
}
