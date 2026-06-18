import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { BoardsService } from './boards.service';
import { CreateBoardDto, UpdateBoardDto } from './dto/board.dto';

@Controller('boards')
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  /** GET /boards?projectId=xxx */
  @Get()
  findAll(@Query('projectId') projectId: string) {
    return this.boardsService.findByProject(projectId);
  }

  /** GET /boards/by-sprint/:sprintId */
  @Get('by-sprint/:sprintId')
  findBySprint(@Param('sprintId') sprintId: string) {
    return this.boardsService.findBySprint(sprintId);
  }

  /** GET /boards/:id */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.boardsService.findOne(id);
  }

  /** GET /boards/:id/tasks — all tasks on this board's sprint */
  @Get(':id/tasks')
  findBoardTasks(@Param('id') id: string) {
    // We need sprintId from the board — delegate to service
    return this.boardsService.findOne(id).then((board) =>
      this.boardsService.findBoardTasks(board.sprintId),
    );
  }

  /** POST /boards */
  @Post()
  create(@Body() dto: CreateBoardDto) {
    return this.boardsService.create(dto);
  }

  /** PATCH /boards/:id */
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBoardDto) {
    return this.boardsService.update(id, dto);
  }

  /** DELETE /boards/:id */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.boardsService.remove(id);
  }
}
