import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { SprintsService } from './sprints.service';
import {
  CreateSprintDto, UpdateSprintDto,
  CreateDeliverableDto, UpdateDeliverableDto,
} from './dto/sprint.dto';

@Controller('sprints')
export class SprintsController {
  constructor(private readonly sprintsService: SprintsService) {}

  // ─── Sprints ──────────────────────────────────────────────────────────────

  /** GET /sprints?projectId=xxx */
  @Get()
  findAll(@Query('projectId') projectId: string) {
    return this.sprintsService.findAllByProject(projectId);
  }

  /** GET /sprints/active?projectId=xxx */
  @Get('active')
  findActive(@Query('projectId') projectId: string) {
    return this.sprintsService.findActive(projectId);
  }

  /** GET /sprints/:id */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sprintsService.findOne(id);
  }

  /** POST /sprints */
  @Post()
  create(@Body() dto: CreateSprintDto) {
    return this.sprintsService.create(dto);
  }

  /** PATCH /sprints/:id */
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSprintDto) {
    return this.sprintsService.update(id, dto);
  }

  /** POST /sprints/:id/activate — make this the active sprint */
  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.sprintsService.activate(id);
  }

  /** POST /sprints/:id/complete — close the sprint */
  @Post(':id/complete')
  complete(@Param('id') id: string) {
    return this.sprintsService.complete(id);
  }

  /** DELETE /sprints/:id */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.sprintsService.remove(id);
  }

  // ─── Deliverables ─────────────────────────────────────────────────────────

  /** GET /sprints/:id/deliverables */
  @Get(':id/deliverables')
  findDeliverables(@Param('id') sprintId: string) {
    return this.sprintsService.findDeliverables(sprintId);
  }

  /** POST /sprints/:id/deliverables */
  @Post(':id/deliverables')
  addDeliverable(@Param('id') sprintId: string, @Body() dto: CreateDeliverableDto) {
    return this.sprintsService.addDeliverable(sprintId, dto);
  }

  /** PUT /sprints/:id/deliverables — bulk replace all deliverables */
  @Post(':id/deliverables/replace')
  replaceDeliverables(@Param('id') sprintId: string, @Body('texts') texts: string[]) {
    return this.sprintsService.replaceDeliverables(sprintId, texts);
  }

  /** PATCH /sprints/:id/deliverables/:deliverableId */
  @Patch(':id/deliverables/:deliverableId')
  updateDeliverable(
    @Param('id') sprintId: string,
    @Param('deliverableId') deliverableId: string,
    @Body() dto: UpdateDeliverableDto,
  ) {
    return this.sprintsService.updateDeliverable(sprintId, deliverableId, dto);
  }

  /** DELETE /sprints/:id/deliverables/:deliverableId */
  @Delete(':id/deliverables/:deliverableId')
  @HttpCode(HttpStatus.OK)
  removeDeliverable(
    @Param('id') sprintId: string,
    @Param('deliverableId') deliverableId: string,
  ) {
    return this.sprintsService.removeDeliverable(sprintId, deliverableId);
  }
}
