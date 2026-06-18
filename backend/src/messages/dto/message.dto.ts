import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  authorId: string;

  @IsString()
  @IsNotEmpty()
  channelId: string;

  @IsString()
  @IsOptional()
  text?: string;

  @IsBoolean()
  @IsOptional()
  pinned?: boolean;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsString()
  @IsOptional()
  taskRef?: string;
}

export class UpdateMessageDto {
  @IsString()
  @IsOptional()
  text?: string;

  @IsBoolean()
  @IsOptional()
  pinned?: boolean;

  @IsString()
  @IsOptional()
  taskRef?: string;
}
