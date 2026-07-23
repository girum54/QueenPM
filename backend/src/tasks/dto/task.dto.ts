import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, IsDateString } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  assigneeId?: string;

  @IsEnum(['low', 'medium', 'high', 'urgent'])
  @IsOptional()
  priority?: 'low' | 'medium' | 'high' | 'urgent';

  @IsEnum(['new', 'active', 'staging', 'deployed'])
  @IsOptional()
  column?: 'new' | 'active' | 'staging' | 'deployed';

  @IsEnum(['ui', 'ai', 'slash'])
  @IsOptional()
  createdBy?: 'ui' | 'ai' | 'slash';

  @IsString()
  @IsOptional()
  originMessageId?: string;

  @IsString()
  @IsOptional()
  originChannelId?: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  sprintId?: string;

  @IsString()
  @IsOptional()
  deliverableId?: string;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsDateString()
  @IsOptional()
  deadline?: string;

  @IsInt()
  @IsOptional()
  estimateDays?: number;
}

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  assigneeId?: string;

  @IsEnum(['low', 'medium', 'high', 'urgent'])
  @IsOptional()
  priority?: 'low' | 'medium' | 'high' | 'urgent';

  @IsEnum(['new', 'active', 'staging', 'deployed'])
  @IsOptional()
  column?: 'new' | 'active' | 'staging' | 'deployed';

  @IsEnum(['ui', 'ai', 'slash'])
  @IsOptional()
  createdBy?: 'ui' | 'ai' | 'slash';

  @IsString()
  @IsOptional()
  sprintId?: string;

  @IsString()
  @IsOptional()
  deliverableId?: string;

  @IsDateString()
  @IsOptional()
  completedAt?: string;

  @IsDateString()
  @IsOptional()
  deadline?: string;

  @IsInt()
  @IsOptional()
  estimateDays?: number;
}
